import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LegalLayout from "./components/LegalLayout";
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
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const DisclaimerPage = lazy(() => import("./pages/DisclaimerPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));

function RouteFallback() {
  return <div className="route-fallback" aria-hidden="true" />;
}

export default function App() {
  useLenis();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<LegalLayout />}>
          <Route path="about" element={<AboutPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="disclaimer" element={<DisclaimerPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>

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
            <Route path="settings" element={<SettingsPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="workspace/:workspaceId" element={<WorkspacePage />} />
            <Route path="about" element={<Navigate to="/about" replace />} />
            <Route path="privacy" element={<Navigate to="/privacy" replace />} />
            <Route path="terms" element={<Navigate to="/terms" replace />} />
            <Route path="disclaimer" element={<Navigate to="/disclaimer" replace />} />
            <Route path="contact" element={<Navigate to="/contact" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
