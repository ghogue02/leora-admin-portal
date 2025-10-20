'use client';

type WeeklyRevenueChartProps = {
  currentWeekRevenue: number;
  lastWeekRevenue: number;
  revenueChangePercent: string;
};

export default function WeeklyRevenueChart({
  currentWeekRevenue,
  lastWeekRevenue,
  revenueChangePercent,
}: WeeklyRevenueChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const maxValue = Math.max(currentWeekRevenue, lastWeekRevenue);
  const currentBarHeight = maxValue > 0 ? (currentWeekRevenue / maxValue) * 100 : 0;
  const lastBarHeight = maxValue > 0 ? (lastWeekRevenue / maxValue) * 100 : 0;

  const isPositiveChange = parseFloat(revenueChangePercent) >= 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Week-over-Week Revenue</h3>
          <p className="text-xs text-gray-500">Compare current week to last week</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPositiveChange
              ? "bg-green-100 text-green-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {isPositiveChange ? "+" : ""}
          {revenueChangePercent}%
        </span>
      </div>

      <div className="mt-6 flex items-end justify-around gap-6" style={{ height: "200px" }}>
        <div className="flex flex-1 flex-col items-center">
          <div className="w-full flex-1 flex items-end justify-center">
            <div
              className="w-full max-w-[120px] rounded-t-lg bg-slate-300 transition-all"
              style={{ height: `${lastBarHeight}%` }}
            />
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Last Week
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(lastWeekRevenue)}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center">
          <div className="w-full flex-1 flex items-end justify-center">
            <div
              className={`w-full max-w-[120px] rounded-t-lg transition-all ${
                isPositiveChange ? "bg-green-500" : "bg-rose-500"
              }`}
              style={{ height: `${currentBarHeight}%` }}
            />
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              This Week
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(currentWeekRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-gray-700">
        <p>
          <span className="font-semibold">Note:</span> Revenue is recognized on delivery date,
          not order date. Week runs Monday-Sunday.
        </p>
      </div>
    </section>
  );
}
