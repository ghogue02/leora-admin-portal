import type { PortfolioHealth } from "@/types/sales-dashboard";

type Props = {
  portfolio: PortfolioHealth;
};

export default function PortfolioHealthScore({ portfolio }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Portfolio Health Score</h2>
          <p className="text-xs text-gray-500">
            Weighted by trailing-12 revenue to keep big accounts visible.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Use this snapshot to decide whether to hunt for growth or triage slipping accounts today.
          </p>
        </div>
        <div className="flex gap-4 text-center">
          <ScoreBadge label="Revenue-weighted" value={portfolio.weightedScore} />
          <ScoreBadge label="Unweighted" value={portfolio.unweightedScore} subtle />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <BreakdownCard
          title="Healthy"
          primary={`${portfolio.healthyCount} / ${portfolio.totalActive}`}
          secondary={`${portfolio.healthyPercent.toFixed(0)}% of active customers`}
        />
        <BreakdownCard
          title="Needs Attention"
          primary={`${portfolio.immediateAttentionCount} / ${portfolio.totalActive}`}
          secondary={`${portfolio.immediateAttentionPercent.toFixed(0)}% (Down + Dormant)`}
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

function ScoreBadge({ label, value, subtle }: { label: string; value: number | null; subtle?: boolean }) {
  return (
    <div className={`rounded-md border px-4 py-3 ${subtle ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">
        {value !== null ? value.toFixed(0) : "--"}
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
