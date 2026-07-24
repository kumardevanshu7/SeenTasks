import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  endAt,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAt,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { normalizeUsername } from "./profileService";

// ---------- People search (Google-style prefix autocomplete) ----------
export async function searchProfiles(rawQuery) {
  const q = normalizeUsername(rawQuery);
  if (q.length < 1) return [];
  const ref = collection(db, "publicProfiles");
  const snap = await getDocs(query(ref, orderBy("usernameLower"), startAt(q), endAt(`${q}\uf8ff`), limit(6)));
  const me = auth.currentUser?.uid;
  return snap.docs
    .map((d) => d.data())
    .filter((p) => p.uid !== me)
    .map((p) => ({ uid: p.uid, username: p.username, displayName: p.displayName || p.username, photoURL: p.photoURL || "" }));
}

// ---------- Connection requests ----------
export async function sendConnectionRequest(fromProfile, toProfile) {
  const me = auth.currentUser;
  if (!me) throw new Error("auth/required");
  await addDoc(collection(db, "connectionRequests"), {
    fromUid: me.uid,
    fromUsername: fromProfile.username,
    fromName: fromProfile.displayName || fromProfile.username,
    fromPhoto: fromProfile.photoURL || "",
    toUid: toProfile.uid,
    toUsername: toProfile.username,
    toName: toProfile.displayName || toProfile.username,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export function listenIncomingRequests(uid, cb) {
  const ref = collection(db, "connectionRequests");
  return onSnapshot(query(ref, where("toUid", "==", uid)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.status === "pending"));
  });
}

export async function respondToRequest(reqId, accepted) {
  await updateDoc(doc(db, "connectionRequests", reqId), {
    status: accepted ? "accepted" : "rejected",
    respondedAt: serverTimestamp(),
  });
}

// Connections are derived from accepted requests on either side.
export function listenConnections(uid, cb) {
  const ref = collection(db, "connectionRequests");
  let fromList = [];
  let toList = [];
  const emit = () => {
    const map = new Map();
    [...fromList, ...toList].forEach((c) => map.set(c.uid, c));
    cb([...map.values()]);
  };
  const unsubA = onSnapshot(query(ref, where("fromUid", "==", uid)), (snap) => {
    fromList = snap.docs.map((d) => d.data()).filter((r) => r.status === "accepted")
      .map((r) => ({ uid: r.toUid, username: r.toUsername, name: r.toName, photoURL: "" }));
    emit();
  });
  const unsubB = onSnapshot(query(ref, where("toUid", "==", uid)), (snap) => {
    toList = snap.docs.map((d) => d.data()).filter((r) => r.status === "accepted")
      .map((r) => ({ uid: r.fromUid, username: r.fromUsername, name: r.fromName, photoURL: r.fromPhoto || "" }));
    emit();
  });
  return () => { unsubA(); unsubB(); };
}

// ---------- Assigned tasks ----------
export async function assignTask({ toConnection, analysis, title, description, dateKey, firstDateKey }, fromProfile) {
  const me = auth.currentUser;
  if (!me) throw new Error("auth/required");
  await addDoc(collection(db, "assignedTasks"), {
    fromUid: me.uid,
    fromUsername: fromProfile.username,
    fromName: fromProfile.displayName || fromProfile.username,
    toUid: toConnection.uid,
    toUsername: toConnection.username,
    toName: toConnection.name || toConnection.username,
    title,
    description: description || "",
    dateKey,
    firstDateKey: firstDateKey || dateKey,
    category: analysis.category,
    reasoning: analysis.reasoning,
    wellbeingNote: analysis.wellbeingNote || "",
    analysisSource: analysis.source || "heuristic",
    status: "active",
    createdAt: serverTimestamp(),
  });
}

export function listenAssignedByMe(uid, cb) {
  const ref = collection(db, "assignedTasks");
  return onSnapshot(query(ref, where("fromUid", "==", uid)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function listenAssignedToMe(uid, cb) {
  const ref = collection(db, "assignedTasks");
  return onSnapshot(query(ref, where("toUid", "==", uid)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function setAssignedStatus(taskId, status) {
  await updateDoc(doc(db, "assignedTasks", taskId), {
    status,
    completedAt: status === "completed" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAssignedTask(taskId) {
  await deleteDoc(doc(db, "assignedTasks", taskId));
}
