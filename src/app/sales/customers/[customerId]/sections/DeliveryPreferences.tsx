"use client";

import type { DeliveryWindow } from "@/types/customer";

type DeliveryPreferencesProps = {
  deliveryInstructions: string | null;
  deliveryWindows: DeliveryWindow[];
  paymentMethod: string | null;
  deliveryMethod: string | null;
  warehouseLocation: string | null;
};

function formatWindow(window: DeliveryWindow): string {
  switch (window.type) {
    case "BEFORE":
      return `Before ${window.time}`;
    case "AFTER":
      return `After ${window.time}`;
    case "BETWEEN":
      return `Between ${window.startTime} – ${window.endTime}`;
    default:
      return "Custom window";
  }
}

export function DeliveryPreferences({
  deliveryInstructions,
  deliveryWindows,
  paymentMethod,
  deliveryMethod,
  warehouseLocation,
}: DeliveryPreferencesProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Delivery Preferences</h2>
          <p className="text-xs text-gray-500">Reference this before drop-offs or route adjustments.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Instructions</p>
          <p className="mt-2 text-sm text-gray-800">
            {deliveryInstructions?.trim() ? deliveryInstructions : "No special instructions recorded."}
          </p>
        </article>

        <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Windows</p>
          {deliveryWindows?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-800">
              {deliveryWindows.map((window, index) => (
                <li key={`${window.type}-${index}`}>{formatWindow(window)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-800">Flexible / anytime delivery.</p>
          )}
        </article>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Method</p>
          <p className="mt-2 text-sm text-gray-900">{paymentMethod || "Not set"}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery Method</p>
          <p className="mt-2 text-sm text-gray-900">{deliveryMethod || "Not set"}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Warehouse Source</p>
          <p className="mt-2 text-sm text-gray-900">{warehouseLocation || "Not set"}</p>
        </div>
      </div>
    </section>
  );
}
