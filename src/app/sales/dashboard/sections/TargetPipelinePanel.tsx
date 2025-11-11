import type { TargetPipelineMetrics } from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";
import { formatNumber } from "@/lib/format";

type Props = {
  metrics: TargetPipelineMetrics;
};

export default function TargetPipelinePanel({ metrics }: Props) {
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
        <PipelineTile
          label="Targets Assigned"
          primary={formatNumber(metrics.assignedCount)}
          secondary="Currently owned"
        />
        <PipelineTile
          label="Targets Turned Active (30d)"
          primary={formatNumber(metrics.turnedActiveCount)}
          secondary={`${formatNumber(metrics.turnedActivePercent, 1)}% of targets`}
        />
        <PipelineTile
          label="Targets Visited (30d)"
          primary={formatNumber(metrics.visitedCount)}
          secondary={`${formatNumber(metrics.visitedPercent, 1)}% with in-person touch`}
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
    </section>
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
