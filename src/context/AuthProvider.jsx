import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, authPersistenceReady, googleProvider } from "../lib/firebase";
import { claimUsername as claimUsernameApi, loadUserProfile } from "../lib/profileService";
import { AuthContext } from "./AuthContext";

const REDIRECT_ERROR_CODES = new Set([
  "auth/popup-blocked",
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
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    // Check for any pending redirect result when returning from signInWithRedirect
    getRedirectResult(auth).catch((err) => {
      console.warn("Firebase redirect auth failed:", err);
    });

    // Always subscribe to onAuthStateChanged even if persistence configuration fails
    authPersistenceReady
      .catch((err) => {
        console.warn("Auth persistence failed, falling back to memory/default session:", err);
      })
      .finally(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          if (!active) return;
          setUser(nextUser);
          setLoading(false);

          if (!nextUser) {
            setProfile(null);
            setProfileError(null);
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

          const isCurrent = () => active && auth.currentUser?.uid === nextUser.uid;

          try {
            const nextProfile = await loadUserProfile(nextUser.uid);
            if (!isCurrent()) return;
            setProfile(nextProfile);
            setProfileError(null);
            writeProfileCache(nextUser.uid, nextProfile);
          } catch (err) {
            if (!isCurrent()) return;
            console.warn("Failed to load user profile:", err);
            setProfileError(err);
            if (!cached) setProfile(null);
          } finally {
            if (isCurrent()) {
              setProfileLoading(false);
            }
          }
        });
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const nextProfile = await loadUserProfile(currentUser.uid);
      setProfile(nextProfile);
      setProfileError(null);
      writeProfileCache(currentUser.uid, nextProfile);
      return nextProfile;
    } catch (err) {
      console.warn("Failed to refresh user profile:", err);
      setProfileError(err);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authPersistenceReady;
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (error) {
      // Ignore user double-click cancellations
      if (error?.code === "auth/cancelled-popup-request") {
        return null;
      }
      if (REDIRECT_ERROR_CODES.has(error?.code)) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw error;
    }
  }, []);

  const claimUsername = useCallback(async (username) => {
    const nextProfile = await claimUsernameApi(username);
    setProfile(nextProfile);
    setProfileError(null);
    if (auth.currentUser?.uid) writeProfileCache(auth.currentUser.uid, nextProfile);
    return nextProfile;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      writeProfileCache(null, null);
      setProfile(null);
      setProfileError(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      profileError,
      refreshProfile,
      signInWithGoogle,
      claimUsername,
      signOut,
    }),
    [user, profile, loading, profileLoading, profileError, refreshProfile, signInWithGoogle, claimUsername, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
