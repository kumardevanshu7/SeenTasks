import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useCollabSync } from "../hooks/useCollabSync";
import { useQuickTasksSync } from "../hooks/useQuickTasksSync";
import { useOnePasswordSync } from "../hooks/useOnePasswordSync";

export default function AppLayout() {
  useCollabSync();
  useQuickTasksSync();
  useOnePasswordSync();
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main"><Outlet /></main>
    </div>
  );
}
