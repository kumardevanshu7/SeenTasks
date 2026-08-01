import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import UsernameSetup from "./UsernameSetup";

export default function ProtectedRoute() {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Only block on first auth check. Cached profile skips the loading screen.
  if (loading) return null;

  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  // Wait for profile only when we have nothing cached yet.
  if (profileLoading && !profile) return null;

  if (!profile?.username) return <UsernameSetup />;
  return <Outlet />;
}
