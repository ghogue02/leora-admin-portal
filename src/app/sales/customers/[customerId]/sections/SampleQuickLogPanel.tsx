"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SampleItemsSelector from "@/components/activities/SampleItemsSelector";
import type { ActivitySampleSelection } from "@/types/activities";
import { showError, showSuccess } from "@/lib/toast-helpers";

type SampleQuickLogPanelProps = {
  customerId: string;
  customerName: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function SampleQuickLogPanel({
  customerId,
  customerName,
}: SampleQuickLogPanelProps) {
  const [items, setItems] = useState<ActivitySampleSelection[]>([]);
  const [contextLabel, setContextLabel] = useState("");
  const [tastedDate, setTastedDate] = useState(() => todayISO());
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const selectedItems = useMemo(
    () => items.filter((item) => item.selected),
    [items],
  );

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      showError("Select at least one sample to log.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId,
        occurredAt: tastedDate ? new Date(`${tastedDate}T12:00:00`).toISOString() : undefined,
        context: contextLabel.trim() || undefined,
        items: selectedItems.map((item) => ({
          skuId: item.skuId,
          sampleListItemId: item.sampleListItemId,
          quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
          feedback: item.feedback?.trim() || undefined,
          followUp: item.followUp,
        })),
      };

      const response = await fetch("/api/sales/samples/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to log samples");
      }

      showSuccess("Samples logged", `Saved ${selectedItems.length} item(s) for ${customerName}.`);
      setItems([]);
      setContextLabel("");
      setTastedDate(todayISO());
      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    } catch (error) {
      console.error("Failed to log samples", error);
      showError(error instanceof Error ? error.message : "Failed to log samples");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Log Samples</h2>
          <p className="text-sm text-gray-600">
            Apply a saved list or pick SKUs, capture feedback, and flag follow-ups in one step.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center">
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-500">
            Sampled On
            <input
              type="date"
              value={tastedDate}
              onChange={(event) => setTastedDate(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-500">
            Visit / Context
            <input
              type="text"
              value={contextLabel}
              onChange={(event) => setContextLabel(event.target.value)}
              placeholder="e.g. Wine dinner, Thursday route"
              className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="mt-6">
        <SampleItemsSelector value={items} onChange={setItems} />
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          {selectedItems.length === 0
            ? "Select at least one sample to enable logging."
            : `${selectedItems.length} sample${selectedItems.length === 1 ? "" : "s"} ready to log.`}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || selectedItems.length === 0}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Log Samples"}
        </button>
      </div>
    </section>
  );
}
