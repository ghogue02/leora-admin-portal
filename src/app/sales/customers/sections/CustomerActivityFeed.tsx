"use client";

import { useEffect, useState } from "react";
import { ActivityCard } from "@/components/activities/ActivityCard";

type ActivityFeedItem = {
  id: string;
  type: "order" | "activity" | "sample" | "note";
  title: string;
  subtitle: string;
  timestamp: string;
  customerId: string;
  customerName: string;
  activityTypeCode?: string;
  subject?: string;
  notes?: string | null;
  occurredAt?: string;
};

export default function CustomerActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const response = await fetch("/api/sales/customers/activity-feed", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { items: ActivityFeedItem[] };
      setItems(payload.items ?? []);
    } catch (error) {
      console.error("Failed to load activity feed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Win feed</p>
          <p className="text-xs text-slate-500">Latest touchpoints across your territory</p>
        </div>
        <button
          type="button"
          onClick={loadFeed}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Refresh
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500">No recent activity yet. Log a touchpoint to kick things off.</p>
        ) : (
          items.slice(0, 4).map((item) => (
            <ActivityCard
              key={item.id}
              activity={{
                id: item.id,
                subject: item.title,
                notes: item.subtitle,
                occurredAt: item.timestamp,
                followUpAt: null,
                outcomes: [],
                activityType: {
                  id: item.activityTypeCode ?? item.type,
                  name: getActivityTypeName(item.type),
                  code: item.activityTypeCode ?? item.type,
                },
                customer: {
                  id: item.customerId,
                  name: item.customerName,
                  accountNumber: null,
                },
                samples: [],
              }}
              variant="feed"
            />
          ))
        )}
      </div>
    </section>
  );
}

/**
 * Map feed item type to activity type name
 */
function getActivityTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    order: "Order Placed",
    activity: "Activity Logged",
    sample: "Sample Provided",
    note: "Note Added",
  };

  return typeMap[type] ?? type;
}
