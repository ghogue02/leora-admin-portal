'use client';

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { DashboardTile } from "@/components/dashboard/DashboardTile";
import type { DashboardDrilldownType } from "@/types/drilldown";

type Customer = {
  id: string;
  name: string;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  averageOrderIntervalDays: number | null;
  riskStatus: string;
  daysOverdue: number;
};

type CustomersDueListProps = {
  customers: Customer[];
  onDrilldown?: (type: DashboardDrilldownType) => void;
};

export default function CustomersDueList({ customers, onDrilldown }: CustomersDueListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch("/api/sales/dashboard/customers-due/export", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to export customers due.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `customers-due-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export customers due:", error);
      alert("Unable to export customers right now. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  if (customers.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Customers Due to Order</h3>
        <p className="mt-2 text-sm text-gray-600">
          No customers are due to order this week. Great job staying ahead!
        </p>
      </section>
    );
  }

  return (
    <DashboardTile
      drilldownType="customers-due"
      title="Customers Due to Order"
      onClick={() => onDrilldown?.('customers-due')}
    >
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customers Due to Order</h3>
            <p className="text-xs text-gray-500">
              Based on ordering history and expected cadence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              {customers.length} customer{customers.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

      <ul className="mt-4 space-y-3">
        {customers.slice(0, isExpanded ? customers.length : 3).map((customer) => (
          <li
            key={customer.id}
            className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 transition hover:border-slate-300"
          >
            <div className="flex-1">
              <Link
                href={`/sales/customers/${customer.id}`}
                className="font-semibold text-gray-900 hover:text-gray-700"
              >
                {customer.name}
              </Link>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                {customer.lastOrderDate && (
                  <span>
                    Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </span>
                )}
                {customer.averageOrderIntervalDays && (
                  <span>
                    Typical pace: every {customer.averageOrderIntervalDays} days
                  </span>
                )}
                {customer.nextExpectedOrderDate && (
                  <span>
                    Expected: {new Date(customer.nextExpectedOrderDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <RiskStatusBadge status={customer.riskStatus} />
              {customer.daysOverdue > 0 && (
                <span className="text-xs font-semibold text-rose-700">
                  {customer.daysOverdue} day{customer.daysOverdue === 1 ? "" : "s"} overdue
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Show More / Show Less Button */}
      {customers.length > 3 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
          >
            {isExpanded ? '▲ Show Less' : `▼ Show ${customers.length - 3} More`}
          </button>
        </div>
      )}

      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <p className="font-semibold">Recommended Actions</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Reach out proactively to schedule orders</li>
          <li>Offer tastings for new products or seasonal items</li>
          <li>Check if they need assistance with inventory planning</li>
        </ul>
      </div>
    </section>
    </DashboardTile>
  );
}

function RiskStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    HEALTHY: {
      label: "Healthy",
      className: "bg-green-100 text-green-700",
    },
    AT_RISK_CADENCE: {
      label: "At Risk",
      className: "bg-amber-100 text-amber-700",
    },
    AT_RISK_REVENUE: {
      label: "Revenue Risk",
      className: "bg-orange-100 text-orange-700",
    },
    DORMANT: {
      label: "Dormant",
      className: "bg-rose-100 text-rose-700",
    },
  };

  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
