import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set(["admin", "api", "app", "help", "me", "root", "seentasks", "support", "system", "team"]);

export function normalizeUsername(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function loadUserProfile(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// Claim a unique username. Create-only rule on /usernames guarantees uniqueness:
// the transaction fails if the name doc already exists for someone else.
export async function claimUsername(rawUsername) {
  const user = auth.currentUser;
  if (!user) throw new Error("auth/required");
  const username = normalizeUsername(rawUsername);
  if (!USERNAME_RE.test(username)) throw new Error("username/invalid");
  if (RESERVED.has(username)) throw new Error("username/reserved");

  const identity = {
    uid: user.uid,
    username,
    usernameLower: username,
    displayName: (user.displayName || username).slice(0, 80),
    photoURL: user.photoURL || "",
  };

  await runTransaction(db, async (tx) => {
    const nameRef = doc(db, "usernames", username);
    const nameSnap = await tx.get(nameRef);
    if (nameSnap.exists() && nameSnap.data().uid !== user.uid) {
      throw new Error("username/taken");
    }
    tx.set(nameRef, { uid: user.uid, username });
    tx.set(doc(db, "users", user.uid), {
      ...identity,
      email: user.email || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
    tx.set(doc(db, "publicProfiles", user.uid), {
      ...identity,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  return identity;
}

export async function loadFriends(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "friends"));
  return snapshot.docs.map((friend) => ({ id: friend.id, ...friend.data() }));
}

export async function addFriendByUsername(rawUsername) {
  const user = auth.currentUser;
  if (!user) throw new Error("auth/required");
  const username = normalizeUsername(rawUsername);
  if (!USERNAME_RE.test(username)) throw new Error("username/invalid");

  const nameSnap = await getDoc(doc(db, "usernames", username));
  if (!nameSnap.exists()) throw new Error("user/not-found");
  const friendUid = nameSnap.data().uid;
  if (friendUid === user.uid) throw new Error("user/self");

  const profileSnap = await getDoc(doc(db, "publicProfiles", friendUid));
  if (!profileSnap.exists()) throw new Error("user/not-found");
  const profile = profileSnap.data();

  const friend = {
    uid: friendUid,
    username: profile.username,
    displayName: profile.displayName || profile.username,
    photoURL: profile.photoURL || "",
  };
  await setDoc(doc(db, "users", user.uid, "friends", friendUid), {
    ...friend,
    addedAt: serverTimestamp(),
  }, { merge: true });
  return friend;
}

export async function removeFriend(uid, friendUid) {
  await deleteDoc(doc(db, "users", uid, "friends", friendUid));
}
