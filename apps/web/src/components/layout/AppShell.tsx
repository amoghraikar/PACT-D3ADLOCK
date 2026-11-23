"use client";

import React from "react";
import { ResponsiveSidebar } from "./ResponsiveSidebar";
import { BottomNavigation } from "./BottomNavigation";
import { TopBar } from "./TopBar";

export interface AppShellProps {
  children: React.ReactNode;
  communityName?: string;
  hideSidebar?: boolean;
}

export function AppShell({
  children,
  communityName = "Green Meadows, Apts",
  hideSidebar = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-text">
      {/* Desktop Responsive Sidebar */}
      {!hideSidebar && <ResponsiveSidebar />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar communityName={communityName} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation />
      </div>
    </div>
  );
}
