import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { UnlovedAccountsSummary, UnlovedAccount } from "@/types/sales-dashboard";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const bucketStyles: Record<string, string> = {
  HIGH: "border-red-200 bg-red-50",
  MEDIUM: "border-amber-200 bg-amber-50",
  LOW: "border-emerald-200 bg-emerald-50",
  NONE: "border-slate-200 bg-slate-50",
};

type UnlovedAccountsProps = {
  data: UnlovedAccountsSummary;
};

function AccountRow({ account }: { account: UnlovedAccount }) {
  const lastLovedCopy = account.lastLovedAt
    ? `${formatDistanceToNow(new Date(account.lastLovedAt), { addSuffix: true })}`
    : "No visit/order logged";

  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs">
      <div className="min-w-0">
        <Link
          href={`/sales/customers/${account.id}`}
          className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-700"
        >
          {account.name}
        </Link>
        <p className="text-slate-500">{lastLovedCopy}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold text-slate-900">
          {currency.format(Math.round(account.avgMonthlyRevenue))}
        </p>
        <p className="text-[11px] text-slate-500">avg monthly</p>
      </div>
    </li>
  );
}

export default function UnlovedAccounts({ data }: UnlovedAccountsProps) {
  const totalUnloved = data.buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Due for Outreach
          </p>
          <h2 className="text-xl font-semibold text-slate-900">“Unloved” Accounts by Priority</h2>
          <p className="text-sm text-slate-500">
            Accounts without an order or in-person activity within the priority threshold.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          <div className="text-right">
            <p>Updated {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}</p>
            <Link
              href="/sales/customers?unloved=true"
              className="mt-1 inline-flex items-center text-[11px] font-semibold text-blue-700 hover:text-blue-900"
            >
              View all due accounts
            </Link>
          </div>
        </div>
      </div>

      {totalUnloved === 0 ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          🎉 All priority accounts have recent orders or visits. Great work!
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {data.buckets.map((bucket) => (
            <div
              key={bucket.priority}
              className={`flex flex-col rounded-2xl border px-4 py-5 ${bucketStyles[bucket.priority] ?? "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {bucket.label}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">{bucket.count}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Threshold</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {bucket.thresholdDays} days
                  </p>
                  {bucket.count > 0 && (
                    <Link
                      href={`/sales/customers?unloved=true${bucket.priority !== "NONE" ? `&priority=${bucket.priority}` : ""}`}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                    >
                      View list
                    </Link>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Potential monthly revenue:{" "}
                <span className="font-semibold text-slate-900">
                  {currency.format(Math.round(bucket.potentialMonthlyRevenue))}
                </span>
              </p>

              <div className="mt-4 flex-1">
                {bucket.accounts.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    All accounts for this bucket have recent visits or orders.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {bucket.accounts.map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
