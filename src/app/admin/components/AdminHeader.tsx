"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

interface AdminHeaderProps {
  user?: {
    fullName: string;
    email: string;
  };
  onToggleSidebar?: () => void;
}

export default function AdminHeader({ user, onToggleSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Try sales logout first (most common for admin users)
      await fetch("/api/sales/auth/logout", {
        method: "POST",
        headers: {
          "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
        },
      });

      // Also try portal logout in case user came from portal
      await fetch("/api/portal/auth/logout", {
        method: "POST",
        headers: {
          "X-Tenant-Slug": process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted",
        },
      });

      router.push("/sales/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-gray-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </header>
  );
}
