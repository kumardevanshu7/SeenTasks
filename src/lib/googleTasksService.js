import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";
import { DEFAULT_WORKSPACE_ID } from "./quickTaskService";
import { todayKey, toKey } from "./date";

const GOOGLE_TASKS_API_BASE = "https://tasks.googleapis.com/tasks/v1";
const GOOGLE_TASKS_SCOPE = "https://www.googleapis.com/auth/tasks";

/**
 * Initiates Google OAuth popup to request Google Tasks API scope.
 * Returns { accessToken, expiresIn }
 */
export async function authorizeGoogleTasks() {
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_TASKS_SCOPE);
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error("Could not retrieve Google OAuth access token.");
    }

    return {
      accessToken,
      expiresIn: 3600, // 1 hour token standard
      user: result.user,
    };
  } catch (err) {
    console.error("Google Tasks authorization failed:", err);
    throw err;
  }
}

async function parseGoogleApiError(res, defaultMsg = "Google Tasks API error") {
  if (res.status === 401) return new Error("TOKEN_EXPIRED");
  try {
    const data = await res.json();
    if (data?.error?.message) {
      const msg = data.error.message;
      if (msg.includes("Tasks API has not been used") || msg.includes("is disabled") || msg.includes("Enable it by visiting")) {
        return new Error("Google Tasks API is not enabled in your Firebase / Google Cloud project. Click the link to enable it in Google Cloud Console.");
      }
      return new Error(msg);
    }
  } catch {
    // ignore json parse error
  }
  return new Error(`${defaultMsg} (HTTP ${res.status}${res.statusText ? `: ${res.statusText}` : ""})`);
}

/**
 * Fetch all Google Task Lists for the user.
 */
export async function fetchGoogleTaskLists(token) {
  const res = await fetch(`${GOOGLE_TASKS_API_BASE}/users/@me/lists`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, "Failed to fetch Google task lists");
  }

  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Create a new Google Task List (e.g. for a SeenTasks workspace).
 */
export async function createGoogleTaskList(token, title) {
  const res = await fetch(`${GOOGLE_TASKS_API_BASE}/users/@me/lists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, `Failed to create Google task list '${title}'`);
  }

  return res.json();
}

/**
 * Fetch all tasks from a specific Google Task List.
 */
export async function fetchGoogleTasks(token, listId) {
  const res = await fetch(
    `${GOOGLE_TASKS_API_BASE}/lists/${listId}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw await parseGoogleApiError(res, "Failed to fetch Google tasks");
  }

  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Create a new task in a Google Task List.
 */
export async function createGoogleTask(token, listId, taskPayload) {
  const res = await fetch(`${GOOGLE_TASKS_API_BASE}/lists/${listId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskPayload),
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, "Failed to create Google task");
  }

  return res.json();
}

/**
 * Update (patch) an existing Google Task.
 */
export async function patchGoogleTask(token, listId, taskId, patchPayload) {
  const res = await fetch(`${GOOGLE_TASKS_API_BASE}/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchPayload),
  });

  if (!res.ok) {
    throw await parseGoogleApiError(res, "Failed to update Google task");
  }

  return res.json();
}

/**
 * Format a SeenTasks QuickTask into Google Tasks API format.
 */
export function formatQuickTaskForGoogle(task, quickLabels = [], workspaceName = "General") {
  const labelIds = Array.isArray(task.labelIds)
    ? task.labelIds
    : task.labelId
      ? [task.labelId]
      : [];
  const labels = labelIds.map((id) => (quickLabels || []).find((l) => l.id === id)).filter(Boolean);
  const labelTag = labels.length > 0 ? ` #${labels[0].name.replace(/\s+/g, "")}` : "";

  // Title with optional hashtag
  let title = (task.title || "").trim();
  if (labelTag && !title.includes("#")) {
    title = `${title}${labelTag}`;
  }

  // Format Notes Description (metadata & subtasks)
  const notesLines = [];
  if (labels.length > 0) {
    notesLines.push(`🏷️ Labels: ${labels.map((l) => l.name).join(", ")}`);
  }
  if (workspaceName) {
    notesLines.push(`🏢 Workspace: ${workspaceName}`);
  }
  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    notesLines.push("\n📝 Micro-Steps:");
    task.subtasks.forEach((st) => {
      notesLines.push(`${st.done ? "[x]" : "[ ]"} ${st.text}`);
    });
  }
  notesLines.push("\n✨ Synced via SeenTasks");

  // Format Due Date RFC 3339
  let due = undefined;
  const targetDate = task.dueDate || task.dateKey;
  if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    due = `${targetDate}T00:00:00.000Z`;
  }

  return {
    title,
    notes: notesLines.join("\n"),
    due,
    status: task.done ? "completed" : "needsAction",
  };
}

/**
 * Parse a Google Task into SeenTasks QuickTask format.
 */
export function parseGoogleTaskToQuickTask(gtTask, workspaceId, quickLabels = []) {
  let title = gtTask.title || "Untitled Google Task";
  let extractedLabelId = null;

  // 1. Extract hashtag from title if present (e.g. "Buy milk #Personal")
  const hashMatch = title.match(/#([a-zA-Z0-9_-]+)/);
  if (hashMatch) {
    const tagName = hashMatch[1].toLowerCase();
    title = title.replace(/#[a-zA-Z0-9_-]+/g, "").trim();
    const foundLabel = (quickLabels || []).find(
      (l) => l.name.toLowerCase().replace(/\s+/g, "") === tagName || l.name.toLowerCase() === tagName
    );
    if (foundLabel) {
      extractedLabelId = foundLabel.id;
    }
  }

  // 2. Parse Due Date
  let dateKey = todayKey();
  let dueDate = null;
  if (gtTask.due) {
    const dStr = gtTask.due.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      dueDate = dStr;
      dateKey = dStr <= todayKey() ? dStr : todayKey();
    }
  }

  // 3. Parse Subtasks from notes if present
  const subtasks = [];
  if (gtTask.notes) {
    const lines = gtTask.notes.split("\n");
    lines.forEach((line, idx) => {
      const match = line.match(/^\[([ xX])\]\s*(.+)$/);
      if (match) {
        subtasks.push({
          id: `gt_sub_${gtTask.id}_${idx}`,
          text: match[2].trim(),
          done: match[1].toLowerCase() === "x",
          createdAt: new Date().toISOString(),
          completedAt: match[1].toLowerCase() === "x" ? new Date().toISOString() : null,
        });
      }
    });
  }

  const isDone = gtTask.status === "completed";

  return {
    id: `gt_${gtTask.id}`,
    googleTaskId: gtTask.id,
    googleListId: gtTask.listId,
    title,
    done: isDone,
    dateKey,
    dueDate,
    workspaceId: workspaceId || DEFAULT_WORKSPACE_ID,
    labelIds: extractedLabelId ? [extractedLabelId] : [],
    labelId: extractedLabelId,
    subtasks,
    createdAt: gtTask.updated || new Date().toISOString(),
    completedAt: isDone ? (gtTask.completed || new Date().toISOString()) : null,
  };
}

/**
 * Orchestrate 2-Way Live Sync between SeenTasks and Google Tasks.
 */
export async function twoWaySyncGoogleTasks(token, storeState, storeActions) {
  if (!token) throw new Error("No Google Tasks authorization token.");

  storeActions.setGoogleTasksSyncing(true);

  try {
    const { quickTasks = [], quickWorkspaces = [], quickLabels = [] } = storeState;

    // 1. Fetch all Google Task Lists
    const gLists = await fetchGoogleTaskLists(token);
    const defaultGList = gLists.find((l) => l.title === "My Tasks" || l.id === "@default") || gLists[0];

    if (!defaultGList) {
      throw new Error("No default Google task list found.");
    }

    // 2. Map SeenTasks Workspaces to Google Task Lists (Find or Create)
    const wsToListMap = {};
    wsToListMap[DEFAULT_WORKSPACE_ID] = defaultGList.id;

    for (const ws of quickWorkspaces) {
      if (ws.id === DEFAULT_WORKSPACE_ID) continue;
      let matchedList = gLists.find((l) => l.title.toLowerCase() === ws.name.toLowerCase());
      if (!matchedList) {
        matchedList = await createGoogleTaskList(token, ws.name);
      }
      wsToListMap[ws.id] = matchedList.id;
    }

    // 3. Fetch all tasks from Google across relevant lists
    const allGoogleTasks = [];
    const listIdsToQuery = Array.from(new Set(Object.values(wsToListMap)));

    for (const listId of listIdsToQuery) {
      const tasks = await fetchGoogleTasks(token, listId);
      tasks.forEach((t) => {
        t.listId = listId;
        allGoogleTasks.push(t);
      });
    }

    let pulledCount = 0;
    let pushedCount = 0;

    const updatedQuickTasks = [...quickTasks];

    // 4. Inbound Sync: Google Tasks -> SeenTasks
    for (const gt of allGoogleTasks) {
      if (!gt.title || gt.deleted) continue;

      // Find if this task already exists in SeenTasks
      const matchIdx = updatedQuickTasks.findIndex(
        (st) => st.googleTaskId === gt.id || st.id === `gt_${gt.id}` || (st.title === gt.title && st.dueDate === gt.due?.slice(0, 10))
      );

      // Find workspace for this task list
      const targetWsId = Object.keys(wsToListMap).find((wsId) => wsToListMap[wsId] === gt.listId) || DEFAULT_WORKSPACE_ID;

      if (matchIdx >= 0) {
        // Update existing task if completion changed in Google
        const existing = updatedQuickTasks[matchIdx];
        const gDone = gt.status === "completed";
        if (existing.done !== gDone) {
          updatedQuickTasks[matchIdx] = {
            ...existing,
            done: gDone,
            googleTaskId: gt.id,
            googleListId: gt.listId,
            completedAt: gDone ? (gt.completed || new Date().toISOString()) : null,
          };
          pulledCount += 1;
        }
      } else {
        // Add new task imported from Google Tasks
        const parsed = parseGoogleTaskToQuickTask(gt, targetWsId, quickLabels);
        updatedQuickTasks.unshift(parsed);
        pulledCount += 1;
      }
    }

    // 5. Outbound Sync: SeenTasks -> Google Tasks (push new SeenTasks tasks or update completions)
    for (let i = 0; i < updatedQuickTasks.length; i++) {
      const stTask = updatedQuickTasks[i];
      const targetListId = wsToListMap[stTask.workspaceId || DEFAULT_WORKSPACE_ID] || defaultGList.id;
      const wsObj = quickWorkspaces.find((w) => w.id === stTask.workspaceId);
      const wsName = wsObj?.name || "General";

      if (stTask.googleTaskId) {
        // Check if completion status needs patching to Google
        const matchedGt = allGoogleTasks.find((g) => g.id === stTask.googleTaskId);
        if (matchedGt && (matchedGt.status === "completed") !== stTask.done) {
          await patchGoogleTask(token, stTask.googleListId || targetListId, stTask.googleTaskId, {
            status: stTask.done ? "completed" : "needsAction",
          });
          pushedCount += 1;
        }
      } else if (!stTask.flowRef) {
        // New task created in SeenTasks without Google link -> push to Google Tasks
        const payload = formatQuickTaskForGoogle(stTask, quickLabels, wsName);
        const createdGt = await createGoogleTask(token, targetListId, payload);
        updatedQuickTasks[i] = {
          ...stTask,
          googleTaskId: createdGt.id,
          googleListId: targetListId,
        };
        pushedCount += 1;
      }
    }

    // 6. Apply updated tasks to SeenTasks Store
    storeActions.setQuickTasks(updatedQuickTasks);
    storeActions.recordGoogleSyncDone();

    return {
      success: true,
      pulledCount,
      pushedCount,
      totalSynced: updatedQuickTasks.length,
    };
  } catch (err) {
    console.error("2-Way Google Tasks Sync error:", err);
    storeActions.setGoogleTasksSyncing(false);
    throw err;
  }
}
