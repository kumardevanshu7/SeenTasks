import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

function appStateRef(uid) {
  return doc(db, "users", uid, "settings", "appState");
}

export async function loadAppState(uid) {
  if (!uid) return { dataClearedAt: 0 };
  const snap = await getDoc(appStateRef(uid));
  if (!snap.exists()) return { dataClearedAt: 0 };
  const data = snap.data() || {};
  return { dataClearedAt: Number(data.dataClearedAt) || 0 };
}

/** Marks a full app wipe so other devices don't re-upload old local tasks. */
export async function markAppDataCleared(uid, clearedAt = Date.now()) {
  if (!uid) return clearedAt;
  const at = Number(clearedAt) || Date.now();
  await setDoc(
    appStateRef(uid),
    {
      dataClearedAt: at,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return at;
}

export function isCreatedAfterClear(item, clearedAt) {
  const cut = Number(clearedAt) || 0;
  if (!cut) return true;
  const created = new Date(item?.createdAt || 0).getTime();
  if (Number.isNaN(created)) return false;
  return created > cut;
}
