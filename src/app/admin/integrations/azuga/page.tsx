"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowUpRight,
  BookMarked,
  ClipboardList,
  KeyRound,
  PlugZap,
  Radio,
  SatelliteDish,
  ShieldCheck,
  ShieldOff,
  TrafficCone,
  UploadCloud,
  Webhook,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { toastError, toastSuccess } from "@/app/admin/components/Toast";

type AzugaStatus = "PENDING" | "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
type AzugaEnvironment = "production" | "sandbox";

interface AzugaSettingsResponse {
  status: AzugaStatus;
  authType: "CREDENTIALS" | "API_KEY";
  environment: AzugaEnvironment;
  username: string | null;
  hasPassword: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  webhookAuthType: string;
  webhookUrl: string | null;
  rateLimitPerMinute: number;
  isTelematicsEnabled: boolean;
  isRouteExportEnabled: boolean;
  isRouteImportEnabled: boolean;
  isWebhookEnabled: boolean;
  notes: string | null;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

interface FormState {
  username: string;
  password: string;
  apiKey: string;
  webhookSecret: string;
  webhookUrl: string;
  environment: AzugaEnvironment;
  rateLimitPerMinute: number;
  isTelematicsEnabled: boolean;
  isRouteExportEnabled: boolean;
  isRouteImportEnabled: boolean;
  isWebhookEnabled: boolean;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  username: "",
  password: "",
  apiKey: "",
  webhookSecret: "",
  webhookUrl: "",
  environment: "production",
  rateLimitPerMinute: 1,
  isTelematicsEnabled: false,
  isRouteExportEnabled: true,
  isRouteImportEnabled: false,
  isWebhookEnabled: false,
  notes: "",
};

type TestResult = {
  ok: boolean;
  status: string;
  message: string;
  timestamp: string;
};

const STATUS_THEME: Record<
  AzugaStatus,
  { label: string; badge: string; chip: string; icon: typeof ShieldCheck }
> = {
  CONNECTED: {
    label: "Connected",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    chip: "bg-emerald-50 text-emerald-800",
    icon: ShieldCheck,
  },
  CONNECTING: {
    label: "Pending Verification",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    chip: "bg-amber-50 text-amber-800",
    icon: Radio,
  },
  PENDING: {
    label: "Not Configured",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    chip: "bg-slate-50 text-slate-700",
    icon: ShieldOff,
  },
  DISCONNECTED: {
    label: "Disconnected",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    chip: "bg-gray-50 text-gray-700",
    icon: ShieldOff,
  },
  ERROR: {
    label: "Action Required",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    chip: "bg-rose-50 text-rose-800",
    icon: AlertTriangle,
  },
};

const featureToggles = [
  {
    key: "isTelematicsEnabled" as const,
    label: "Vehicle telemetry & live GPS",
    description: "Enables liveLocations polling and GPS_MESSAGE webhook ingestion.",
  },
  {
    key: "isRouteExportEnabled" as const,
    label: "Route export (orders → Azuga)",
    description: "Replaces CSV exports with direct API pushes once verified.",
  },
  {
    key: "isRouteImportEnabled" as const,
    label: "Route import (Azuga → Leora)",
    description: "Lets dispatch import optimized routes via API instead of CSV.",
  },
  {
    key: "isWebhookEnabled" as const,
    label: "Webhook listener",
    description: "Activates inbound endpoint for GPS/TRIP/ALERT events.",
  },
];

const roadmapItems = [
  {
    title: "Credential capture",
    description: "Store username/password + Webservices API key securely; required for JWT + webhook setup.",
    icon: KeyRound,
  },
  {
    title: "Token automation",
    description: "Background job fetches JWT hourly, respects 1 req/min limit, and populates IntegrationToken table.",
    icon: UploadCloud,
  },
  {
    title: "Webhook verification",
    description: "Register webhook endpoint in Azuga with shared secret, monitor retries, and log deliveries.",
    icon: Webhook,
  },
  {
    title: "Route + stop sync",
    description: "Map Azuga route IDs to DeliveryRoute/RouteStop tables for telemetry + analytics.",
    icon: ClipboardList,
  },
];

const checklistItems = [
  "Admin Azuga login with API access",
  "Webservices API Key copied from portal",
  "Dedicated webhook URL reachable over HTTPS",
  "Secret storage (ENCRYPTION_KEY set)",
  "ENVs for auth + base URLs confirmed",
];

export default function AzugaIntegrationPage() {
  const [settings, setSettings] = useState<AzugaSettingsResponse | null>(null);
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [baseline, setBaseline] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastTest, setLastTest] = useState<TestResult | null>(null);

  const statusMeta = STATUS_THEME[settings?.status ?? "PENDING"];
  const StatusIcon = statusMeta.icon;

  const lastSyncText = useMemo(() => {
    if (!settings?.lastSyncAt) {
      return "No API syncs recorded yet";
    }
    return `Last sync ${formatDistanceToNow(new Date(settings.lastSyncAt), { addSuffix: true })}`;
  }, [settings]);

  const lastConnectedText = useMemo(() => {
    if (!settings?.lastConnectedAt) {
      return "Connection has not been verified";
    }
    return `Last verified ${formatDistanceToNow(new Date(settings.lastConnectedAt), {
      addSuffix: true,
    })}`;
  }, [settings]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/integrations/azuga/settings");
      if (!response.ok) {
        throw new Error("Failed to load Azuga settings");
      }
      const data = (await response.json()) as AzugaSettingsResponse;
      setSettings(data);
      const filled = mapResponseToForm(data);
      setFormState(filled);
      setBaseline(filled);
    } catch (error) {
      console.error("Unable to load Azuga settings", error);
      toastError("Unable to load Azuga settings", "Check server logs for more detail.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleInputChange = (key: keyof FormState, value: string | number | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = buildPayload(formState);
      const response = await fetch("/api/admin/integrations/azuga/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to save settings" }));
        throw new Error(error.error || "Failed to save settings");
      }

      const data = (await response.json()) as AzugaSettingsResponse;
      setSettings(data);
      const mapped = mapResponseToForm(data);
      setFormState(mapped);
      setBaseline(mapped);
      toastSuccess("Azuga settings saved", "You can add credentials when they’re available.");
    } catch (error) {
      console.error("Failed to save Azuga settings", error);
      toastError(
        "Unable to save Azuga settings",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormState(baseline);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/admin/integrations/azuga/test", {
        method: "POST",
      });
      const data = await response.json();
      const result: TestResult = {
        ok: Boolean(data.ok),
        status: data.status ?? "unknown",
        message: data.message ?? "No response message received.",
        timestamp: new Date().toISOString(),
      };
      setLastTest(result);

      if (result.ok) {
        toastSuccess("Azuga connection ready", result.message);
      } else {
        toastError("Azuga test failed", result.message);
      }
    } catch (error) {
      console.error("Azuga test connection failed:", error);
      toastError("Azuga test failed", "Unable to reach the Azuga test endpoint.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-3 w-3 animate-ping rounded-full bg-indigo-500" />
          Loading Azuga integration settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Azuga Fleet Integration
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Configure API access & telemetry
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Store credentials securely, define rate limits, and decide when real-time GPS + route
              data flows into Leora. This page replaces the CSV-only workflow once the Azuga API is
              verified.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                statusMeta.badge,
              )}
            >
              <StatusIcon className="h-4 w-4" />
              {statusMeta.label}
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testing ? "Testing..." : "Test connection"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard
            label="Connection state"
            value={statusMeta.label}
            sublabel={lastConnectedText}
            icon={PlugZap}
            theme={statusMeta.chip}
          />
          <StatusCard
            label="Sync cadence"
            value="1 req / min per endpoint"
            sublabel={lastSyncText}
            icon={TrafficCone}
            theme="bg-blue-50 text-blue-800"
          />
          <StatusCard
            label="Credentials stored"
            value={[
              settings?.username ? "Username" : null,
              settings?.hasPassword ? "Password" : null,
              settings?.hasApiKey ? "API Key" : null,
            ]
              .filter(Boolean)
              .join(", ") || "Not captured yet"}
            sublabel="Sensitive values are encrypted with ENCRYPTION_KEY"
            icon={ShieldCheck}
            theme="bg-slate-50 text-slate-800"
          />
          {lastTest && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Last test</span>
                <span>{formatDistanceToNow(new Date(lastTest.timestamp), { addSuffix: true })}</span>
              </div>
              <p
                className={clsx(
                  "mt-2 text-base font-semibold",
                  lastTest.ok ? "text-emerald-700" : "text-rose-700",
                )}
              >
                {lastTest.status}
              </p>
              <p className="text-sm text-gray-600">{lastTest.message}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Credential storage</h2>
              <p className="text-sm text-gray-600">
                Add credentials once they arrive. Leave password/API key blank to keep the existing
                encrypted value.
              </p>
            </div>
            <Link
              href="https://developer.azuga.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
            >
              Developer portal <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Azuga username</label>
              <input
                type="text"
                value={formState.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="fleet.admin@company.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-gray-800">Azuga password</label>
                <SecretIndicator stored={settings?.hasPassword ?? false} />
              </div>
              <input
                type="password"
                value={formState.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-gray-800">Webservices API key</label>
                <SecretIndicator stored={settings?.hasApiKey ?? false} />
              </div>
              <input
                type="password"
                value={formState.apiKey}
                onChange={(e) => handleInputChange("apiKey", e.target.value)}
                placeholder="Base64 key from Admin → Users"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label className="font-medium text-gray-800">Webhook auth secret</label>
                <SecretIndicator stored={settings?.hasWebhookSecret ?? false} />
              </div>
              <input
                type="password"
                value={formState.webhookSecret}
                onChange={(e) => handleInputChange("webhookSecret", e.target.value)}
                placeholder="Shared secret for webhook verification"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">Webhook URL (optional)</label>
            <input
              type="url"
              value={formState.webhookUrl}
              onChange={(e) => handleInputChange("webhookUrl", e.target.value)}
              placeholder="https://app.leora.ai/api/azuga/webhook"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500">
              Register this URL inside Azuga once credentials are ready. Leave blank until the HTTPS
              endpoint is deployed.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Environment</label>
              <select
                value={formState.environment}
                onChange={(e) =>
                  handleInputChange("environment", e.target.value as AzugaEnvironment)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="production">Production (services.azuga.com)</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Rate limit (req / minute)</label>
              <input
                type="number"
                min={1}
                value={formState.rateLimitPerMinute}
                onChange={(e) =>
                  handleInputChange("rateLimitPerMinute", Math.max(1, Number(e.target.value) || 1))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500">
                Azuga enforces 1 request per minute per endpoint (v3 docs). Use this value to throttle
                scheduled jobs and background syncs.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">Internal notes (optional)</label>
            <textarea
              value={formState.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
              placeholder="Add handoff details, support ticket numbers, or sandbox credentials."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Revert changes
            </button>
            <p className="text-xs text-gray-500">
              Secrets are encrypted using ENCRYPTION_KEY before being written to the database.
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <SatelliteDish className="h-4 w-4 text-blue-600" />
              Feature rollout
            </div>
            <div className="space-y-4">
              {featureToggles.map((toggle) => (
                <div key={toggle.key} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{toggle.label}</p>
                    <p className="text-xs text-gray-600">{toggle.description}</p>
                  </div>
                  <Switch
                    checked={formState[toggle.key]}
                    onCheckedChange={(checked) => handleInputChange(toggle.key, checked)}
                    aria-label={`Toggle ${toggle.label}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <BookMarked className="h-4 w-4 text-indigo-600" />
              Docs & resources
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                JWT Auth endpoint: <code className="rounded bg-slate-100 px-1">https://auth.azuga.com/azuga-as/oauth2/login/oauthtoken.json</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Base API: <code className="rounded bg-slate-100 px-1">https://services.azuga.com/azuga-ws-oauth/v3/</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Docs folder: <code className="rounded bg-slate-100 px-1">/azuga-api-docs</code> in the repo
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Summary: <code className="rounded bg-slate-100 px-1">docs/azuga_api_summary.md</code>
              </li>
            </ul>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              Readiness checklist
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              {checklistItems.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <UploadCloud className="h-4 w-4 text-rose-600" />
              Implementation roadmap
            </div>
            <div className="space-y-4">
              {roadmapItems.map((item) => (
                <div key={item.title} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                  <item.icon className="h-4 w-4 text-rose-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function mapResponseToForm(data: AzugaSettingsResponse): FormState {
  return {
    username: data.username ?? "",
    password: "",
    apiKey: "",
    webhookSecret: "",
    webhookUrl: data.webhookUrl ?? "",
    environment: data.environment ?? "production",
    rateLimitPerMinute: data.rateLimitPerMinute ?? 1,
    isTelematicsEnabled: data.isTelematicsEnabled ?? false,
    isRouteExportEnabled: data.isRouteExportEnabled ?? true,
    isRouteImportEnabled: data.isRouteImportEnabled ?? false,
    isWebhookEnabled: data.isWebhookEnabled ?? false,
    notes: data.notes ?? "",
  };
}

function buildPayload(form: FormState) {
  const normalizedRate =
    Number.isFinite(form.rateLimitPerMinute) && form.rateLimitPerMinute > 0
      ? form.rateLimitPerMinute
      : 1;

  return {
    username: form.username.trim() || null,
    password: form.password.trim() || undefined,
    apiKey: form.apiKey.trim() || undefined,
    webhookSecret: form.webhookSecret.trim() || undefined,
    webhookUrl: form.webhookUrl.trim() || null,
    environment: form.environment,
    rateLimitPerMinute: normalizedRate,
    isTelematicsEnabled: form.isTelematicsEnabled,
    isRouteExportEnabled: form.isRouteExportEnabled,
    isRouteImportEnabled: form.isRouteImportEnabled,
    isWebhookEnabled: form.isWebhookEnabled,
    notes: form.notes.trim() || null,
  };
}

function StatusCard({
  label,
  value,
  sublabel,
  icon: Icon,
  theme,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: typeof PlugZap;
  theme: string;
}) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", theme)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{sublabel}</p>
    </div>
  );
}

function SecretIndicator({ stored }: { stored: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        stored ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      )}
    >
      {stored ? "Stored" : "Missing"}
    </span>
  );
}
