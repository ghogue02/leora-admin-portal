"use client";

import Link from "next/link";

type Rep = {
  id: string;
  name: string;
  email: string;
  territoryName: string;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  customersAssigned: number;
  customersActive: number;
  activitiesThisWeek: number;
  quotaAttainment: number;
};

export default function AllRepsPerformance({ reps }: { reps: Rep[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Sales Representatives Performance</h3>
        <p className="text-sm text-gray-600">Week-over-week comparison</p>
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
                This Week
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Last Week
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
                rep.lastWeekRevenue > 0
                  ? ((rep.thisWeekRevenue - rep.lastWeekRevenue) / rep.lastWeekRevenue) * 100
                  : 0;

              return (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{rep.name}</p>
                      <p className="text-xs text-gray-500">{rep.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{rep.territoryName}</td>
                  <td className="px-6 py-4 text-right font-semibold">
                    ${rep.thisWeekRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    ${rep.lastWeekRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-sm font-medium ${
                        change >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <span className="font-semibold">{rep.customersActive}</span> /{" "}
                    {rep.customersAssigned}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">{rep.activitiesThisWeek}</td>
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
                      {rep.quotaAttainment.toFixed(0)}%
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
