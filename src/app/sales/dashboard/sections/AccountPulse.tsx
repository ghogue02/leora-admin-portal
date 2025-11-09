import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type {
  AccountPulse as AccountPulseMetrics,
  CustomerCoverage,
  PortfolioHealth,
} from "@/types/sales-dashboard";

type AccountPulseProps = {
  salesRep: {
    name: string;
    territory: string | null;
  };
  accountPulse: AccountPulseMetrics;
  coverage: CustomerCoverage;
  portfolio: PortfolioHealth;
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

export default function AccountPulseSection({ salesRep, accountPulse, coverage, portfolio }: AccountPulseProps) {
  const config = directionConfig[accountPulse.direction];

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
            <p className="text-xs uppercase tracking-wide text-gray-500">Book Trend</p>
            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {config.label}
              <span className={config.color}>{accountPulse.deltaPercent.toFixed(1)}%</span>
            </p>
            <p className="text-xs text-gray-500">{accountPulse.summary}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Coverage</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-900">
            <CoverageStat label="Active" value={coverage.active} />
            <CoverageStat label="Targets" value={coverage.targets} />
            <CoverageStat label="Prospects" value={coverage.prospects} />
            <CoverageStat label="Unassigned" value={coverage.unassigned} />
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Health Focus</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-900">
            <div>
              <p className="text-2xl font-semibold text-gray-900">{portfolio.healthyPercent.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Healthy ({portfolio.healthyCount} / {portfolio.totalActive})
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-rose-600">
                {portfolio.immediateAttentionPercent.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                Immediate ({portfolio.immediateAttentionCount} / {portfolio.totalActive})
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoverageStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
