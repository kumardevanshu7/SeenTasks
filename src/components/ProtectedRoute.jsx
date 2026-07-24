import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import UsernameSetup from "./UsernameSetup";
import Logo from "./Logo";

export default function ProtectedRoute() {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="auth-loading" role="status">
        <Logo size={64} animated />
        <p>Preparing your day…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (!profile?.username) return <UsernameSetup />;
  return <Outlet />;
}
