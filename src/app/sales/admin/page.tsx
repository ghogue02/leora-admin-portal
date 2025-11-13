"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";
import RepManagement from "./sections/RepManagement";
import CustomerAssignment from "./sections/CustomerAssignment";
import ProductGoals from "./sections/ProductGoals";

type TabType = "reps" | "assignments" | "goals" | "incentives" | "budget";

const tabs: Array<{ id: TabType; label: string; description: string }> = [
  { id: "reps", label: "Sales Representatives", description: "Manage assignments and quotas" },
  { id: "assignments", label: "Customer Assignments", description: "Balance coverage across reps" },
  { id: "goals", label: "Product Goals", description: "Track SKU/category targets by rep" },
  { id: "incentives", label: "Incentives", description: "Competitions + bonus structures" },
  { id: "budget", label: "Sample Budget", description: "Monitor spend by territory" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("reps");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sales/auth/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        const roles = data.user?.roles || [];
        const isAdmin = roles.some(
          (r: { role: { code: string } }) => r.role.code === "sales.admin" || r.role.code === "admin",
        );

        if (!isAdmin) {
          window.location.href = "/sales/dashboard";
          return;
        }

        setUserRole("admin");
        setIsLoading(false);
      })
      .catch(() => {
        window.location.href = "/sales/dashboard";
      });
  }, []);

  const activeTabMeta = useMemo(() => tabs.find((tab) => tab.id === activeTab), [activeTab]);

  if (isLoading) {
    return (
      <main className="layout-shell-tight layout-stack pb-12">
        <ResponsiveCard className="flex flex-col items-center gap-3 text-sm text-gray-600">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          Checking admin access...
        </ResponsiveCard>
      </main>
    );
  }

  if (!userRole) {
    return null;
  }

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Operations</p>
        <h1 className="text-3xl font-bold text-gray-900">Sales administration</h1>
        <p className="text-sm text-gray-600">
          Keep reps, assignments, and incentives aligned without switching to a separate mobile UI.
        </p>
      </header>

      <ResponsiveCard className="p-0">
        <ResponsiveCardHeader className="p-4 pb-2">
          <ResponsiveCardTitle>Workspace sections</ResponsiveCardTitle>
          <ResponsiveCardDescription>
            Jump between staffing, assignments, and planning tools.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <div className="flex flex-col gap-4 border-t border-slate-100 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              {activeTabMeta?.description ?? "Select a section to begin"}
            </div>
            <Link
              href="/sales/admin/jobs"
              className="touch-target inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-slate-50"
            >
              Open Job Queue
            </Link>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Sales admin sections">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`touch-target rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </ResponsiveCard>

      <section className="layout-stack">
        {activeTab === "reps" && <RepManagement />}
        {activeTab === "assignments" && <CustomerAssignment />}
        {activeTab === "goals" && <ProductGoals />}
        {activeTab === "incentives" && (
          <ResponsiveCard>
            <ResponsiveCardHeader>
              <ResponsiveCardTitle>Incentives & competitions</ResponsiveCardTitle>
              <ResponsiveCardDescription>
                Bonus ladders and SPIF tracking will land after the card/table reskin wraps.
              </ResponsiveCardDescription>
            </ResponsiveCardHeader>
            <p className="text-sm text-gray-600">
              Track quarterly bonus programs, draft SPIF rules, and share standings with the team. This
              experience is slated for CRM-48E (charts/dashboards).
            </p>
          </ResponsiveCard>
        )}
        {activeTab === "budget" && (
          <ResponsiveCard>
            <ResponsiveCardHeader>
              <ResponsiveCardTitle>Sample budget monitoring</ResponsiveCardTitle>
              <ResponsiveCardDescription>
                Mobile-friendly readouts for sample spend by territory and rep.
              </ResponsiveCardDescription>
            </ResponsiveCardHeader>
            <p className="text-sm text-gray-600">
              Budget visualizations will ship alongside the remaining responsive chart work (CRM-48E).
            </p>
          </ResponsiveCard>
        )}
      </section>
    </main>
  );
}
