import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);
if (missingKeys.length > 0) {
  throw new Error(`Missing Firebase configuration: ${missingKeys.join(", ")}`);
}

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Analytics loads after first paint / idle — not on the critical path.
export const analyticsReady =
  typeof window === "undefined"
    ? Promise.resolve(null)
    : new Promise((resolve) => {
        const start = () => {
          import("firebase/analytics")
            .then(({ getAnalytics, isSupported }) =>
              isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
            )
            .then(resolve)
            .catch(() => resolve(null));
        };
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(start, { timeout: 5000 });
        } else {
          window.setTimeout(start, 2000);
        }
      });
