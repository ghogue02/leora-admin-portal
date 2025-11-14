'use client';

import { useState } from "react";
import { formatRelativeDate } from "@/lib/formatters";
import { ActivityCard } from "@/components/activities/ActivityCard";
import LogActivityButton from "@/components/shared/LogActivityButton";

type Activity = {
  id: string;
  type: string;
  typeCode: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcomes: string[];
  // Type-specific fields
  callDuration?: string | null;
  visitDuration?: string | null;
  attendees?: string | null;
  location?: string | null;
  changeType?: string | null;
  effectiveDate?: string | null;
  impactAssessment?: string | null;
  portalInteraction?: string | null;
  samples: Array<{
    id: string;
    skuId: string;
    sampleListItemId: string | null;
    feedback: string;
    followUpNeeded: boolean;
    followUpCompletedAt: string | null;
    sku: {
      id: string;
      code: string;
      name: string | null;
      brand: string | null;
      unitOfMeasure: string | null;
      size: string | null;
    } | null;
  }>;
  userName: string;
  relatedOrder: {
    id: string;
    orderNumber: string | null;
    orderedAt: string | null;
    total: number;
  } | null;
};

type ActivityTimelineProps = {
  activities: Activity[];
  customerId?: string;
  customerName?: string;
};

export default function ActivityTimeline({ activities, customerId, customerName }: ActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const groupedActivities = groupActivitiesByDate(activities);

  // Show only first 5 activities initially
  const displayActivities = showAll ? activities : activities.slice(0, 5);
  const hasMore = activities.length > 5;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Activity Timeline</h2>
          <p className="text-xs text-gray-500">{activities.length} activities</p>
        </div>
        {customerId && (
          <LogActivityButton
            customerId={customerId}
            contextType="customer"
            contextLabel={customerName}
            variant="secondary"
            size="sm"
            label="Log"
          />
        )}
      </div>

      {/* Timeline content */}
      {activities.length === 0 ? (
        <div className="mt-6 py-8 text-center">
          <p className="text-sm text-gray-500">No activity recorded</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {Object.entries(groupActivitiesByDate(displayActivities)).map(([date, dateActivities]) => (
            <div key={date}>
              {/* Date header */}
              <div className="mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-500">
                  {formatRelativeDate(date)}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Compact activity cards */}
              <div className="space-y-2">
                {dateActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={{
                      ...activity,
                      activityType: {
                        id: activity.typeCode,
                        name: activity.type,
                        code: activity.typeCode,
                      },
                      order: activity.relatedOrder,
                    }}
                    variant="timeline"
                    showSamples
                    showRelatedOrder
                    compact
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Show more button */}
          {!showAll && hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
            >
              Show {activities.length - 5} more activities
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Group activities by date for timeline display
 */
function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
  return activities.reduce((groups, activity) => {
    const date = new Date(activity.occurredAt).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);
}
