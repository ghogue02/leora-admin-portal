'use client';

import { format } from "date-fns";

type Activity = {
  id: string;
  type: string;
  typeCode: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcome: string | null;
  userName: string;
  relatedOrder: {
    id: string;
    orderedAt: string | null;
    total: number;
  } | null;
};

type ActivityTimelineProps = {
  activities: Activity[];
};

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const getActivityIcon = (typeCode: string) => {
    switch (typeCode) {
      case "IN_PERSON_VISIT":
        return "👤";
      case "TASTING_APPOINTMENT":
        return "🍷";
      case "EMAIL_FOLLOW_UP":
        return "📧";
      case "PHONE_CALL":
        return "📞";
      case "TEXT_MESSAGE":
        return "💬";
      case "PUBLIC_TASTING_EVENT":
        return "🎉";
      default:
        return "📋";
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;

    switch (outcome) {
      case "SUCCESS":
        return (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            Success
          </span>
        );
      case "PENDING":
        return (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
            Failed
          </span>
        );
      case "NO_RESPONSE":
        return (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            No Response
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Activity Timeline
          </h2>
          <p className="text-xs text-gray-500">
            Chronological history of visits and interactions
          </p>
        </div>
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          {activities.length} Activities
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-gray-500">No activity history recorded</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="relative rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                  {getActivityIcon(activity.typeCode)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {activity.subject}
                        </h4>
                        {getOutcomeBadge(activity.outcome)}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {activity.type} - {activity.userName}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{format(new Date(activity.occurredAt), "MMM d, yyyy")}</p>
                      <p className="mt-1">
                        {format(new Date(activity.occurredAt), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  {activity.notes && (
                    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-sm text-gray-900">{activity.notes}</p>
                    </div>
                  )}

                  {activity.relatedOrder && (
                    <div className="mt-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-green-900">
                        Order Generated:
                      </span>
                      <span className="text-green-700">
                        {formatCurrency(activity.relatedOrder.total)}
                      </span>
                      {activity.relatedOrder.orderedAt && (
                        <span className="text-xs text-green-600">
                          on{" "}
                          {format(
                            new Date(activity.relatedOrder.orderedAt),
                            "MMM d, yyyy"
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {activity.followUpAt && (
                    <div className="mt-2 text-xs text-amber-600">
                      Follow-up scheduled:{" "}
                      {format(new Date(activity.followUpAt), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
