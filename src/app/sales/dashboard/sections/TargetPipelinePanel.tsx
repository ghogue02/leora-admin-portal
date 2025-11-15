'use client';

import { useState } from "react";
import type { TargetPipelineMetrics, CustomerReportRow } from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";
import { formatNumber } from "@/lib/format";
import { ChevronRight } from "lucide-react";
import CustomerBucketModal from "./components/CustomerBucketModal";
import { isTargetAccount, isProspectAccount } from "./customerBucketFilters";

type Props = {
  metrics: TargetPipelineMetrics;
  customers?: CustomerReportRow[];
};

export default function TargetPipelinePanel({ metrics, customers = [] }: Props) {
  const [activeBucket, setActiveBucket] = useState<'assigned' | 'turned-active' | 'visited' | null>(null);

  // Filter customers by target pipeline status
  const assignedTargets = customers.filter(c =>
    isTargetAccount(c) || isProspectAccount(c)
  );

  // Turned active = targets that have a first order in the last 30 days
  const turnedActiveTargets = assignedTargets.filter(c =>
    c.firstOrderDate &&
    new Date(c.firstOrderDate) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  // Visited = targets with any activity in the last 30 days
  const visitedTargets = assignedTargets.filter(c =>
    c.daysSinceLastActivity !== null && c.daysSinceLastActivity <= 30
  );

  const modalCustomers =
    activeBucket === 'assigned' ? assignedTargets :
    activeBucket === 'turned-active' ? turnedActiveTargets :
    activeBucket === 'visited' ? visitedTargets :
    [];

  const bucketConfig = {
    'assigned': {
      title: 'All Assigned Targets',
      description: 'All target accounts currently assigned to this rep'
    },
    'turned-active': {
      title: 'Targets Turned Active (30d)',
      description: 'Target accounts that placed their first order in the last 30 days'
    },
    'visited': {
      title: 'Targets Visited (30d)',
      description: 'Target accounts with in-person visits in the last 30 days'
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Target Pipeline</h2>
            <InfoHover
              text="Shows how assigned targets move from outreach to first order, including visits, conversions, and time-to-first-order."
              label="How target pipeline is calculated"
              align="left"
            />
          </div>
          <p className="text-xs text-gray-500">Conversion progress across all assigned targets</p>
          <p className="mt-1 text-xs text-gray-400">
            Quickly see if new logos are moving through visits toward first order or stalling out.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ClickablePipelineTile
          label="Targets Assigned"
          primary={formatNumber(metrics.assignedCount)}
          secondary="Currently owned"
          onClick={() => setActiveBucket('assigned')}
        />
        <ClickablePipelineTile
          label="Targets Turned Active (30d)"
          primary={formatNumber(metrics.turnedActiveCount)}
          secondary={`${formatNumber(metrics.turnedActivePercent, 1)}% of targets`}
          onClick={() => setActiveBucket('turned-active')}
        />
        <ClickablePipelineTile
          label="Targets Visited (30d)"
          primary={formatNumber(metrics.visitedCount)}
          secondary={`${formatNumber(metrics.visitedPercent, 1)}% with in-person touch`}
          onClick={() => setActiveBucket('visited')}
        />
        <PipelineTile
          label="TTFO Median"
          primary={formatDays(metrics.ttfoMedianDays)}
          secondary={`p75 ${formatDays(metrics.ttfoP75Days)}`}
        />
      </div>

      <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">Kaplan–Meier TTFO</p>
        <p className="text-xs text-gray-500">
          Includes targets still waiting for their first order. Use this to understand the tail on conversion time.
        </p>
        <p className="mt-2 text-lg font-semibold text-gray-900">
          {formatDays(metrics.ttfoKmMedianDays)} median days
        </p>
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

function ClickablePipelineTile({
  label,
  primary,
  secondary,
  onClick
}: {
  label: string;
  primary: string;
  secondary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-2 rounded-md border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 group-hover:text-indigo-600 transition-colors">{label}</p>
        <ChevronRight className="h-4 w-4 text-indigo-400 opacity-40 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-900 group-hover:text-indigo-900 transition-colors">{primary}</p>
      <p className="text-xs text-gray-500">{secondary}</p>
    </button>
  );
}

function PipelineTile({ label, primary, secondary }: { label: string; primary: string; secondary: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{primary}</p>
      <p className="text-xs text-gray-500">{secondary}</p>
    </div>
  );
}

function formatDays(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)}d`;
}
