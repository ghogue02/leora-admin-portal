"use client";

import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/format";

type Rep = {
  id: string;
  name: string;
  email: string;
  territoryName: string;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  ytdRevenue: number;
  allTimeRevenue: number;
  customersAssigned: number;
  customersActive: number;
  activitiesThisWeek: number;
  quotaAttainment: number;
};

type Props = {
  reps: Rep[];
  onRepClick: (repId: string) => void;
};

export default function AllRepsPerformance({ reps, onRepClick }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Sales Representatives Performance</h3>
        <p className="text-sm text-gray-600">Week-over-week comparison - Click rep name for details</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Rep
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Territory
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                This Month
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                YTD
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                All-Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Change
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Customers
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Activities
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Quota %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reps.map((rep) => {
              const change =
                rep.lastMonthRevenue > 0
                  ? ((rep.thisMonthRevenue - rep.lastMonthRevenue) / rep.lastMonthRevenue) * 100
                  : 0;

              return (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <button
                        onClick={() => onRepClick(rep.id)}
                        className="font-medium text-blue-600 hover:underline text-left"
                      >
                        {rep.name}
                      </button>
                      <p className="text-xs text-gray-500">{rep.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{rep.territoryName}</td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {formatCurrency(rep.thisMonthRevenue)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-blue-600">
                    {formatCurrency(rep.ytdRevenue)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                    {formatCurrency(rep.allTimeRevenue)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        change >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {change >= 0 ? "↑" : "↓"} {formatPercentage(Math.abs(change))}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <span className="font-semibold">{formatNumber(rep.customersActive)}</span> /{" "}
                    {formatNumber(rep.customersAssigned)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {formatNumber(rep.activitiesThisWeek)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        rep.quotaAttainment >= 100
                          ? "text-green-600"
                          : rep.quotaAttainment >= 80
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatPercentage(rep.quotaAttainment)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
