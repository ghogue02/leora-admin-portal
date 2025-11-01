'use client';

import { useState } from "react";
import { useToast } from "../../_components/ToastProvider";

export function FlagDuplicateButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!notes.trim()) {
      pushToast({
        title: "Add a note",
        description: "Let the admin team know which account this should merge with.",
        tone: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/portal/customers/${customerId}/flag-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to flag duplicate");
      }

      pushToast({
        title: "Flag submitted",
        description: `${customerName} is in the duplicate review queue.`,
        tone: "success",
      });
      setOpen(false);
      setNotes("");
    } catch (error) {
      pushToast({
        title: "Flag failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center rounded-md border border-red-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
      >
        Flag duplicate
      </button>

      {open ? (
        <div className="absolute z-10 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <p className="text-xs text-gray-600">
              Let the admin team know which account this should merge with and why.
            </p>
            <div>
              <label htmlFor="duplicate-notes" className="mb-1 block text-xs font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="duplicate-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-gray-800 shadow-sm focus:border-slate-500 focus:outline-none"
                placeholder="Example: Merge with Zoe's Steak & Seafood (account #1234)."
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-slate-300"
                onClick={() => {
                  setOpen(false);
                  setNotes("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
