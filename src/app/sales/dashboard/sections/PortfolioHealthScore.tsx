import type { PortfolioHealth } from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";
import { formatNumber } from "@/lib/format";

type Props = {
  portfolio: PortfolioHealth;
};

export default function PortfolioHealthScore({ portfolio }: Props) {
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
        <BreakdownCard
          title="Healthy"
          primary={`${formatNumber(portfolio.healthyCount)} / ${formatNumber(portfolio.totalActive)}`}
          secondary={`${formatNumber(portfolio.healthyPercent)}% of active customers`}
        />
        <BreakdownCard
          title="Needs Attention"
          primary={`${formatNumber(portfolio.immediateAttentionCount)} / ${formatNumber(portfolio.totalActive)}`}
          secondary={`${formatNumber(portfolio.immediateAttentionPercent)}% (Down + Dormant)`}
        />
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signals</p>
          <p className="text-sm text-gray-600">
            Down: {portfolio.downCount} <span className="text-gray-400">•</span> Dormant: {portfolio.dormantCount}
          </p>
        </div>
      </div>
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

function BreakdownCard({ title, primary, secondary }: { title: string; primary: string; secondary: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{primary}</p>
      <p className="text-xs text-gray-500">{secondary}</p>
    </div>
  );
}
