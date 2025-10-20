"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import AdminHeader from "./components/AdminHeader";
import Breadcrumbs from "./components/Breadcrumbs";
import { ToastProvider } from "./components/Toast";
import { GlobalSearch } from "./components/GlobalSearch";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcuts";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            <Breadcrumbs />
            <div className="mt-4">{children}</div>
          </div>
        </main>
      </div>

      {/* Global Components */}
      <ToastProvider />
      <GlobalSearch />
      <KeyboardShortcutsHelp />
    </div>
  );
}
