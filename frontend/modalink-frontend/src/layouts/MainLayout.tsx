import { useState } from "react";
import SideBar from "../components/SideBar";
import { TopBar } from "../components/TopBar";
import AmbientMusicPlayer from "../components/AmbientMusicPlayer";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="erp-shell flex h-dvh overflow-hidden bg-[#faf8fc]">
      <SideBar
        isOpen={sideBarOpen}
        setIsOpen={setSideBarOpen}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSideBarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
      <AmbientMusicPlayer />
    </div>
  );
}
