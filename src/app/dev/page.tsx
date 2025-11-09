import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink as ExternalLinkIcon,
  Minus,
  Server,
  ServerCog,
} from "lucide-react";
import { requireServerAdminContext } from "@/lib/auth/server-admin";
import { prisma } from "@/lib/prisma";
import {
  getOperationalSnapshot,
  type ActivityHighlight,
  type DevCheck,
  type DevMetric,
  type HealthPingSummary,
  type JobRunHighlight,
  type JobRunSummary,
  type ResourceMetric,
  type SyntheticJourney,
} from "@/lib/observability/status";
import { summarizeHealth } from "@/lib/observability/health-summary";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { TenantSwitcher } from "./TenantSwitcher";
import { IncidentAckButton } from "./IncidentAckButton";

export const dynamic = "force-dynamic";

const DEFAULT_RUNBOOK_URL = "https://github.com/ghogue02/leora-admin-portal/blob/main/docs/oauth/PRODUCTION_DEPLOYMENT.md";
const RUNBOOK_URL = process.env.OBSERVABILITY_RUNBOOK_URL ?? DEFAULT_RUNBOOK_URL;

const statusStyles = {
  ok: {
    icon: CheckCircle2,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  warn: {
    icon: AlertTriangle,
    classes: "border-amber-200 bg-amber-50 text-amber-700",
  },
  error: {
    icon: AlertTriangle,
    classes: "border-rose-200 bg-rose-50 text-rose-700",
  },
} as const;

type StatusKey = keyof typeof statusStyles;

type DevPageSearchParams = {
  tenant?: string | string[];
};

export default async function DevOpsConsolePage({
  searchParams,
}: {
  searchParams?: Promise<DevPageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedTenant = resolvedSearchParams?.tenant;
  const requestedTenantSlug = Array.isArray(requestedTenant)
    ? requestedTenant[0]
    : requestedTenant ?? undefined;

  const adminContext = await requireServerAdminContext({ tenantSlug: requestedTenantSlug });
  if (!adminContext) {
    redirect("/sales/auth/login?redirect=/dev");
  }

  const snapshot = await getOperationalSnapshot({
    tenantId: adminContext.tenantId,
    tenantSlug: adminContext.tenantSlug,
  });
  const healthSummary = summarizeHealth(snapshot);
  const generatedRelative = formatDistanceToNow(new Date(snapshot.generatedAt), { addSuffix: true });
  const shortCommit = snapshot.release.commitSha?.slice(0, 7);
  const environmentLabel = snapshot.release.environment ?? "development";

  const tenantOptions = await prisma.tenant.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  if (!tenantOptions.some((option) => option.slug === adminContext.tenantSlug)) {
    tenantOptions.unshift({ slug: adminContext.tenantSlug, name: adminContext.tenantSlug });
  }

  const repoInfo = getRepoInfo();

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Operational Overview</p>
            <h1 className="mt-1 text-3xl font-semibold text-gray-900">Run State</h1>
            <p className="mt-2 text-sm text-gray-500">Refreshed {generatedRelative}</p>
          </div>
          <div className="flex w-full flex-col gap-4 text-sm text-gray-500 md:w-auto">
            <div>
              <p className="font-medium text-gray-700">Signed in as {adminContext.user.name}</p>
              <p>{adminContext.user.email}</p>
              <p className="mt-2 font-mono text-xs text-gray-400">
                {environmentLabel} · {shortCommit ?? "local"}
              </p>
            </div>
            <div className="w-full min-w-[200px] md:w-60">
              <TenantSwitcher tenants={tenantOptions} currentSlug={adminContext.tenantSlug} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renderReleaseBadge("Environment", snapshot.release.environment ?? "unknown")}
          {snapshot.release.commitRef && renderReleaseBadge("Branch", snapshot.release.commitRef)}
          {snapshot.release.commitMessage && renderReleaseBadge("Last Commit", snapshot.release.commitMessage)}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <AccessCard
            roles={adminContext.roles}
            sessionType={adminContext.sessionType}
            permissions={Array.from(adminContext.permissions)}
          />
          <ReleaseLinks release={snapshot.release} repo={repoInfo} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Live checks" description="Supabase · order flow · webhooks" />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {snapshot.checks.map((check) => (
              <StatusCard key={check.id} check={check} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionHeader title="API health" description="Structured response from /api/health" />
            <HealthStatusBadge status={healthSummary.status} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {healthSummary.components.map((component) => (
              <StatusCard key={component.id} check={component} />
            ))}
          </div>
        </section>
      </div>

      

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Performance" description="Request throughput & revenue" />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MetricCard metric={snapshot.performance.throughput} emphasis="count" compact />
            <MetricCard metric={snapshot.performance.revenue} emphasis="currency" compact />
            <MetricCard metric={snapshot.performance.averageOrderValue} emphasis="currency" compact />
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Workload" description="Queues that can block fulfillment" />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MetricCard metric={snapshot.workloads.approvals} emphasis="count" compact />
            <MetricCard metric={snapshot.workloads.backlog} emphasis="count" compact />
            <MetricCard metric={snapshot.workloads.openTasks} emphasis="count" compact />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Customer engagement" description="Signals that customers are active" />
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MetricCard metric={snapshot.engagement.activeCustomers} emphasis="count" compact />
            <MetricCard metric={snapshot.engagement.activities} emphasis="count" compact />
            <MetricCard metric={snapshot.engagement.portalLogins} emphasis="count" compact />
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Resource usage" description="Crude throughput + storage proxies" />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {snapshot.resources.map((metric) => (
              <ResourceCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Synthetic journeys" description="Order fetch · portal logins · replay" />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {snapshot.journeys.map((journey) => (
              <StatusCard
                key={journey.id}
                check={{
                  id: journey.id,
                  label: journey.label,
                  status: journey.status,
                  detail: journey.detail,
                }}
              />
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader title="Uptime" description="Synthetic monitoring via Supabase + Better Uptime" />
          <div className="mt-3 grid gap-3">
            <MetricCard metric={snapshot.uptime.availability} emphasis="percentage" compact />
            <PingCard ping={snapshot.uptime.lastPing} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Latest changes</h2>
            <span className="text-sm text-gray-500">Audit trail · 6h lookback</span>
          </div>
          <AuditList items={snapshot.incidents.auditHighlights} />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Incidents</h2>
            <IncidentTable pings={snapshot.uptime.recentPings.slice(0, 6)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quick links</h2>
            <div className="mt-3 space-y-3">
              {snapshot.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-start justify-between rounded-xl border border-gray-200 p-3 text-left transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{link.label}</p>
                    <p className="text-xs text-gray-500">{link.description}</p>
                  </div>
                  <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section>
        <SectionHeader title="Background jobs" description="Job runner success and recent executions" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MetricCard metric={snapshot.jobs.successRate} emphasis="percentage" />
          <MetricCard metric={snapshot.jobs.averageDuration} />
        </div>
        <JobRunList runs={snapshot.jobs.recentRuns} />
        <JobSummaryTable summaries={snapshot.jobs.perJob} />
      </section>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ServerCog className="h-5 w-5 text-gray-300" />
    </div>
  );
}

function renderReleaseBadge(label: string, value: string) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function AccessCard({
  roles,
  sessionType,
  permissions,
}: {
  roles: string[];
  sessionType: string;
  permissions: string[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">Access</p>
      <p className="mt-1 text-sm text-gray-600">Session: {sessionType}</p>
      <p className="mt-1 text-sm text-gray-600">Roles: {roles.join(", ") || "none"}</p>
      <p className="mt-1 text-xs text-gray-500">
        Permissions: {permissions.slice(0, 6).join(", ")}
        {permissions.length > 6 ? ` +${permissions.length - 6}` : ""}
      </p>
    </div>
  );
}

type RepoInfo = { owner: string; repo: string } | null;

function getRepoInfo(): RepoInfo {
  const repoEnv = process.env.GITHUB_REPOSITORY;
  const owner = process.env.VERCEL_GIT_REPO_OWNER ?? (repoEnv ? repoEnv.split("/")[0] : null);
  const repo = process.env.VERCEL_GIT_REPO_SLUG ?? (repoEnv ? repoEnv.split("/")[1] : null);
  if (owner && repo) {
    return { owner, repo };
  }
  return null;
}

function ReleaseLinks({
  release,
  repo,
}: {
  release: OperationalSnapshot["release"];
  repo: RepoInfo;
}) {
  const commitUrl = release.commitSha && repo
    ? `https://github.com/${repo.owner}/${repo.repo}/commit/${release.commitSha}`
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">Runbook & GitHub</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {commitUrl && (
          <Link
            href={commitUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
          >
            View commit ({release.commitSha?.slice(0, 7)})
          </Link>
        )}
        <Link
          href={RUNBOOK_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:border-gray-300"
        >
          Open runbook
        </Link>
      </div>
    </div>
  );
}

function StatusCard({ check }: { check: DevCheck }) {
  const style = statusStyles[check.status as StatusKey];
  const Icon = style.icon;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${style.classes}`}>
        <Icon className="h-4 w-4" />
        {check.label}
      </span>
      <p className="mt-3 text-sm text-gray-600">{check.detail ?? "No detail provided"}</p>
    </div>
  );
}

function HealthStatusBadge({ status }: { status: DevCheck["status"] }) {
  const palette: Record<DevCheck["status"], { label: string; classes: string }> = {
    ok: { label: "Healthy", classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    warn: { label: "Degraded", classes: "bg-amber-100 text-amber-700 border-amber-200" },
    error: { label: "Critical", classes: "bg-rose-100 text-rose-700 border-rose-200" },
  };
  const style = palette[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${style.classes}`}>
      <Server className="h-4 w-4" />
      {style.label}
    </span>
  );
}

function ResourceCard({ metric }: { metric: ResourceMetric }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {metric.unit === "MB"
          ? `${metric.value.toFixed(1)} ${metric.unit}`
          : formatNumber(metric.value)}
      </p>
      {metric.helperText && <p className="text-xs text-gray-500">{metric.helperText}</p>}
    </div>
  );
}

function MiniStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      {helper && <p className="text-xs text-gray-400">{helper}</p>}
    </div>
  );
}

type MetricEmphasis = "currency" | "count" | "percentage";

function MetricCard({
  metric,
  emphasis = "count",
  compact,
}: {
  metric: DevMetric;
  emphasis?: MetricEmphasis;
  compact?: boolean;
}) {
  const value = formatMetricValue(metric, emphasis);
  const change = metric.changePercent;
  const trend = metric.trend;

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${compact ? "p-4" : "p-5"} shadow-sm`}>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{metric.label}</span>
        {change != null && (
          <TrendChip trend={trend} value={change} />
        )}
      </div>
      <p className={`mt-2 font-semibold text-gray-900 ${compact ? "text-2xl" : "text-3xl"}`}>{value}</p>
      {metric.helperText && (
        <p className="mt-1 text-sm text-gray-500">{metric.helperText}</p>
      )}
    </div>
  );
}

function formatMetricValue(metric: DevMetric, emphasis: MetricEmphasis) {
  if (emphasis === "currency") {
    return formatCurrency(metric.value);
  }

  if (emphasis === "percentage" || metric.unit === "%") {
    return `${metric.value.toFixed(1)}%`;
  }

  if (metric.unit === "ms") {
    if (metric.value >= 1000) {
      return `${(metric.value / 1000).toFixed(1)}s`;
    }
    return `${formatNumber(metric.value)}ms`;
  }

  return formatNumber(metric.value);
}

function TrendChip({ trend, value }: { trend: DevMetric["trend"]; value: number }) {
  const Icon = trend === "down" ? ArrowDownRight : trend === "up" ? ArrowUpRight : Minus;
  const color = trend === "down" ? "text-rose-600" : trend === "up" ? "text-emerald-600" : "text-gray-500";
  const formatted = `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <Icon className="h-4 w-4" />
      {formatted}
    </span>
  );
}

function AuditList({ items }: { items: ActivityHighlight[] }) {
  const formatted = formatAuditItems(items);
  if (formatted.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
        No audit activity logged in the last six hours.
      </div>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-gray-100">
      {formatted.map((activity) => (
        <li key={activity.id} className="flex items-center gap-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
            <Activity className="h-5 w-5 text-gray-400" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
            <p className="text-xs text-gray-500">{activity.entityType} · {activity.userName ?? "system"}</p>
          </div>
          <p className="text-xs text-gray-400">{activity.relativeTime}</p>
        </li>
      ))}
    </ul>
  );
}

function formatAuditItems(items: ActivityHighlight[]) {
  return items.map((item) => ({
    ...item,
    relativeTime: formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }),
  }));
}

function PingCard({ ping }: { ping?: HealthPingSummary }) {
  if (!ping) {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">Last synthetic ping</p>
        <p className="mt-2 text-sm text-gray-500">No pings logged yet. Configure the Supabase cron job to record checks.</p>
      </div>
    );
  }

  const statusLabel = ping.status === "UP" ? "Healthy" : ping.status === "DEGRADED" ? "Degraded" : "Down";
  const statusClasses = ping.status === "UP"
    ? "text-emerald-700 bg-emerald-50"
    : ping.status === "DEGRADED"
      ? "text-amber-700 bg-amber-50"
      : "text-rose-700 bg-rose-50";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Server className="h-4 w-4 text-gray-400" />
        Synthetic /api/health
      </div>
      <p className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
        {statusLabel}
      </p>
      <p className="mt-4 text-2xl font-semibold text-gray-900">
        {ping.responseTimeMs != null ? `${ping.responseTimeMs}ms` : "—"}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Checked {formatDistanceToNow(new Date(ping.checkedAt), { addSuffix: true })}
      </p>
      {ping.detail && (
        <p className="mt-2 text-xs text-gray-400">{ping.detail}</p>
      )}
    </div>
  );
}

function JobRunList({ runs }: { runs: JobRunHighlight[] }) {
  if (runs.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
        No job activity recorded in the last 24 hours.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Finished</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {runs.map((run) => (
            <tr key={run.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{run.jobName}</td>
              <td className="px-4 py-3">
                <JobStatusBadge status={run.status} />
                {run.errorMessage && (
                  <p className="mt-1 text-xs text-rose-600">{run.errorMessage}</p>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">{formatDuration(run.durationMs)}</td>
              <td className="px-4 py-3 text-gray-500">
                {run.finishedAt
                  ? formatDistanceToNow(new Date(run.finishedAt), { addSuffix: true })
                  : "Running"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobSummaryTable({ summaries }: { summaries: JobRunSummary[] }) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Schedule</th>
            <th className="px-4 py-3">Success %</th>
            <th className="px-4 py-3">Avg duration</th>
            <th className="px-4 py-3">Last run</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {summaries.map((summary) => (
            <tr key={summary.jobName} className={summary.overdue ? "bg-rose-50" : undefined}>
              <td className="px-4 py-3 font-medium text-gray-900">{summary.jobName}</td>
              <td className="px-4 py-3 text-gray-700">
                {summary.owner ?? "—"}
                {summary.contact && (
                  <p className="text-xs text-gray-500">{summary.contact}</p>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">
                {summary.schedule ?? "—"}
                {summary.overdue && (
                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    Overdue
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">{summary.successRate.toFixed(1)}%</td>
              <td className="px-4 py-3 text-gray-700">{formatDuration(summary.averageDurationMs)}</td>
              <td className="px-4 py-3 text-gray-500">
                {summary.lastRunAt
                  ? formatDistanceToNow(new Date(summary.lastRunAt), { addSuffix: true })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobStatusBadge({ status }: { status: JobRunHighlight["status"] }) {
  const styles = status === "SUCCESS"
    ? "bg-emerald-50 text-emerald-700"
    : status === "RUNNING"
      ? "bg-sky-50 text-sky-700"
      : "bg-rose-50 text-rose-700";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {status.toLowerCase()}
    </span>
  );
}

function formatDuration(durationMs?: number | null) {
  if (!durationMs) {
    return "—";
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  return `${durationMs}ms`;
}

function IncidentTable({ pings }: { pings: HealthPingSummary[] }) {
  if (pings.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No synthetic pings recorded yet.</p>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Detail</th>
            <th className="px-4 py-3">Checked</th>
            <th className="px-4 py-3">Ack</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pings.map((ping, idx) => (
            <tr key={`${ping.checkedAt}-${idx}`}>
              <td className="px-4 py-3">
                <JobStatusBadge status={ping.status === "UP" ? "SUCCESS" : ping.status === "DOWN" ? "FAILED" : "RUNNING"} />
              </td>
              <td className="px-4 py-3 text-xs text-gray-600">{ping.detail ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {formatDistanceToNow(new Date(ping.checkedAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {ping.status === "UP" ? "—" : ping.acknowledgedAt ? (
                  <span>Ack’d {formatDistanceToNow(new Date(ping.acknowledgedAt), { addSuffix: true })}</span>
                ) : ping.id ? (
                  <IncidentAckButton pingId={ping.id} />
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
