'use client';

import { useState } from "react";

type QuickTaskModalProps = {
  customerId: string;
  customerName: string;
  onClose: () => void;
};

export default function QuickTaskModal({ customerId, customerName, onClose }: QuickTaskModalProps) {
  const [title, setTitle] = useState(`Follow up with ${customerName}`);
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/sales/customers/${customerId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          priority,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to create task");
      }

      setSuccess(true);
      setTimeout(() => {
        setSubmitting(false);
        onClose();
      }, 1200);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Unable to create task");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Create To-Do</h3>
        <p className="text-sm text-gray-500">Attach a quick reminder for {customerName}.</p>

        {error ? (
          <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
            Task created!
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Add extra context (optional)"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Due Date
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Priority
              </label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as typeof priority)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-slate-300"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
              disabled={submitting || success}
            >
              {submitting ? "Saving…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
