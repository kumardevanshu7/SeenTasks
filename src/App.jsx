import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import TodayPage from "./pages/TodayPage";
import BinPage from "./pages/BinPage";
import TeamPage from "./pages/TeamPage";
import AssistantPage from "./pages/AssistantPage";
import ExplorePage from "./pages/ExplorePage";
import PersonaPage from "./pages/PersonaPage";
import CalendarPage from "./pages/CalendarPage";
import { useLenis } from "./lib/useLenis";

export default function App() {
  useLenis();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<TodayPage />} />
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
  );
}
