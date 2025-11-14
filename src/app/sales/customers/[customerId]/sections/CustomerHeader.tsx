'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { Pencil, Tag, Calendar, TrendingUp } from "lucide-react";
import type { AccountPriority } from "@prisma/client";
import { formatCurrency, formatShortDate } from "@/lib/format";

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

export default function CustomerHeader({ customer, onAddOrder, metrics, tags }: CustomerHeaderProps) {
  const params = useParams();
  const customerId = params.customerId as string;

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
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityBadge(customer.accountPriority ?? null)}`}
              >
                {getPriorityLabel(customer.accountPriority ?? null)}
              </span>
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
          </div>
        </div>
      </div>

      {/* Bottom Row: Contact Info + Account Details Grid */}
      <div className="px-6 py-4 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Contact Information */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Contact
            </p>
            {customer.phone && (
              <div className="text-gray-900">
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
            {customer.billingEmail && (
              <div className="text-gray-600 truncate">
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

          {/* Account Numbers */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Account IDs
            </p>
            {customer.accountNumber && (
              <div className="text-gray-600">
                <span className="text-gray-500">Acct:</span> <span className="font-mono text-xs">{customer.accountNumber}</span>
              </div>
            )}
            {customer.externalId && (
              <div className="text-gray-600">
                <span className="text-gray-500">Ext:</span> <span className="font-mono text-xs">{customer.externalId}</span>
              </div>
            )}
            {customer.licenseNumber && (
              <div className="text-gray-600">
                <span className="text-gray-500">Lic:</span> <span className="font-mono text-xs">{customer.licenseNumber}</span>
              </div>
            )}
          </div>

          {/* Performance Summary */}
          {metrics && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                Performance
              </p>
              <div className="text-gray-600 space-y-0.5">
                <div>
                  <span className="text-gray-500">AOV:</span> <span className="font-medium text-gray-900">{formatCurrency(metrics.avgOrderValue, 'USD')}</span>
                </div>
                {metrics.lastOrderDate && (
                  <div className="text-xs">
                    Last order: {formatShortDate(metrics.lastOrderDate)}
                    {metrics.daysSinceLastOrder && ` (${metrics.daysSinceLastOrder}d ago)`}
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
