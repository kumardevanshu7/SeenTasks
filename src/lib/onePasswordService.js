import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

function onePasswordRef(uid) {
  return doc(db, "users", uid, "settings", "onePassword");
}

export function normalizeOneAnswer(answer) {
  return String(answer || "").trim().toLowerCase();
}

export async function hashOneAnswerWithSalt(answer, saltHex = null) {
  const normalized = normalizeOneAnswer(answer);
  if (!normalized) return "";

  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      let saltBytes;
      if (saltHex) {
        const match = saltHex.match(/.{1,2}/g) || [];
        saltBytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
      } else {
        saltBytes = new Uint8Array(16);
        crypto.getRandomValues(saltBytes);
        saltHex = [...saltBytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      }

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(normalized),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      const derived = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: saltBytes,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        256
      );
      const hashHex = [...new Uint8Array(derived)].map((b) => b.toString(16).padStart(2, "0")).join("");
      return `pbkdf2:${saltHex}:${hashHex}`;
    } catch {
      // Fallback if PBKDF2 fails
    }
  }

  // Fallback for older / unsupported environments
  let h = 0;
  for (let i = 0; i < normalized.length; i += 1) h = (h * 31 + normalized.charCodeAt(i)) >>> 0;
  return `legacy_${h.toString(16)}`;
}

export async function hashOneAnswer(answer) {
  return hashOneAnswerWithSalt(answer);
}

export function isOnePasswordConfigured(onePassword) {
  return Boolean(onePassword?.question?.trim() && onePassword?.answerHash?.trim());
}

export async function verifyOnePassword(onePassword, attempt) {
  if (!isOnePasswordConfigured(onePassword)) return false;
  const storedHash = onePassword.answerHash;
  const normalized = normalizeOneAnswer(attempt);
  if (!normalized) return false;

  // Modern salted PBKDF2 hash
  if (storedHash.startsWith("pbkdf2:")) {
    const parts = storedHash.split(":");
    const saltHex = parts[1];
    const testHash = await hashOneAnswerWithSalt(attempt, saltHex);
    return testHash === storedHash;
  }

  // Backward compatibility: Legacy unsalted SHA-256
  if (typeof crypto !== "undefined" && crypto.subtle && !storedHash.startsWith("legacy_")) {
    try {
      const bytes = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const rawSha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
      if (rawSha256 === storedHash) return true;
    } catch {
      // ignore and try legacy
    }
  }

  // Very old 32-bit fallback
  let h = 0;
  for (let i = 0; i < normalized.length; i += 1) h = (h * 31 + normalized.charCodeAt(i)) >>> 0;
  return `legacy_${h.toString(16)}` === storedHash;
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
