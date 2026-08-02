# SeenTasks — Deep Project Details

> Full A–Z notes for understanding, explaining, and debugging the project.  
> Product under **Arigato Labs**. Stack: React + Vite + Firebase + OpenRouter + Zustand.

---

## 1. What is SeenTasks?

SeenTasks is a **personal day-planning web app (PWA)**.  
Unlike normal to-do apps that only store a list, SeenTasks helps you **decide what deserves today**.

There are two layers:

1. **Today (AI plan)** — You add tasks; AI (or a local fallback) sorts them by urgency, energy, and your persona goals.
2. **Quick Tasks (manual)** — Google-Tasks-style checklist for small daily items. No AI. Synced across devices.

Extra: connections (assign tasks to friends), abort bin, calendar, companion chat, Settings with **One Password**.

---

## 2. Why was this needed? (Problem → Solution)

| Pain | How SeenTasks helps |
|------|---------------------|
| Long lists feel stressful; everything feels urgent | AI places each task into a clear priority bucket with a short reason |
| People ignore their own goals (health, money, focus) | **Persona** traits influence ranking; conflicting tasks go to **Danger Zone** |
| Small daily chores don’t need AI | Separate **Quick Tasks** — fast, manual, no overthinking |
| Tasks postponed again and again get forgotten | **Recall** + “delayed by N days” visual aging |
| Deletes are too easy on a phone | **One Password** (1 question + 1 hashed answer) before delete |
| Want app-like feel on phone | Installable **PWA** |

**Real-life use:** morning open → Quick Tasks for tiny chores → Today for serious plan → tick off → unfinished Quick Tasks move to “Not completed” after midnight.

---

## 3. How the app works (big picture)

```
Landing (/) → Google Sign-in → Username setup (once)
        ↓
   /app = Quick Tasks (default home)
        ↓
   Sidebar: Today | Calendar | Persona | Assistant | Bin | Org | Settings | Explore
```

**Data split (important for interviews):**

| Data | Where it lives |
|------|----------------|
| AI personal tasks, persona | **Browser localStorage** (Zustand) |
| Quick Tasks | **Firestore** + local mirror |
| One Password | **Firestore only** (hashed answer; memory cache) |
| Profile, usernames, connections, assigned tasks | **Firestore** |
| Auth session | Firebase Auth (persisted) |

---

## 4. Features & functions (page by page)

### 4.1 Landing (`/`)
- Product story + Google CTA  
- If already signed in → go to `/app`

### 4.2 Quick Tasks (`/app`) — default home
- Add item → Enter  
- Checkbox complete (Started / Ended times)  
- Labels: `#ari` / `#arigato`, `#insta`, `#snap`, `#job` (drag-drop or type)  
- After midnight, open items → **Not completed**  
- Delete / clear completed → **One Password** gate  
- Live sync so phone and laptop share the same list  

### 4.3 Today (`/app/today`)
- Add task(s) (multi-line) → AI analyzes → categories on board  
- Date strip to change day  
- Recall incomplete past tasks into today  
- Abort → Abort bin  

### 4.4 Calendar (`/app/calendar`)
- Month view of days that have AI tasks  

### 4.5 Persona (`/app/persona`)
- Pick life traits (fitness, job hunt, no junk food, etc.)  
- Saved locally; used in next AI analyses  

### 4.6 Assistant (`/app/assistant`)
- Simple chat companion via OpenRouter  

### 4.7 Abort bin (`/app/bin`)
- Restore to today, or delete forever (One Password)  

### 4.8 Organization / Team (`/app/team`)
- Search username → connection request  
- Assign analyzed tasks to a connection  
- See tasks you assigned / received  

### 4.9 Settings (`/app/settings`)
- **One Password**: one question + one answer  
- Answer stored as **SHA-256 hash** on Firebase only  

### 4.10 Explore (`/app/explore`)
- Arigato Labs product context  

---

## 5. AI priority system

**Flow:** Add task → `analyzeTask` (lazy-loaded) → OpenRouter with system prompt + persona → JSON categories → if fail → **keyword heuristic fallback**.

**Categories:**

| ID | Meaning |
|----|---------|
| `danger` | Goes against persona goals |
| `first` | Do now / real consequence |
| `second` | Important but can wait a bit |
| `endofday` | Wrap before day ends |
| `tomorrow` | Safe to defer |

Also returns: reasoning, suggested window, wellbeing note, confidence, signals, source (`openrouter` | `heuristic`).

---

## 6. Schemas (Firestore + local)

### 6.1 Where schemas come from
- **Designed in app code** (`profileService`, `quickTaskService`, `collabService`, `onePasswordService`, Zustand `makeTask`)  
- **Enforced in** `firestore.rules` (field allowlists, enums, ownership)  
- Some rules exist for **future** org/`users/.../tasks` paths not fully used by the client yet  

### 6.2 Firestore (used)

**`users/{uid}`**  
`uid`, `username`, `usernameLower`, `displayName`, `email`, `photoURL`, `createdAt?`, `updatedAt`

**`publicProfiles/{uid}`** (searchable, no email)  
`uid`, `username`, `usernameLower`, `displayName`, `photoURL`, `updatedAt`

**`usernames/{username}`** (unique claim, create-only)  
`uid`, `username`

**`users/{uid}/quickTasks/{taskId}`**  
`title`, `done`, `dateKey` (YYYY-MM-DD), `createdAt`, `completedAt`, `updatedAt`

**`users/{uid}/settings/onePassword`**  
`question`, `answerHash`, `updatedAt`

**`connectionRequests/{id}`**  
from/to identity fields, `status` (`pending`|`accepted`|`rejected`), timestamps

**`assignedTasks/{id}`**  
from/to, title, description, dateKey, category, reasoning, wellbeingNote, analysisSource, status, timestamps

### 6.3 Local AI task shape (Zustand)
`id`, `title`, `description`, `dateKey`, `firstDateKey`, `category`, `reasoning`, `suggestedWindow`, `wellbeingNote`, `confidence`, `signals`, `analyzedAt`, `analysisSource`, `analysisModel`, `status` (`active`|`completed`|`aborted`), `iteration`, `createdAt`, `completedAt`, `abortedAt`, `isBinTask`, assignee fields

### 6.4 Rules-only / reserved
- `users/{uid}/tasks/{taskId}` — ready for cloud personal AI tasks (client still local)  
- `organizations/...` — org model in rules; UI today uses peer connections instead  

---

## 7. Security steps (what + how)

| Step | How |
|------|-----|
| Google Auth | Firebase Auth; session persisted in browser |
| Username uniqueness | Transaction on `usernames/{name}` |
| Firestore deny-by-default | Catch-all deny; only documented paths allowed |
| Owner-only user data | `request.auth.uid == userId` |
| Public profile without email | Separate `publicProfiles` collection |
| One Password | Hash answer with SHA-256 before write; never localStorage |
| Rules for onePassword | Only `question`, `answerHash`, `updatedAt` keys |
| Delete gate | UI asks question; compare hash; 5 fails → 30s lock |
| Username reserved words | Block admin/app/seentasks etc. |
| Google popup | Vite COOP header `same-origin-allow-popups` |

**Honest limit:** OpenRouter API key is client-side (`VITE_…`) — fine for demo/personal; production would move AI to a backend.

---

## 8. Tools & libraries used

| Tool | Why |
|------|-----|
| React 19 + Vite 8 | SPA + fast builds |
| React Router 7 | Routes / lazy pages |
| Firebase Auth + Firestore | Auth + realtime DB |
| Zustand + persist | Client state + offline AI tasks |
| OpenRouter | AI ranking + assistant |
| Framer Motion | Light UI motion |
| Lenis | Smooth scroll on landing only |
| Lucide | Icons |
| vite-plugin-pwa | Installable app |
| uuid | IDs |
| Vercel (typical) | Host `dist` |

Knowledge used: SPA architecture, auth flows, Firestore security rules, client state vs server state, hashing basics, PWA, performance (code-splitting, idle work), UX for calm productivity apps.

---

## 9. Performance choices

- Lazy-load every page (`React.lazy`)  
- Vendor chunks: firebase / motion / markdown  
- Latin-only fonts  
- AI module loaded only when adding/analyzing a task  
- Collab listeners start after idle (Quick Tasks opens first)  
- Profile cache → skip long loading screen  
- SW + Analytics register on idle  

---

## 10. If something breaks — how to debug

| Symptom | Check |
|---------|--------|
| Can’t sign in | Firebase Auth Google provider, authorized domains, env keys, popup blocked |
| Stuck on username | Firestore rules for `usernames` / `users` / `publicProfiles`; username format |
| Quick Tasks missing on phone | Same Google account? Rules for `quickTasks` published? Network tab for permission-denied |
| Quick Tasks not saving | Console errors; `users/{uid}/quickTasks`; signed in? |
| One Password won’t save | Rules for `settings/onePassword` (hash fields only); no plaintext `answer` |
| One Password always wrong | Answer normalized (trim + lowercase); re-save from Settings |
| AI always “local fallback” | `VITE_OPENROUTER_API_KEY`, network to OpenRouter, model availability |
| Assigned task not showing | `assignedTasks` listener; `dateKey`; Team vs Today |
| Blank / slow first open | Build chunks loading; SW cache stale → hard refresh |
| Old password still in browser | Clear site data; persist v2 strips secrets |

**Tools:** Browser DevTools (Console, Network, Application → Local Storage), Firebase Console (Auth, Firestore, Rules playground), `npm run build` for chunk sizes.

---

## 11. Interview angle — “Why did you build this?”

**Short script:**  
“I wanted a task app that doesn’t just store work — it helps you choose what deserves today. AI handles the thoughtful plan; Quick Tasks handles small daily checkboxes without overengineering. I used Firebase for auth and sync, kept personal AI tasks local for speed/privacy tradeoff, and added a simple hashed Q&A lock so deletes aren’t accidental.”

---

## 12. Architecture map (key files)

```
src/
  App.jsx, main.jsx, index.css
  context/AuthProvider.jsx
  store/useTaskStore.js
  hooks/useAuth, useQuickTasksSync, useOnePasswordSync, useCollabSync
  lib/firebase, profileService, quickTaskService, onePasswordService,
      collabService, aiAnalyzer, openrouter, systemPrompt, persona, date
  pages/…  components/QuickTasks, OnePasswordGate, TaskBoard, AddTaskModal, Navbar
firestore.rules
```

---

## 13. Known gaps / honesty

- Personal AI tasks are **not** yet synced to Firestore (rules exist for future).  
- “Organization” UI is **peer connections**, not full multi-tenant orgs (rules reserved).  
- One Password is **client-side gate** + hashed secret — soft protection, not bank-grade.  
- OpenRouter key in frontend is a tradeoff for a serverless demo.  

---

*End of deep project details.*
