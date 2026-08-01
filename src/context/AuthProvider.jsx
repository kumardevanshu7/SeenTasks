import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut } from "firebase/auth";
import { auth, authPersistenceReady, googleProvider } from "../lib/firebase";
import { claimUsername as claimUsernameApi, loadUserProfile } from "../lib/profileService";
import { AuthContext } from "./AuthContext";

const REDIRECT_ERROR_CODES = new Set([
  "auth/popup-blocked",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
]);

const PROFILE_CACHE_KEY = "seentasks-profile-cache";

function readProfileCache(uid) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.uid !== uid || !parsed?.profile) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

function writeProfileCache(uid, profile) {
  try {
    if (!uid || !profile) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return;
    }
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ uid, profile }));
  } catch {
    // ignore quota / private mode
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    authPersistenceReady
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          if (!active) return;
          setUser(nextUser);
          setLoading(false);

          if (!nextUser) {
            setProfile(null);
            setProfileLoading(false);
            writeProfileCache(null, null);
            return;
          }

          const cached = readProfileCache(nextUser.uid);
          if (cached) {
            // Show app immediately — refresh profile in the background.
            setProfile(cached);
            setProfileLoading(false);
          } else {
            setProfile(null);
            setProfileLoading(true);
          }

          try {
            const nextProfile = await loadUserProfile(nextUser.uid);
            if (!active || auth.currentUser?.uid !== nextUser.uid) return;
            setProfile(nextProfile);
            writeProfileCache(nextUser.uid, nextProfile);
          } catch {
            if (active && !cached) setProfile(null);
          } finally {
            if (active) setProfileLoading(false);
          }
        });
      })
      .catch(() => {
        setLoading(false);
        setProfileLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authPersistenceReady;
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (REDIRECT_ERROR_CODES.has(error.code)) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw error;
    }
  }, []);

  const claimUsername = useCallback(async (username) => {
    const nextProfile = await claimUsernameApi(username);
    setProfile(nextProfile);
    if (auth.currentUser?.uid) writeProfileCache(auth.currentUser.uid, nextProfile);
    return nextProfile;
  }, []);

  const signOut = useCallback(async () => {
    writeProfileCache(null, null);
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, profileLoading, signInWithGoogle, claimUsername, signOut }),
    [user, profile, loading, profileLoading, signInWithGoogle, claimUsername, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
