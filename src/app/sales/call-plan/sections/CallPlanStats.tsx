"use client";

type CallPlanStatsProps = {
  callPlan: any;
};

export default function CallPlanStats({ callPlan }: CallPlanStatsProps) {
  // Calculate activity type breakdown
  const activityBreakdown: Record<string, number> = {};
  let totalActivities = 0;
  let completedActivities = 0;

  if (callPlan?.tasks) {
    callPlan.tasks.forEach((task: any) => {
      totalActivities++;
      if (task.status === "COMPLETED") {
        completedActivities++;
      }

      const activityType = task.activityType || "other";
      activityBreakdown[activityType] = (activityBreakdown[activityType] || 0) + 1;
    });
  }

  // Calculate in-person percentage
  const inPersonCount =
    (activityBreakdown["in-person-visit"] || 0) + (activityBreakdown["tasting"] || 0);
  const electronicCount =
    (activityBreakdown["email"] || 0) +
    (activityBreakdown["phone-call"] || 0) +
    (activityBreakdown["text"] || 0);

  const inPersonPercentage = totalActivities > 0 ? (inPersonCount / totalActivities) * 100 : 0;
  const electronicPercentage = totalActivities > 0 ? (electronicCount / totalActivities) * 100 : 0;
  const completionPercentage =
    totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

  const getActivityTypeLabel = (code: string) => {
    const labels: Record<string, string> = {
      "in-person-visit": "In-Person Visits",
      tasting: "Tastings",
      "phone-call": "Phone Calls",
      email: "Emails",
      text: "Text Messages",
      "public-event": "Public Events",
    };
    return labels[code] || code;
  };

  const getActivityTypeColor = (code: string) => {
    const colors: Record<string, string> = {
      "in-person-visit": "bg-blue-500",
      tasting: "bg-purple-500",
      "phone-call": "bg-green-500",
      email: "bg-gray-500",
      text: "bg-yellow-500",
      "public-event": "bg-pink-500",
    };
    return colors[code] || "bg-gray-500";
  };

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
        <p className="mt-2 text-3xl font-bold text-green-600">
          {completionPercentage.toFixed(0)}%
        </p>
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
        <p className="mt-2 text-3xl font-bold text-blue-600">
          {inPersonPercentage.toFixed(0)}%
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {inPersonCount} of {totalActivities} activities
        </p>
        <p className="mt-1 text-xs font-medium text-blue-600">
          {inPersonPercentage >= 40 ? "✓ Good balance" : "⚠ Could increase"}
        </p>
      </div>

      {/* Electronic Balance */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-600">Electronic Contact</p>
        <p className="mt-2 text-3xl font-bold text-gray-600">
          {electronicPercentage.toFixed(0)}%
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {electronicCount} of {totalActivities} activities
        </p>
        <p className="mt-1 text-xs font-medium text-gray-600">
          {electronicPercentage <= 40 ? "✓ Good balance" : "⚠ Too electronic-heavy"}
        </p>
      </div>

      {/* Activity Breakdown - Full Width */}
      {totalActivities > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:col-span-4">
          <p className="mb-3 text-sm font-medium text-gray-600">Activity Type Breakdown</p>
          <div className="space-y-2">
            {Object.entries(activityBreakdown).map(([type, count]) => {
              const percentage = (count / totalActivities) * 100;
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700">
                    {getActivityTypeLabel(type)}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full ${getActivityTypeColor(type)} flex items-center justify-end px-2 transition-all`}
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-medium text-white">
                          {percentage >= 10 && `${count} (${percentage.toFixed(0)}%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {percentage < 10 && (
                    <div className="w-20 text-right text-xs text-gray-600">
                      {count} ({percentage.toFixed(0)}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
