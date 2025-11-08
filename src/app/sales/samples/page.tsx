"use client";

import Link from "next/link";
import { CheckCircle2, BarChart3, ClipboardPen, Mail } from "lucide-react";
export default function SalesSamplesLandingPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sampling Hub</p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Samples</h1>
          <p className="mt-1 text-sm text-gray-600">
            Log tastings, stay ahead of follow-ups, and monitor supplier performance—everything you need in one spot.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sales/analytics/samples"
            className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <BarChart3 className="h-4 w-4" />
            Sampling Analytics
          </Link>
          <Link
            href="/sales/sample-lists"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Manage Sample Lists
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickStatCard
          icon={<ClipboardPen className="h-5 w-5 text-blue-600" />}
          title="Log Samples"
          description="Open any customer record to capture tastings or use Quick Assign for a faster flow."
          action={{ label: "Find a customer", href: "/sales/customers" }}
        />
        <QuickStatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          title="Follow Ups"
          description="Mark items complete from customer pages or the dashboard sampling widget."
          action={{ label: "View follow-ups", href: "/sales/dashboard" }}
        />
        <QuickStatCard
          icon={<Mail className="h-5 w-5 text-purple-600" />}
          title="Supplier Reports"
          description="Show partners the ROI of your sampling programs with live analytics."
          action={{ label: "Supplier insights", href: "/sales/analytics/samples#suppliers" }}
        />
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Heads up</p>
        <p className="mt-1">
          The Samples tab now focuses on quick logging and follow-up actions. For conversion trends and supplier dashboards, click "Sampling Analytics" above.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <QuickStatCard
          icon={<ClipboardPen className="h-5 w-5 text-blue-600" />}
          title="Log from Customer Page"
          description="Open any customer profile and use the Log Samples panel to capture tastings instantly."
          action={{ label: "View customers", href: "/sales/customers" }}
        />
        <QuickStatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          title="Manage Follow-ups"
          description="Follow-up queues live inside each customer file and on your dashboard widget."
          action={{ label: "Go to dashboard", href: "/sales/dashboard" }}
        />
      </section>
    </main>
  );
}

type QuickStatCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
};

function QuickStatCard({ icon, title, description, action }: QuickStatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-slate-100 p-2">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-600">{description}</p>
        </div>
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
