import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLenis } from "./lib/useLenis";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const QuickTasksPage = lazy(() => import("./pages/QuickTasksPage"));
const TodayPage = lazy(() => import("./pages/TodayPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const PersonaPage = lazy(() => import("./pages/PersonaPage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const BinPage = lazy(() => import("./pages/BinPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));

function RouteFallback() {
  return <div className="route-fallback" aria-hidden="true" />;
}

export default function App() {
  useLenis();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<QuickTasksPage />} />
            <Route path="quick" element={<Navigate to="/app" replace />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="persona" element={<PersonaPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="bin" element={<BinPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="explore" element={<ExplorePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
