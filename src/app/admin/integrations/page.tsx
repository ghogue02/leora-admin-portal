"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlugZap, Radio, ArrowRightCircle, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AzugaSettingsSummary = {
  status: "PENDING" | "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
  isConfigured: boolean;
  lastSyncAt: string | null;
};

const DEFAULT_SUMMARY: AzugaSettingsSummary = {
  status: "PENDING",
  isConfigured: false,
  lastSyncAt: null,
};

const STATUS_BADGE: Record<
  AzugaSettingsSummary["status"],
  { label: string; className: string }
> = {
  CONNECTED: { label: "Connected", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CONNECTING: { label: "Pending Verification", className: "bg-amber-100 text-amber-800 border-amber-200" },
  PENDING: { label: "Not Configured", className: "bg-slate-100 text-slate-700 border-slate-200" },
  DISCONNECTED: { label: "Disconnected", className: "bg-gray-100 text-gray-700 border-gray-200" },
  ERROR: { label: "Action Required", className: "bg-rose-100 text-rose-800 border-rose-200" },
};

export default function AdminIntegrationsPage() {
  const [azugaSummary, setAzugaSummary] = useState<AzugaSettingsSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/integrations/azuga/settings");
        if (!response.ok) {
          throw new Error("Failed to load Azuga settings");
        }
        const data = await response.json();
        if (!isMounted) return;

        setAzugaSummary({
          status: data.status ?? "PENDING",
          isConfigured: Boolean(data.username || data.hasPassword || data.hasApiKey),
          lastSyncAt: data.lastSyncAt ?? null,
        });
      } catch (error) {
        console.error("Unable to load Azuga integration summary", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const statusMeta = STATUS_BADGE[azugaSummary.status];
  const lastSyncCopy = azugaSummary.lastSyncAt
    ? `Last sync ${formatDistanceToNow(new Date(azugaSummary.lastSyncAt), { addSuffix: true })}`
    : "No syncs recorded yet";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Integrations</p>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Connect and Monitor External Platforms
          </h1>
        </div>
        <p className="max-w-3xl text-sm text-gray-600">
          Configure fleet, marketing, and productivity integrations from a single place. Use these
          controls to capture credentials, verify connectivity, and stage upcoming sync jobs before
          granting access to the broader team.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <Link
          href="/admin/integrations/azuga"
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <PlugZap className="h-5 w-5" />
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
            >
              {loading ? "Checking..." : statusMeta.label}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Azuga Fleet API</h2>
          <p className="mt-2 text-sm text-gray-600">
            Capture credentials, enforce rate limits, and stage webhook endpoints for route telemetry
            ingestion. This replaces the CSV upload / download workflow once fully enabled.
          </p>
          <dl className="mt-4 grid gap-3 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-500" />
              <span>{lastSyncCopy}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-slate-500" />
              {azugaSummary.isConfigured ? (
                <span>Credentials captured – finish verification to enable sync</span>
              ) : (
                <span>Credentials not yet stored</span>
              )}
            </div>
          </dl>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            Configure Azuga
            <ArrowRightCircle className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </Link>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Upcoming integrations
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">Mailchimp, Calendar, & More</h2>
          <p className="mt-2 text-sm text-gray-600">
            Existing integrations continue to live inside their dedicated workspaces (Sales →
            Marketing for Mailchimp, Sales → Settings for calendar auth). They&apos;ll be migrated
            into this cockpit after the Azuga rollout.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              Mailchimp OAuth & audience syncing controls
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              Google / Outlook calendar token health with auto-refresh
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
              Twilio + Mapbox API key rotation schedule
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
