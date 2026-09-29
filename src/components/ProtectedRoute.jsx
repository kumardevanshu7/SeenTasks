import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import UsernameSetup from "./UsernameSetup";

export default function ProtectedRoute() {
  const { user, profile, loading, profileLoading, profileError, refreshProfile } = useAuth();
  const location = useLocation();

  // Only block on first auth check. Cached profile skips the loading screen.
  if (loading) return null;

  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  // Wait for profile only when we have nothing cached yet.
  if (profileLoading && !profile) return null;

  // On network or server error with no cached profile, don't falsely send existing users to UsernameSetup.
  if (profileError && !profile) {
    return (
      <div
        className="profile-error-screen"
        style={{
          minHeight: "80vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "400px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--ink, #1e293b)" }}>
            Unable to load your profile
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--muted, #64748b)" }}>
            There was a connection problem fetching your user data. Please try again.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => refreshProfile && refreshProfile()}
            style={{ marginTop: "10px" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile?.username) return <UsernameSetup />;
  return <Outlet />;
}
