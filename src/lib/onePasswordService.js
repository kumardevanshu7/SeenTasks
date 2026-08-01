import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

function onePasswordRef(uid) {
  return doc(db, "users", uid, "settings", "onePassword");
}

export function normalizeOneAnswer(answer) {
  return String(answer || "").trim().toLowerCase();
}

export async function hashOneAnswer(answer) {
  const normalized = normalizeOneAnswer(answer);
  if (!normalized) return "";
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Very old environments — still never store plaintext in our primary path.
  let h = 0;
  for (let i = 0; i < normalized.length; i += 1) h = (h * 31 + normalized.charCodeAt(i)) >>> 0;
  return `legacy_${h.toString(16)}`;
}

export function isOnePasswordConfigured(onePassword) {
  return Boolean(onePassword?.question?.trim() && onePassword?.answerHash?.trim());
}

export async function verifyOnePassword(onePassword, attempt) {
  if (!isOnePasswordConfigured(onePassword)) return false;
  const attemptHash = await hashOneAnswer(attempt);
  return attemptHash === onePassword.answerHash;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeOnePasswordDoc(data = {}) {
  const question = String(data.question || "").trim();
  const answerHash = String(data.answerHash || "").trim();
  if (!question || !answerHash) return null;
  return {
    question,
    answerHash,
    updatedAt: toMillis(data.updatedAt) || Date.now(),
  };
}

export async function loadOnePassword(uid) {
  if (!uid) return null;
  const snap = await getDoc(onePasswordRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data() || {};

  // One-time migrate: old plaintext `answer` → `answerHash`, then drop plaintext.
  if (data.answer && !data.answerHash) {
    const answerHash = await hashOneAnswer(data.answer);
    const migrated = {
      question: String(data.question || "").trim(),
      answerHash,
      updatedAt: serverTimestamp(),
    };
    await setDoc(onePasswordRef(uid), migrated, { merge: false });
    return normalizeOnePasswordDoc({
      question: migrated.question,
      answerHash,
      updatedAt: Date.now(),
    });
  }

  return normalizeOnePasswordDoc(data);
}

export async function saveOnePassword(uid, { question, answer }) {
  if (!uid) throw new Error("auth/required");
  const cleanQuestion = String(question || "").trim();
  const cleanAnswer = String(answer || "").trim();
  if (!cleanQuestion || !cleanAnswer) {
    throw new Error("Question and answer are required.");
  }
  const answerHash = await hashOneAnswer(cleanAnswer);
  const payload = {
    question: cleanQuestion,
    answerHash,
    updatedAt: serverTimestamp(),
  };
  // overwrite — never keep plaintext answer field
  await setDoc(onePasswordRef(uid), payload, { merge: false });
  return {
    question: cleanQuestion,
    answerHash,
    updatedAt: Date.now(),
  };
}

export async function clearOnePasswordDoc(uid) {
  if (!uid) return;
  await deleteDoc(onePasswordRef(uid));
}
