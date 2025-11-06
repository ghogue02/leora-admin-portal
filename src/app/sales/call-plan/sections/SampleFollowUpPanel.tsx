"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import LogActivityButton from "@/components/shared/LogActivityButton";
import type { SampleActivityRecord } from "@/types/activities";

type SampleFollowUpPanelProps = {
  followUps: SampleActivityRecord[];
  onLogged?: () => void;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
};

export default function SampleFollowUpPanel({ followUps, onLogged }: SampleFollowUpPanelProps) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-amber-900">Sample Follow-ups</h2>
          <p className="text-sm text-amber-700">
            High-priority touchpoints tied to customer samples. Add these to your plan or log the
            outcome as you follow up.
          </p>
        </div>
        <span className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
          {followUps.length} open
        </span>
      </div>

      {followUps.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-amber-200 bg-white p-6 text-center text-sm text-amber-700">
          All caught up! No sample follow-ups are outstanding.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {followUps.map((item) => {
            const activity = item.activity;
            const customer = activity?.customer;
            const activityDate = formatDate(activity?.occurredAt ?? item.createdAt);
            const skuLabel =
              item.sku?.name ||
              item.sku?.code ||
              (item.sku?.brand ? `${item.sku.brand} sample` : "Sample");

            return (
              <li key={item.id} className="rounded-md border border-amber-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Logged {activityDate}
                      </span>
                      {activity?.activityType?.name && (
                        <span className="text-xs font-medium text-amber-600">
                          {activity.activityType.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-amber-900">
                      {activity?.subject || skuLabel}
                    </p>
                    {customer && (
                      <Link
                        href={`/sales/customers/${customer.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {customer.name}
                      </Link>
                    )}
                    {item.feedback && (
                      <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        “{item.feedback}”
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      {item.sku?.brand && <span>{item.sku.brand}</span>}
                      <span>{item.sku?.name ?? item.sku?.code ?? "Sample"}</span>
                      {item.sku?.size && <span>• {item.sku.size}</span>}
                    </div>
                    {customer && (
                      <LogActivityButton
                        customerId={customer.id}
                        variant="secondary"
                        size="sm"
                        label="Log Follow-up"
                        onSuccess={onLogged}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
