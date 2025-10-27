"use client";

import { getActivityTypeUiConfig } from "@/lib/call-plan/task-metadata";

type CallPlanStatsProps = {
  callPlan: any;
};

type BreakdownEntry = {
  count: number;
  label: string;
  config: ReturnType<typeof getActivityTypeUiConfig>;
};

export default function CallPlanStats({ callPlan }: CallPlanStatsProps) {
  const breakdown = new Map<string, BreakdownEntry>();
  let totalActivities = 0;
  let completedActivities = 0;
  let inPersonAggregateCount = 0;
  let tastingEventCount = 0;
  let electronicCount = 0;

  if (callPlan?.tasks) {
    callPlan.tasks.forEach((task: any) => {
      totalActivities++;
      if (task.status === "COMPLETED") {
        completedActivities++;
      }

      const key = task.activityTypeKey || task.activityType || "other";
      const config = getActivityTypeUiConfig(key);
      const label = task.activityTypeLabel || task.activityTypeName || config.label;

      const existing = breakdown.get(config.key);
      if (existing) {
        existing.count += 1;
        if (!existing.label && label) {
          existing.label = label;
        }
      } else {
        breakdown.set(config.key, {
          count: 1,
          label,
          config,
        });
      }

      if (config.key === "in-person-visit") {
        inPersonAggregateCount += 1;
      } else if (config.key === "tasting" || config.key === "public-event") {
        inPersonAggregateCount += 1;
        tastingEventCount += 1;
      }

      if (config.key === "phone-call" || config.key === "email" || config.key === "text") {
        electronicCount += 1;
      }
    });
  }

  const safePercentage = (count: number) =>
    totalActivities > 0 ? Math.round((count / totalActivities) * 100) : 0;

  const inPersonPercentage = safePercentage(inPersonAggregateCount);
  const tastingPercentage = safePercentage(tastingEventCount);
  const electronicPercentage = safePercentage(electronicCount);
  const completionPercentage = safePercentage(completedActivities);

  const breakdownEntries = Array.from(breakdown.values())
    .map((entry) => ({
      ...entry,
      percentage: safePercentage(entry.count),
    }))
    .sort((a, b) => b.count - a.count);

  const getMinNeeded = (targetPercentage: number, currentCount: number) => {
    if (totalActivities === 0) return 0;
    const targetCount = Math.ceil((targetPercentage / 100) * totalActivities);
    return Math.max(0, targetCount - currentCount);
  };

  const getExcess = (targetPercentage: number, currentCount: number) => {
    if (totalActivities === 0) return 0;
    const maxAllowed = Math.floor((targetPercentage / 100) * totalActivities);
    return Math.max(0, currentCount - maxAllowed);
  };

  const recommendations: string[] = [];

  if (totalActivities > 0) {
    const inPersonShortfall = getMinNeeded(40, inPersonAggregateCount);
    if (inPersonPercentage < 40 && inPersonShortfall > 0) {
      recommendations.push(
        `Add ${inPersonShortfall} more in-person visit${inPersonShortfall === 1 ? "" : "s"} to reach the 40% target.`
      );
    }

    const inPersonExcess = getExcess(55, inPersonAggregateCount);
    if (inPersonPercentage > 55 && inPersonExcess > 0) {
      recommendations.push(
        `Shift ${inPersonExcess} in-person commitment${inPersonExcess === 1 ? "" : "s"} toward tastings or electronic follow-ups to keep the mix balanced.`
      );
    }

    const tastingShortfall = getMinNeeded(20, tastingEventCount);
    if (tastingPercentage < 20 && tastingShortfall > 0) {
      recommendations.push(
        `Schedule ${tastingShortfall} tasting or event${tastingShortfall === 1 ? "" : "s"} to approach the 20–30% benchmark.`
      );
    }

    const tastingExcess = getExcess(35, tastingEventCount);
    if (tastingPercentage > 35 && tastingExcess > 0) {
      recommendations.push(
        `Convert ${tastingExcess} tasting${tastingExcess === 1 ? "" : "s"} into follow-ups or in-person visits to avoid over-indexing on events.`
      );
    }

    const electronicShortfall = getMinNeeded(20, electronicCount);
    if (electronicPercentage < 20 && electronicShortfall > 0) {
      recommendations.push(
        `Add ${electronicShortfall} electronic follow-up${electronicShortfall === 1 ? "" : "s"} (email, call, or text) to stay within the 20–30% range.`
      );
    }

    const electronicExcess = getExcess(35, electronicCount);
    if (electronicPercentage > 35 && electronicExcess > 0) {
      recommendations.push(
        `Shift ${electronicExcess} electronic touch${electronicExcess === 1 ? "" : "es"} to in-person activities to maintain momentum.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Great balance — activity distribution is within the recommended ranges.");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total Activities */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-600">Total Activities</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{totalActivities}</p>
        <p className="mt-1 text-xs text-gray-500">
          {completedActivities} completed, {totalActivities - completedActivities} pending
        </p>
      </div>

      {/* Completion Rate */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
        <p className="mt-2 text-3xl font-bold text-green-600">{completionPercentage}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* In-Person Balance */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-600">In-Person Activities</p>
        <p className="mt-2 text-3xl font-bold text-blue-600">{inPersonPercentage}%</p>
        <p className="mt-1 text-xs text-gray-500">
          {inPersonAggregateCount} of {totalActivities} activities
        </p>
        <p className="mt-1 text-xs font-medium text-blue-600">
          {inPersonPercentage >= 40 ? "✓ Good balance" : "⚠ Could increase"}
        </p>
      </div>

      {/* Electronic Balance */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-600">Electronic Contact</p>
        <p className="mt-2 text-3xl font-bold text-gray-600">{electronicPercentage}%</p>
        <p className="mt-1 text-xs text-gray-500">
          {electronicCount} of {totalActivities} activities
        </p>
        <p className="mt-1 text-xs font-medium text-gray-600">
          {electronicPercentage <= 35 ? "✓ Good balance" : "⚠ Too electronic-heavy"}
        </p>
      </div>

      {/* Activity Breakdown - Full Width */}
      {totalActivities > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:col-span-4">
          <p className="mb-3 text-sm font-medium text-gray-600">Activity Type Breakdown</p>
          <div className="space-y-2">
            {breakdownEntries.map(({ config, count, label, percentage }) => (
              <div key={config.key} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-700">{label}</div>
                <div className="flex-1">
                  <div className="h-6 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${config.barColorClass} flex items-center justify-end px-2 text-white transition-all`}
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs font-medium">
                        {percentage >= 10 && `${count} (${percentage}%)`}
                      </span>
                    </div>
                  </div>
                </div>
                {percentage < 10 && (
                  <div className="w-20 text-right text-xs text-gray-600">
                    {count} ({percentage}%)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {totalActivities > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 shadow-sm md:col-span-4">
          <p className="mb-2 text-sm font-semibold text-blue-900">Activity Recommendations</p>
          <ul className="space-y-1 text-sm text-blue-800">
            {recommendations.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
