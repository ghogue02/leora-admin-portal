'use client';

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight } from "lucide-react";
import type {
  AccountPulse as AccountPulseMetrics,
  CustomerCoverage,
  CustomerReportRow,
  PortfolioHealth,
} from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";
import { formatNumber } from "@/lib/format";
import CustomerBucketModal from "./components/CustomerBucketModal";
import {
  filterBucket,
  hasRecentOrder,
  isActiveAccount,
  isKeyAccount,
  isProspectAccount,
  isTargetAccount,
  needsAttention,
} from "./customerBucketFilters";

type AccountPulseProps = {
  salesRep: {
    name: string;
    territory: string | null;
  };
  accountPulse: AccountPulseMetrics;
  coverage: CustomerCoverage;
  portfolio: PortfolioHealth;
  customers: CustomerReportRow[];
};

const directionConfig = {
  UP: {
    icon: ArrowUpRight,
    label: "Growing",
    color: "text-green-600",
  },
  FLAT: {
    icon: ArrowRight,
    label: "Stable",
    color: "text-gray-600",
  },
  DOWN: {
    icon: ArrowDownRight,
    label: "Shrinking",
    color: "text-rose-600",
  },
} as const;

type BucketConfig = {
  key: CoverageBucketKey;
  title: string;
  description: string;
  filter: (row: CustomerReportRow) => boolean;
};

type CoverageBucketKey =
  | "active"
  | "targets"
  | "prospects"
  | "healthy"
  | "immediate";

export default function AccountPulseSection({
  salesRep,
  accountPulse,
  coverage,
  portfolio,
  customers,
}: AccountPulseProps) {
  const config = directionConfig[accountPulse.direction];
  const formatCount = (value: number, decimals = 0) => formatNumber(value, decimals);
  const totalActive = portfolio.totalActive;
  const healthFocusCalculation =
    totalActive > 0
      ? `Healthy % = ${formatCount(portfolio.healthyCount)} healthy ÷ ${formatCount(totalActive)} active accounts.\nImmediate % = ${formatCount(portfolio.immediateAttentionCount)} flagged ÷ ${formatCount(totalActive)} active accounts.`
      : "No active accounts yet. Percentages start calculating after you have active customers.";

  const [bucketModal, setBucketModal] = useState<BucketConfig | null>(null);

  const coverageBuckets: Record<CoverageBucketKey, BucketConfig> = useMemo(
    () => ({
      active: {
        key: "active",
        title: "Active Accounts",
        description: "Customers who have ordered in the last 12 months.",
        filter: (row) => isActiveAccount(row),
      },
      targets: {
        key: "targets",
        title: "Target Accounts",
        description: "Prospects you are actively pursuing.",
        filter: (row) => isTargetAccount(row),
      },
      prospects: {
        key: "prospects",
        title: "Prospect Accounts",
        description: "Accounts without recent purchasing history.",
        filter: (row) => isProspectAccount(row),
      },
      healthy: {
        key: "healthy",
        title: "Recently Ordering Accounts",
        description: "Active or target accounts that have ordered within the last 45 days.",
        filter: (row) => isKeyAccount(row) && hasRecentOrder(row),
      },
      immediate: {
        key: "immediate",
        title: "Needs Attention",
        description: "Active or target accounts that have gone 45+ days without an order.",
        filter: (row) => isKeyAccount(row) && needsAttention(row),
      },
    }),
    [],
  );

  const modalCustomers = bucketModal ? filterBucket(customers, bucketModal.filter) : [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Welcome back</p>
          <h1 className="text-2xl font-semibold text-gray-900">{salesRep.name}</h1>
          <p className="text-xs text-gray-500">{salesRep.territory || "Assigned territory"}</p>
          <p className="mt-2 text-xs text-gray-400">
            This view tells you if your book is growing or slipping so you can adjust attention fast.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white ${config.color}`}>
            <config.icon className="h-6 w-6" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
              <span>Book Trend</span>
              <InfoHover
                text="Compares trailing 60-day revenue to your baseline to show whether the book is growing, flat, or shrinking."
                label="How book trend is calculated"
                align="left"
              />
            </p>
            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {config.label}
              <span className={config.color}>{`${formatCount(accountPulse.deltaPercent, 1)}%`}</span>
            </p>
            <p className="text-xs text-gray-500">{accountPulse.summary}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-slate-100 bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Coverage</span>
            <InfoHover
              text="Snapshot of how many accounts you have in Active, Target, and Prospect states."
              label="How coverage is calculated"
              align="left"
            />
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-900">
            <CoverageStat
              label="Active"
              value={coverage.active}
              onClick={() => setBucketModal(coverageBuckets.active)}
            />
            <CoverageStat
              label="Targets"
              value={coverage.targets}
              onClick={() => setBucketModal(coverageBuckets.targets)}
            />
            <CoverageStat
              label="Prospects"
              value={coverage.prospects}
              onClick={() => setBucketModal(coverageBuckets.prospects)}
            />
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-white p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>Health Focus</span>
            <InfoHover
              text={healthFocusCalculation}
              label="How health focus is calculated"
              align="left"
            />
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-900">
            <button
              type="button"
              onClick={() => setBucketModal(coverageBuckets.healthy)}
              className="group relative rounded-lg border-2 border-transparent bg-slate-50 p-3 text-left transition-all hover:border-green-400 hover:bg-green-50/50 hover:shadow-md hover:scale-[1.05] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-semibold text-gray-900 group-hover:text-green-900 transition-colors">{`${formatCount(portfolio.healthyPercent)}%`}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-green-600 transition-colors">
                    Healthy ({portfolio.healthyCount} / {portfolio.totalActive})
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-green-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => setBucketModal(coverageBuckets.immediate)}
              className="group relative rounded-lg border-2 border-transparent bg-slate-50 p-3 text-left transition-all hover:border-rose-400 hover:bg-rose-50/50 hover:shadow-md hover:scale-[1.05] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-semibold text-rose-600 group-hover:text-rose-700 transition-colors">
                    {`${formatCount(portfolio.immediateAttentionPercent)}%`}
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-rose-600 transition-colors">
                    Immediate ({portfolio.immediateAttentionCount} / {portfolio.totalActive})
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-rose-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {bucketModal ? (
        <CustomerBucketModal
          open
          title={bucketModal.title}
          description={bucketModal.description}
          customers={modalCustomers}
          onClose={() => setBucketModal(null)}
        />
      ) : null}
    </section>
  );
}

function CoverageStat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <div>
        <p className="text-2xl font-semibold text-gray-900">{formatNumber(value)}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-lg border-2 border-transparent bg-slate-50 p-3 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-md hover:scale-[1.05] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-semibold text-gray-900 group-hover:text-indigo-900 transition-colors">{formatNumber(value)}</p>
          <p className="text-xs text-gray-500 group-hover:text-indigo-600 transition-colors">{label}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-indigo-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
