"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface AutomationStatus {
  pendingFollowUps: number;
  withoutTask: number;
  overdueWithoutTask: number;
  lastTaskCreatedAt: string | null;
}

interface AutomationResult {
  tenantsProcessed: number;
  samplesScanned: number;
  tasksCreated: number;
  skippedMissingOwner: number;
}

export default function SampleFollowUpAutomationAdminPage() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/samples/follow-ups", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load automation status");
      }
      const data = (await response.json()) as { status: AutomationStatus };
      setStatus(data.status);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/samples/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to run automation");
      }
      const data = (await response.json()) as { result: AutomationResult };
      setResult(data.result);
      await loadStatus();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Automation failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Automation</p>
            <h1 className="text-2xl font-bold text-gray-900">Sample Follow-up Tasks</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor the auto-task generator and trigger it manually when needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRun}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Running..." : "Run Automation"}
            </button>
            <button
              onClick={() => void loadStatus()}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {result && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-semibold">Automation completed</p>
            <p className="mt-1">
              {result.tasksCreated.toLocaleString()} tasks created, scanned {result.samplesScanned.toLocaleString()} samples across {result.tenantsProcessed} tenants.
            </p>
            {result.skippedMissingOwner > 0 && (
              <p className="mt-1 text-amber-800">
                {result.skippedMissingOwner} samples were skipped because their sales reps do not have portal accounts.
              </p>
            )}
          </div>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          label="Pending Follow-ups"
          value={status?.pendingFollowUps ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          loading={loading}
        />
        <StatusCard
          label="Needs Task"
          value={status?.withoutTask ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          loading={loading}
        />
        <StatusCard
          label="Overdue Without Task"
          value={status?.overdueWithoutTask ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          loading={loading}
        />
        <StatusCard
          label="Last Task Created"
          value={status?.lastTaskCreatedAt ? new Date(status.lastTaskCreatedAt).toLocaleString() : "—"}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          loading={loading}
        />
      </section>
    </main>
  );
}

type StatusCardProps = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  loading: boolean;
};

function StatusCard({ label, value, icon, loading }: StatusCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-slate-100 p-2">{icon}</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {loading ? "…" : typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}
