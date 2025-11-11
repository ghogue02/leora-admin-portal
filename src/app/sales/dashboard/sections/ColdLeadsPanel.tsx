import type { ColdLeadsOverview } from "@/types/sales-dashboard";
import { InfoHover } from "@/components/InfoHover";

type Props = {
  coldLeads: ColdLeadsOverview;
};

export default function ColdLeadsPanel({ coldLeads }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Cold Leads</h2>
            <InfoHover
              text="Counts targets or prospects with no orders (or 24+ months idle) and no logged outreach in the past 30 days."
              label="How cold leads are calculated"
              align="left"
            />
          </div>
          <p className="text-xs text-gray-500">
            Targets or prospects with no orders (or 24+ months inactive) and no activity in the last 30 days.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Revive a handful of these each week to keep the future pipeline healthy.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Cold Leads</p>
          <p className="mt-2 text-4xl font-semibold text-gray-900">{coldLeads.count}</p>
          <p className="text-xs text-gray-500">Need fresh outreach</p>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dormant → Cold</p>
          <p className="mt-2 text-4xl font-semibold text-rose-600">{coldLeads.dormantToColdCount}</p>
          <p className="text-xs text-gray-500">Once-active accounts now stale</p>
        </div>
      </div>

      {coldLeads.sample.length > 0 && (
        <div className="mt-4 rounded-md border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sample Accounts</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {coldLeads.sample.map((customer) => (
              <li key={customer.id} className="flex items-center justify-between border-b border-slate-100 py-1 last:border-b-0">
                <span className="truncate">{customer.name}</span>
                <span className="text-xs text-gray-500">No activity in 30d</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
