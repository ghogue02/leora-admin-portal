'use client';

type WeeklyRevenueChartProps = {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
};

export default function WeeklyRevenueChart({
  currentMonthRevenue,
  lastMonthRevenue,
}: WeeklyRevenueChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const revenueChangeRaw =
    lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;
  const revenueChangePercent = revenueChangeRaw.toFixed(1);

  const maxValue = Math.max(currentMonthRevenue, lastMonthRevenue);
  const currentBarHeight = maxValue > 0 ? (currentMonthRevenue / maxValue) * 100 : 0;
  const lastBarHeight = maxValue > 0 ? (lastMonthRevenue / maxValue) * 100 : 0;

  const isPositiveChange = revenueChangeRaw >= 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Month-over-Month Revenue</h3>
          <p className="text-xs text-gray-500">Compare current month to last month</p>
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
              Last Month
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(lastMonthRevenue)}
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
              This Month
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(currentMonthRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-gray-700">
        <p>
          <span className="font-semibold">Note:</span> Revenue is recognized on delivery date,
          not order date. Showing month-to-date for current month vs. full previous month.
        </p>
      </div>
    </section>
  );
}
