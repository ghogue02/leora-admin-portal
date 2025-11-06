"use client";

import { format } from "date-fns";
import { ORDER_USAGE_LABELS } from "@/constants/orderUsage";

type BtgPlacement = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  supplierName: string | null;
  totalUnits: number;
  orderCount: number;
  recentUnits: number;
  averageMonthlyUnits: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  isActivePlacement: boolean;
};

export default function BtgPlacements({ placements }: { placements: BtgPlacement[] }) {
  if (!placements || placements.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">BTG Placements</h2>
            <p className="text-xs text-gray-500">
              Track {ORDER_USAGE_LABELS.BTG} orders captured on recent transactions.
            </p>
          </div>
        </header>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          No BTG placements have been logged for this customer yet.
        </div>
      </section>
    );
  }

  const activePlacements = placements.filter((placement) => placement.isActivePlacement);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">BTG Placements</h2>
          <p className="text-xs text-gray-500">
            {ORDER_USAGE_LABELS.BTG} · High-velocity placements that impact forecasting.
          </p>
        </div>
        <span className="text-xs font-medium text-gray-500">
          {activePlacements.length} active placement{activePlacements.length === 1 ? "" : "s"}
        </span>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Product
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Supplier / Category
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                Total Units
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                Avg Units / Month
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                Last 90 Days
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                First BTG
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Last BTG
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {placements.map((placement) => (
              <tr key={placement.skuId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{placement.productName}</div>
                  <div className="text-xs text-gray-500">
                    {placement.skuCode}
                    {placement.brand ? ` • ${placement.brand}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {placement.supplierName ?? "—"}
                  <div className="text-gray-400">
                    {placement.category ?? "Uncategorized"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {placement.totalUnits.toLocaleString()}
                  <div className="text-xs text-gray-500">
                    {placement.orderCount} order{placement.orderCount === 1 ? "" : "s"}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {placement.averageMonthlyUnits.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {placement.recentUnits.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {placement.firstOrderDate
                    ? format(new Date(placement.firstOrderDate), "MMM d, yyyy")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {placement.lastOrderDate
                    ? format(new Date(placement.lastOrderDate), "MMM d, yyyy")
                    : "—"}
                  {placement.daysSinceLastOrder !== null && (
                    <div className="text-xs text-gray-400">
                      {placement.daysSinceLastOrder} days ago
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {placement.isActivePlacement ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      Dormant
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
