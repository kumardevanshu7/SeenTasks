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
          setProfile(null);
          if (!nextUser) {
            setProfileLoading(false);
            return;
          }

          setProfileLoading(true);
          try {
            const nextProfile = await loadUserProfile(nextUser.uid);
            if (active && auth.currentUser?.uid === nextUser.uid) setProfile(nextProfile);
          } catch {
            if (active) setProfile(null);
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
    return nextProfile;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, profileLoading, signInWithGoogle, claimUsername, signOut }),
    [user, profile, loading, profileLoading, signInWithGoogle, claimUsername, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
