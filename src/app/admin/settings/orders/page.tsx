"use client";

import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";

type PolicyResponse = {
  policy: {
    enforcementEnabled: boolean;
    appliedAmount: number;
    tenantAmount: number;
    source: "tenant" | "customer";
    overrideAmount: number | null;
  };
  updatedAt: string | null;
  updatedBy?: {
    id: string;
    name: string;
  };
};

const DEFAULT_AMOUNT = "200.00";
const TENANT_SLUG =
  process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ??
  process.env.NEXT_PUBLIC_TENANT_SLUG ??
  "well-crafted";

export default function OrderSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState(DEFAULT_AMOUNT);
  const [enforcementEnabled, setEnforcementEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchPolicy() {
      try {
        const response = await fetch("/api/admin/orders/minimum-order", {
          credentials: "include",
          headers: {
            ...(TENANT_SLUG ? { "X-Tenant-Slug": TENANT_SLUG } : {}),
          },
        });
        if (!response.ok) {
          throw new Error("Unable to load minimum order settings");
        }
        const data: PolicyResponse = await response.json();
        if (!isMounted) {
          return;
        }
        const amt =
          typeof data.policy?.appliedAmount === "number"
            ? data.policy.appliedAmount.toFixed(2)
            : DEFAULT_AMOUNT;
        setAmountInput(amt);
        setEnforcementEnabled(Boolean(data.policy?.enforcementEnabled));
        setUpdatedAt(data.updatedAt);
        setUpdatedBy(data.updatedBy?.name ?? null);
        setError(null);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchPolicy();
    return () => {
      isMounted = false;
    };
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (!updatedAt) return "Never updated";
    try {
      return `Updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}${
        updatedBy ? ` by ${updatedBy}` : ""
      }`;
    } catch {
      return `Updated at ${updatedAt}`;
    }
  }, [updatedAt, updatedBy]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amountInput);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError("Minimum order amount must be a positive number.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/orders/minimum-order", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(TENANT_SLUG ? { "X-Tenant-Slug": TENANT_SLUG } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          minimumOrderAmount: numericAmount,
          enforcementEnabled,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to save settings");
      }

      const data: PolicyResponse = await response.json();
      setUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setUpdatedBy(data.updatedBy?.name ?? null);
      toast.success("Minimum order policy updated");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unable to save settings";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading order settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure tenant-wide guardrails for minimum order enforcement.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">Minimum Order Enforcement</p>
            <p className="text-sm text-gray-600">
              Orders below the threshold will be routed to manager approval automatically.
            </p>
          </div>
          <Switch
            checked={enforcementEnabled}
            onCheckedChange={setEnforcementEnabled}
            aria-label="Toggle minimum order enforcement"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Minimum order amount</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <Input
                type="number"
                step="10"
                min="0"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                className="max-w-xs"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Current value displays as {formatCurrency(Number(amountInput) || 0)} to sales reps.
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">What happens when enabled?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Orders below the threshold trigger a warning for reps.</li>
              <li>Orders still submit, but they move to manager approval automatically.</li>
              <li>Approvals dashboard shows the threshold and shortfall for each violation.</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </Button>
          <p className="text-xs text-gray-500">{lastUpdatedLabel}</p>
        </div>
      </form>
    </div>
  );
}
