'use client';

import { useState } from "react";
import type { AccountPriority } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type CustomerPrioritySelectorProps = {
  customerId: string;
  initialPriority: AccountPriority | null;
  initialManualOverride: boolean;
  autoAssignedAt: string | null;
};

const PRIORITY_OPTIONS: Array<{
  value: AccountPriority | null;
  label: string;
  description: string;
}> = [
  {
    value: "HIGH",
    label: "Priority 1 (High)",
    description: "Avg monthly revenue ≥ $2.5k or strategic logos needing weekly focus.",
  },
  {
    value: "MEDIUM",
    label: "Priority 2 (Medium)",
    description: "Roughly $1k–$2.5k per month; steady cadence accounts.",
  },
  {
    value: "LOW",
    label: "Priority 3 (Low)",
    description: "Under $1k per month. Long-tail or nurture accounts.",
  },
  {
    value: null,
    label: "Not set",
    description: "Remove the priority flag for this account.",
  },
];

const badgeClasses = (value: AccountPriority | null) => {
  switch (value) {
    case "HIGH":
      return "border-red-200 bg-red-50 text-red-700";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "LOW":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

export function CustomerPrioritySelector({
  customerId,
  initialPriority,
  initialManualOverride,
  autoAssignedAt,
}: CustomerPrioritySelectorProps) {
  const [value, setValue] = useState<AccountPriority | null>(initialPriority);
  const [manualOverride, setManualOverride] = useState(initialManualOverride);
  const [lastAutoAssignedAt, setLastAutoAssignedAt] = useState<string | null>(autoAssignedAt);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleUpdate = async (next: AccountPriority | null) => {
    if (saving || next === value || !manualOverride) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountPriority: next,
          accountPriorityManuallySet: true,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to update priority");
      }

      setValue(next);
      setManualOverride(true);
      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success("Account priority updated");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update account priority");
    } finally {
      setSaving(false);
    }
  };

  const handleManualToggle = async (next: boolean) => {
    if (saving || next === manualOverride) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/sales/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountPriorityManuallySet: next,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to update priority mode");
      }
      setManualOverride(next);
      if (!next) {
        const timestamp = new Date().toISOString();
        setLastAutoAssignedAt(timestamp);
      }
      await queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
      toast.success(next ? "Manual override enabled" : "Priority is now auto-managed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update priority mode");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Account Priority</h2>
          <p className="text-sm text-gray-500">
            Flag how often this account needs touches inside the pipeline.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(value)}`}>
          {value ? PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? value : "Not set"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-gray-900">Manual override</p>
          <p className="text-xs text-gray-500">
            {manualOverride
              ? "You control the priority for this account."
              : "Let Leora auto-manage the priority based on revenue + cadence."}
          </p>
          {!manualOverride && lastAutoAssignedAt && (
            <p className="mt-1 text-xs text-gray-400">
              Last auto assignment {new Date(lastAutoAssignedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleManualToggle(!manualOverride)}
          disabled={saving}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            manualOverride
              ? "border border-slate-300 text-slate-700 hover:bg-slate-100"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {manualOverride ? "Use auto priority" : "Enable manual control"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleUpdate(option.value)}
            disabled={saving || !manualOverride}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
              value === option.value
                ? "border-blue-400 bg-blue-50 text-blue-900 shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            } ${saving || !manualOverride ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <p className="font-semibold">{option.label}</p>
            <p className="mt-1 text-xs text-slate-500">{option.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
