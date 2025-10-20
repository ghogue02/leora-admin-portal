'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

const CANCELABLE_STATUSES = new Set(["SUBMITTED", "PARTIALLY_FULFILLED"]);

type CancelOrderButtonProps = {
  orderId: string;
  status: string;
};

export default function CancelOrderButton({ orderId, status }: CancelOrderButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!CANCELABLE_STATUSES.has(status)) {
    return null;
  }

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Cancel this order? This will release inventory holds and stop fulfillment.",
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to cancel order.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 text-sm text-gray-600">
      {error ? (
        <p className="text-xs text-amber-600">{error}</p>
      ) : (
        <p className="text-xs text-gray-500">
          Ready to stop this order? Cancel to release inventory and notify the team.
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={submitting}
        className="inline-flex w-fit items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Canceling…" : "Cancel order"}
      </button>
    </div>
  );
}
