import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { SystemAnnouncement } from "./SystemAnnouncement";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SystemAnnouncement />
      {/* Main content area with safe area padding */}
      <main className="flex-1 safe-top pb-[calc(4rem+env(safe-area-inset-bottom,0px))] overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
