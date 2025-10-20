"use client";

type SampleBudgetTrackerProps = {
  budget: {
    allowance: number;
    used: number;
    remaining: number;
    utilizationRate: number;
    month: string;
  };
};

export default function SampleBudgetTracker({ budget }: SampleBudgetTrackerProps) {
  const percentageUsed = (budget.used / budget.allowance) * 100;
  const isOverBudget = budget.used > budget.allowance;
  const isNearLimit = percentageUsed > 80 && !isOverBudget;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sample Budget</h3>
          <p className="text-sm text-gray-600">{budget.month}</p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{budget.used}</p>
          <p className="text-sm text-gray-600">of {budget.allowance} samples used</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-4 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all ${
              isOverBudget
                ? "bg-red-500"
                : isNearLimit
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          ></div>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span
            className={`font-medium ${
              isOverBudget
                ? "text-red-600"
                : isNearLimit
                ? "text-yellow-600"
                : "text-green-600"
            }`}
          >
            {percentageUsed.toFixed(0)}% used
          </span>
          <span className="text-gray-600">{budget.remaining} remaining</span>
        </div>
      </div>

      {/* Status Messages */}
      {isOverBudget && (
        <div className="mt-4 rounded-md bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            ⚠ Over budget by {budget.used - budget.allowance} samples
          </p>
        </div>
      )}

      {isNearLimit && (
        <div className="mt-4 rounded-md bg-yellow-50 p-3">
          <p className="text-sm font-medium text-yellow-800">
            ⚠ Approaching budget limit - {budget.remaining} samples remaining
          </p>
        </div>
      )}
    </div>
  );
}
