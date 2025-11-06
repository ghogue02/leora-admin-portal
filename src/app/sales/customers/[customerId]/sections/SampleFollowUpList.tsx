"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock } from "lucide-react";

export type SampleFollowUpItem = {
  id: string;
  activityId: string;
  sampleListItemId: string | null;
  feedback: string;
  followUpNeeded: boolean;
  createdAt: string;
  activity: {
    id: string;
    subject: string;
    occurredAt: string;
  };
  sku: {
    id: string;
    code: string;
    name: string | null;
    brand: string | null;
    unitOfMeasure: string | null;
    size: string | null;
  } | null;
};

type SampleFollowUpListProps = {
  items: SampleFollowUpItem[];
  onComplete: (activityId: string, sampleItemId: string) => Promise<void>;
};

export default function SampleFollowUpList({ items, onComplete }: SampleFollowUpListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-900">Items for Follow-up</h2>
          <p className="text-xs text-amber-700">
            Track customer feedback that requires follow-up action. Mark items as completed once resolved.
          </p>
        </div>
        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
          {items.length} open
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const occurredAt = item.activity.occurredAt
            ? format(new Date(item.activity.occurredAt), "MMM d, yyyy h:mm a")
            : "";

          return (
            <div
              key={item.id}
              className="rounded-md border border-amber-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.sku?.name ?? "Sample item"}
                    {item.sku?.brand ? ` • ${item.sku.brand}` : ""}
                    {item.sku?.size ? ` • ${item.sku.size}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    Logged {occurredAt} • Activity: {item.activity.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.followUpNeeded && !item.sampleListItemId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <Clock className="h-3 w-3" /> Follow-up
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      setCompletingId(item.id);
                      try {
                        await onComplete(item.activityId, item.id);
                      } finally {
                        setCompletingId(null);
                      }
                    }}
                    disabled={completingId === item.id}
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {completingId === item.id ? "Completing..." : "Completed"}
                  </button>
                </div>
              </div>

              {item.feedback && (
                <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Customer Feedback</p>
                  <p className="mt-1 whitespace-pre-line">{item.feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
