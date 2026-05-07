import { useState } from "react";
import SideBar from "../components/SideBar";
import { TopBar } from "../components/TopBar";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-gray-50">
      <SideBar isOpen={sideBarOpen} setIsOpen={setSideBarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSideBarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
