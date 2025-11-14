'use client';

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Tag, Calendar, TrendingUp, Info } from "lucide-react";
import type { AccountPriority } from "@prisma/client";
import { formatCurrency, formatShortDate } from "@/lib/format";
import LogActivityButton from "@/components/shared/LogActivityButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type CustomerHeaderProps = {
  customer: {
    name: string;
    accountNumber: string | null;
    externalId: string | null;
    riskStatus: string;
    phone: string | null;
    billingEmail: string | null;
    licenseNumber: string | null;
    accountPriority: AccountPriority | null;
    accountPriorityManuallySet?: boolean;
    accountPriorityAutoAssignedAt?: string | null;
    address: {
      street1: string | null;
      street2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    };
    isPermanentlyClosed: boolean;
    closedReason: string | null;
    firstOrderDate?: string | null;
    type?: string | null;
    volumeCapacity?: string | null;
    deliveryMethod?: string | null;
    deliveryWindows?: string[];
  };
  onAddOrder?: () => void;
  metrics?: {
    ytdRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    daysSinceLastOrder: number | null;
    daysUntilExpected: number | null;
  };
  tags?: string[];
};

type TaskPriorityOption = "LOW" | "MEDIUM" | "HIGH";

const TASK_PRIORITY_OPTIONS: Array<{ value: TaskPriorityOption; label: string }> = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const ACCOUNT_PRIORITY_OPTIONS: Array<{
  value: AccountPriority | null;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    value: "HIGH",
    label: "Priority 1 (High)",
    shortLabel: "P1",
    description: "Avg monthly revenue ≥ $2.5k or strategic logos needing weekly focus.",
  },
  {
    value: "MEDIUM",
    label: "Priority 2 (Medium)",
    shortLabel: "P2",
    description: "Roughly $1k–$2.5k per month; steady cadence accounts.",
  },
  {
    value: "LOW",
    label: "Priority 3 (Low)",
    shortLabel: "P3",
    description: "Under $1k per month. Long-tail or nurture accounts.",
  },
  {
    value: null,
    label: "Not set",
    shortLabel: "None",
    description: "Remove the priority flag for this account.",
  },
];

export default function CustomerHeader({ customer, onAddOrder, metrics, tags }: CustomerHeaderProps) {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customerId = params.customerId as string;

  const [accountPriority, setAccountPriority] = useState<AccountPriority | null>(customer.accountPriority);
  const [manualOverride, setManualOverride] = useState(customer.accountPriorityManuallySet ?? false);
  const [savingPriority, setSavingPriority] = useState(false);

  const getRiskBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "bg-green-100 text-green-800 border-green-200";
      case "AT_RISK_CADENCE":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "AT_RISK_REVENUE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "DORMANT":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRiskLabel = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return "Healthy";
      case "AT_RISK_CADENCE":
        return "At Risk - Cadence";
      case "AT_RISK_REVENUE":
        return "At Risk - Revenue";
      case "DORMANT":
        return "Dormant";
      case "CLOSED":
        return "Closed";
      default:
        return status;
    }
  };

  const getPriorityBadge = (priority: AccountPriority | null) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-50 text-red-700 border-red-200";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const getPriorityLabel = (priority: AccountPriority | null) => {
    switch (priority) {
      case "HIGH":
        return "Priority 1";
      case "MEDIUM":
        return "Priority 2";
      case "LOW":
        return "Priority 3";
      default:
        return "Not set";
    }
  };

  const formatAddress = () => {
    const parts = [
      customer.address.street1,
      customer.address.street2,
      [customer.address.city, customer.address.state, customer.address.postalCode]
        .filter(Boolean)
        .join(", "),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No address on file";
  };

  // Calculate urgency indicator
  const getUrgencyIndicator = () => {
    if (!metrics?.daysUntilExpected) return null;

    if (metrics.daysUntilExpected < -14) {
      return { text: `Overdue by ${Math.abs(metrics.daysUntilExpected)} days`, color: 'text-red-600 font-semibold' };
    } else if (metrics.daysUntilExpected < 0) {
      return { text: `Overdue by ${Math.abs(metrics.daysUntilExpected)} days`, color: 'text-orange-600 font-medium' };
    } else if (metrics.daysUntilExpected <= 7) {
      return { text: `Order expected in ${metrics.daysUntilExpected} days`, color: 'text-amber-600' };
    }
    return null;
  };

  const urgency = getUrgencyIndicator();

  const handlePriorityUpdate = async (next: AccountPriority | null) => {
    if (savingPriority || next === accountPriority || !manualOverride) return;

    setSavingPriority(true);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountPriority: next,
          accountPriorityManuallySet: true,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to update priority");
      }

      setAccountPriority(next);
      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success("Account priority updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update account priority");
    } finally {
      setSavingPriority(false);
    }
  };

  const handleManualToggle = async () => {
    if (savingPriority) return;
    const next = !manualOverride;

    setSavingPriority(true);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountPriorityManuallySet: next,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to update priority mode");
      }

      setManualOverride(next);
      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success(next ? "Manual override enabled" : "Priority is now auto-managed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update priority mode");
    } finally {
      setSavingPriority(false);
    }
  };

  return (
    <header className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Top Row: Name, Badges, Actions */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Name and Primary Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                {customer.name}
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRiskBadge(customer.riskStatus)}`}
              >
                {getRiskLabel(customer.riskStatus)}
              </span>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold inline-flex items-center gap-1 transition hover:opacity-80 ${getPriorityBadge(accountPriority)}`}
                  >
                    {getPriorityLabel(accountPriority)}
                    <Info className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">Account Priority</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {manualOverride
                          ? "You control the priority for this account."
                          : "Auto-managed based on revenue + cadence."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleManualToggle}
                      disabled={savingPriority}
                      className={`w-full rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        manualOverride
                          ? "border border-slate-300 text-slate-700 hover:bg-slate-100"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {manualOverride ? "Switch to auto" : "Enable manual control"}
                    </button>

                    <div className="space-y-1.5 border-t pt-3">
                      {ACCOUNT_PRIORITY_OPTIONS.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => handlePriorityUpdate(option.value)}
                          disabled={savingPriority || !manualOverride}
                          className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                            accountPriority === option.value
                              ? "border-blue-400 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          } ${savingPriority || !manualOverride ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <p className="font-semibold">{option.label}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {customer.isPermanentlyClosed && (
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  CLOSED
                </span>
              )}
            </div>

            {/* Summary Line: Customer Since, Orders, Revenue, Urgency */}
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              {customer.firstOrderDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Since {formatShortDate(customer.firstOrderDate)}</span>
                </div>
              )}
              {metrics && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>
                      <strong className="text-gray-900">{metrics.totalOrders}</strong> orders
                    </span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <span>
                    <strong className="text-gray-900">{formatCurrency(metrics.ytdRevenue, 'USD')}</strong> YTD
                  </span>
                  {urgency && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className={urgency.color}>{urgency.text}</span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Tags Row */}
            {tags && tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons - Primary + Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {onAddOrder && (
              <button
                type="button"
                onClick={onAddOrder}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                Add Order
              </button>
            )}
            <Link
              href={`/sales/customers/${customerId}/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>

            {/* Quick Actions inline */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <LogActivityButton
                customerId={customerId}
                contextType="customer"
                contextLabel={customer.name}
                variant="compact"
                size="sm"
                label="Log Activity"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Expanded Info Grid (6 columns) */}
      <div className="px-6 py-4 bg-slate-50">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
          {/* Contact Information */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Contact
            </p>
            {customer.phone && (
              <div className="text-gray-900">
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline text-xs">
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.billingEmail && (
              <div className="text-gray-600 truncate text-xs">
                <a href={`mailto:${customer.billingEmail}`} className="hover:underline">
                  {customer.billingEmail}
                </a>
              </div>
            )}
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Address
            </p>
            <div className="text-gray-600 text-xs leading-relaxed">
              {formatAddress()}
            </div>
          </div>

          {/* Classification */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Classification
            </p>
            <div className="text-gray-600 text-xs space-y-0.5">
              {customer.type && (
                <div>
                  <span className="text-gray-500">Type:</span> <span className="font-medium text-gray-900">{customer.type}</span>
                </div>
              )}
              {customer.volumeCapacity && (
                <div>
                  <span className="text-gray-500">Volume:</span> <span className="font-medium text-gray-900">{customer.volumeCapacity}</span>
                </div>
              )}
              {!customer.type && !customer.volumeCapacity && (
                <span className="text-gray-400 italic">Not set</span>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Delivery
            </p>
            <div className="text-gray-600 text-xs space-y-0.5">
              {customer.deliveryMethod && (
                <div>
                  <span className="text-gray-500">Method:</span> <span className="font-medium text-gray-900">{customer.deliveryMethod}</span>
                </div>
              )}
              {customer.deliveryWindows && customer.deliveryWindows.length > 0 && (
                <div>
                  <span className="text-gray-500">Window:</span> <span className="font-medium text-gray-900">{customer.deliveryWindows[0]}</span>
                </div>
              )}
              {!customer.deliveryMethod && !customer.deliveryWindows?.length && (
                <span className="text-gray-400 italic">Not set</span>
              )}
            </div>
          </div>

          {/* Account Numbers */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Account IDs
            </p>
            <div className="text-gray-600 text-xs space-y-0.5">
              {customer.accountNumber && (
                <div>
                  <span className="text-gray-500">Acct:</span> <span className="font-mono">{customer.accountNumber}</span>
                </div>
              )}
              {customer.externalId && (
                <div>
                  <span className="text-gray-500">Ext:</span> <span className="font-mono">{customer.externalId}</span>
                </div>
              )}
              {customer.licenseNumber && (
                <div>
                  <span className="text-gray-500">Lic:</span> <span className="font-mono">{customer.licenseNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Performance Summary */}
          {metrics && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Performance
              </p>
              <div className="text-gray-600 text-xs space-y-0.5">
                <div>
                  <span className="text-gray-500">AOV:</span> <span className="font-medium text-gray-900">{formatCurrency(metrics.avgOrderValue, 'USD')}</span>
                </div>
                {metrics.lastOrderDate && (
                  <div>
                    Last: {formatShortDate(metrics.lastOrderDate)}
                    {metrics.daysSinceLastOrder && ` (${metrics.daysSinceLastOrder}d)`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Closed Account Alert */}
      {customer.isPermanentlyClosed && customer.closedReason && (
        <div className="mx-6 mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="font-semibold">Account Closed</p>
          <p className="mt-1">{customer.closedReason}</p>
        </div>
      )}
    </header>
  );
}
