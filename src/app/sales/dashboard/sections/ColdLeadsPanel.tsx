'use client';

import { useState } from "react";
import type { ColdLeadsOverview, CustomerReportRow } from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";
import { formatNumber } from "@/lib/format";
import CustomerBucketModal from "./components/CustomerBucketModal";
import {
  filterBucket,
  isColdLead,
  isDormantToCold,
  isMinimallyServiced,
} from "./customerBucketFilters";

type Props = {
  coldLeads: ColdLeadsOverview;
  customers: CustomerReportRow[];
};

type ColdBucketKey = "minimally-serviced" | "cold-leads" | "dormant-to-cold";

const bucketConfig: Record<ColdBucketKey, { title: string; description: string }> = {
  "minimally-serviced": {
    title: "Minimally Serviced Accounts",
    description: "Active accounts without logged sales activity in the last 30 days.",
  },
  "cold-leads": {
    title: "Cold Leads",
    description: "Target accounts with no activity in 60 days.",
  },
  "dormant-to-cold": {
    title: "Dormant → Cold Accounts",
    description: "Dormant accounts with no orders or activity in 12+ months.",
  },
};

export default function ColdLeadsPanel({ coldLeads, customers }: Props) {
  const [bucket, setBucket] = useState<ColdBucketKey | null>(null);

  const modalCustomers = bucket
    ? filterBucket(
        customers,
        bucket === "minimally-serviced"
          ? isMinimallyServiced
          : bucket === "cold-leads"
            ? isColdLead
            : isDormantToCold,
      )
    : [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Cold Leads</h2>
            <InfoHover
              text="Minimally serviced = active accounts with no activity in 30 days. Cold leads = target accounts idle for 60 days. Dormant → Cold = dormant accounts with no orders or activity in 12+ months."
              label="How cold leads are calculated"
              align="left"
            />
          </div>
          <p className="text-xs text-gray-500">
            Focuses on active and target accounts that need outreach based on recent activity.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Revive a handful of these each week to keep the future pipeline healthy.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ColdBucketCard
          label="Minimally Serviced"
          value={coldLeads.minimallyServicedCount}
          description="Active accounts with no sales activity in 30 days"
          hint="Active accounts that haven't logged any sales activity in the past 30 days."
          onClick={() => setBucket("minimally-serviced")}
        />
        <ColdBucketCard
          label="Cold Leads"
          value={coldLeads.coldLeadCount}
          description="Target accounts idle for 60 days"
          hint="Target accounts without logged activity for 60+ days."
          onClick={() => setBucket("cold-leads")}
        />
        <ColdBucketCard
          label="Dormant → Cold"
          value={coldLeads.dormantToColdCount}
          description="Dormant accounts idle for 12+ months"
          tone="rose"
          hint="Dormant accounts that have gone a full year without orders or sales activity."
          onClick={() => setBucket("dormant-to-cold")}
        />
      </div>

      {coldLeads.sample.length > 0 && (
        <div className="mt-4 rounded-md border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sample Accounts</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {coldLeads.sample.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between border-b border-slate-100 py-1 last:border-b-0">
                <span className="truncate">{customer.name}</span>
                <span className="text-xs text-gray-500">
                  {customer.bucket === "MINIMALLY_SERVICED"
                    ? "No activity in 30d"
                    : customer.bucket === "COLD_LEAD"
                      ? "No activity in 60d"
                      : "No orders or activity in 12m"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {bucket ? (
        <CustomerBucketModal
          open
          title={bucketConfig[bucket].title}
          description={bucketConfig[bucket].description}
          customers={modalCustomers}
          onClose={() => setBucket(null)}
        />
      ) : null}
    </section>
  );
}

type ColdBucketCardProps = {
  label: string;
  value: number;
  description: string;
  tone?: "default" | "rose";
  hint?: string;
  onClick: () => void;
};

function ColdBucketCard({ label, value, description, tone = "default", hint, onClick }: ColdBucketCardProps) {
  const colorClasses = tone === "rose" ? "text-rose-600" : "text-gray-900";

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-100 bg-slate-50 p-4 text-center transition hover:border-slate-200 hover:bg-white"
    >
      <p className="flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span>{label}</span>
        {hint ? <InfoHover text={hint} label={`${label} definition`} align="left" /> : null}
      </p>
      <p className={`mt-2 text-4xl font-semibold ${colorClasses}`}>{formatNumber(value)}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  );
}
