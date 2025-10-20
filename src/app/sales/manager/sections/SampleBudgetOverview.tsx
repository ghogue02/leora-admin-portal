"use client";

export default function SampleBudgetOverview({ budgets }: { budgets: any[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Sample Budget (This Month)</h3>
      <div className="space-y-3">
        {budgets.map((budget: any) => {
          const percentage = (budget.used / budget.allowance) * 100;
          return (
            <div key={budget.repName} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium text-gray-700">{budget.repName}</div>
              <div className="flex-1">
                <div className="h-8 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full flex items-center justify-end px-3 ${
                      percentage > 100
                        ? "bg-red-500"
                        : percentage > 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  >
                    <span className="text-xs font-medium text-white">
                      {percentage >= 15 && `${budget.used}/${budget.allowance}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-24 text-right text-sm text-gray-600">
                {percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
