import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useCollabSync } from "../hooks/useCollabSync";

export default function AppLayout() {
  useCollabSync();
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main"><Outlet /></main>
    </div>
  );
}
