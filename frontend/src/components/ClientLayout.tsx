"use client";

import React from "react";
import Sidebar from "./Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Always mount the navigation sidebar for desktop single-user setup
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-h-screen pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
