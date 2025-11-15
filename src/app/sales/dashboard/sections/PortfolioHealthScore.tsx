'use client';

import { useState } from "react";
import type { PortfolioHealth, CustomerReportRow } from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";
import { formatNumber } from "@/lib/format";
import { ChevronRight } from "lucide-react";
import CustomerBucketModal from "./components/CustomerBucketModal";

type Props = {
  portfolio: PortfolioHealth;
  customers?: CustomerReportRow[];
};

export default function PortfolioHealthScore({ portfolio, customers = [] }: Props) {
  const [activeBucket, setActiveBucket] = useState<'healthy' | 'needs-attention' | null>(null);

  // Filter customers by health status
  const healthyCustomers = customers.filter(c =>
    c.healthStatus === 'HEALTHY' || c.healthBucket === 'healthy'
  );

  const needsAttentionCustomers = customers.filter(c =>
    c.healthStatus === 'DOWN' || c.healthStatus === 'DORMANT' ||
    c.healthBucket === 'down' || c.healthBucket === 'dormant'
  );

  const modalCustomers = activeBucket === 'healthy'
    ? healthyCustomers
    : activeBucket === 'needs-attention'
    ? needsAttentionCustomers
    : [];

  const bucketConfig = {
    'healthy': {
      title: 'Healthy Customers',
      description: 'Customers with regular ordering patterns and engagement'
    },
    'needs-attention': {
      title: 'Customers Needing Attention',
      description: 'Customers showing down trends or dormancy signals'
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Portfolio Health Score</h2>
            <InfoHover
              text="Blends health buckets (Healthy, Down, Dormant) and weights them by trailing-12 revenue so large accounts count appropriately."
              label="How the health score is calculated"
              align="left"
            />
          </div>
          <p className="text-xs text-gray-500">
            Weighted by trailing-12 revenue to keep big accounts visible.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Use this snapshot to decide whether to hunt for growth or triage slipping accounts today.
          </p>
        </div>
        <div className="flex gap-4 text-center">
          <ScoreBadge
            label="Revenue-weighted"
            value={portfolio.weightedScore}
            hint="Weights each account's health by its trailing-12 revenue so big customers influence the score more."
          />
          <ScoreBadge
            label="Unweighted"
            value={portfolio.unweightedScore}
            hint="Simple average of each account's health classification, treating every customer equally."
            subtle
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ClickableBreakdownCard
          title="Healthy"
          primary={`${formatNumber(portfolio.healthyCount)} / ${formatNumber(portfolio.totalActive)}`}
          secondary={`${formatNumber(portfolio.healthyPercent)}% of active customers`}
          onClick={() => setActiveBucket('healthy')}
        />
        <ClickableBreakdownCard
          title="Needs Attention"
          primary={`${formatNumber(portfolio.immediateAttentionCount)} / ${formatNumber(portfolio.totalActive)}`}
          secondary={`${formatNumber(portfolio.immediateAttentionPercent)}% (Down + Dormant)`}
          onClick={() => setActiveBucket('needs-attention')}
        />
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signals</p>
          <p className="text-sm text-gray-600">
            Down: {portfolio.downCount} <span className="text-gray-400">•</span> Dormant: {portfolio.dormantCount}
          </p>
        </div>
      </div>

      {activeBucket && bucketConfig[activeBucket] ? (
        <CustomerBucketModal
          open
          title={bucketConfig[activeBucket].title}
          description={bucketConfig[activeBucket].description}
          customers={modalCustomers}
          onClose={() => setActiveBucket(null)}
        />
      ) : null}
    </section>
  );
}

function ScoreBadge({
  label,
  value,
  subtle,
  hint,
}: {
  label: string;
  value: number | null;
  subtle?: boolean;
  hint?: string;
}) {
  return (
    <div className={`rounded-md border px-4 py-3 ${subtle ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"}`}>
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
        <span>{label}</span>
        {hint ? <InfoHover text={hint} label={`${label} definition`} align="left" /> : null}
      </p>
      <p className="text-2xl font-semibold text-gray-900">
        {value !== null ? formatNumber(value) : "--"}
      </p>
    </div>
  );
}

function ClickableBreakdownCard({
  title,
  primary,
  secondary,
  onClick
}: {
  title: string;
  primary: string;
  secondary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-2 rounded-md border border-slate-100 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          View list
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{primary}</p>
      <p className="text-xs text-gray-500">{secondary}</p>
    </button>
  );
}
