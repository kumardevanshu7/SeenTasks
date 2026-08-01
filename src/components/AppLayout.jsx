import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useCollabSync } from "../hooks/useCollabSync";
import { useQuickTasksSync } from "../hooks/useQuickTasksSync";

export default function AppLayout() {
  useCollabSync();
  useQuickTasksSync();
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main"><Outlet /></main>
    </div>
  );
}
