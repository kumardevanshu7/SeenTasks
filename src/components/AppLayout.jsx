import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import CommandPalette from "./CommandPalette";
import { useCollabSync } from "../hooks/useCollabSync";
import { useQuickTasksSync } from "../hooks/useQuickTasksSync";
import { useOnePasswordSync } from "../hooks/useOnePasswordSync";
import { useGoogleTasksSync } from "../hooks/useGoogleTasksSync";

export default function AppLayout() {
  useCollabSync();
  useQuickTasksSync();
  useOnePasswordSync();
  useGoogleTasksSync();
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main"><Outlet /></main>
      <CommandPalette />
    </div>
  );
}
