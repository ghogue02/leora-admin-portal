"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen, PhoneCall, CalendarClock, Sparkles } from "lucide-react";

type ActivityFeedItem = {
  id: string;
  type: "order" | "activity" | "sample" | "note";
  title: string;
  subtitle: string;
  timestamp: string;
  customerId: string;
  customerName: string;
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

  const renderIcon = (type: ActivityFeedItem["type"]) => {
    switch (type) {
      case "activity":
        return <PhoneCall className="h-4 w-4" aria-hidden="true" />;
      case "sample":
        return <Sparkles className="h-4 w-4" aria-hidden="true" />;
      case "note":
        return <NotebookPen className="h-4 w-4" aria-hidden="true" />;
      default:
        return <CalendarClock className="h-4 w-4" aria-hidden="true" />;
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
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

      <div className="mt-3 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-500">No recent activity yet. Log a touchpoint to kick things off.</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2">
              <div className="rounded-full bg-indigo-50 p-2 text-indigo-700">
                {renderIcon(item.type)}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <Link
                    href={`/sales/customers/${item.customerId}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {item.customerName}
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
