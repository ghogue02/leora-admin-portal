import type { DevCheckStatus, OperationalSnapshot } from "@/lib/observability/status";

export type HealthComponent = {
  id: string;
  label: string;
  status: DevCheckStatus;
  detail?: string;
};

export type HealthSummary = {
  status: DevCheckStatus;
  generatedAt: string;
  release: OperationalSnapshot["release"];
  components: HealthComponent[];
};

const STATUS_RANK: Record<DevCheckStatus, number> = {
  ok: 0,
  warn: 1,
  error: 2,
};

export function summarizeHealth(snapshot: OperationalSnapshot): HealthSummary {
  const components: HealthComponent[] = [];

  const dbCheck = snapshot.checks.find((check) => check.id === "database");
  if (dbCheck) {
    components.push({
      id: "database",
      label: "Database",
      status: dbCheck.status,
      detail: dbCheck.detail,
    });
  }

  const orderFlow = snapshot.checks.find((check) => check.id === "order-flow");
  if (orderFlow) {
    components.push({
      id: "order-flow",
      label: "Order flow",
      status: orderFlow.status,
      detail: orderFlow.detail,
    });
  }

  const webhook = snapshot.checks.find((check) => check.id === "webhooks");
  if (webhook) {
    components.push({
      id: "webhooks",
      label: "Webhook delivery",
      status: webhook.status,
      detail: webhook.detail,
    });
  }

  components.push(buildApprovalComponent(snapshot));
  components.push(buildBacklogComponent(snapshot));
  components.push(buildJobComponent(snapshot));
  components.push(buildUptimeComponent(snapshot));

  const status = components.reduce<DevCheckStatus>((acc, component) => {
    return STATUS_RANK[component.status] > STATUS_RANK[acc] ? component.status : acc;
  }, "ok");

  return {
    status,
    generatedAt: snapshot.generatedAt,
    release: snapshot.release,
    components,
  };
}

function buildApprovalComponent(snapshot: OperationalSnapshot): HealthComponent {
  const approvals = snapshot.workloads.approvals.value;
  const status = approvals > 50 ? "error" : approvals > 15 ? "warn" : "ok";
  return {
    id: "approvals",
    label: "Approval queue",
    status,
    detail: `${approvals} orders awaiting approval`,
  };
}

function buildBacklogComponent(snapshot: OperationalSnapshot): HealthComponent {
  const backlog = snapshot.workloads.backlog.value;
  const status = backlog > 150 ? "error" : backlog > 40 ? "warn" : "ok";
  return {
    id: "backlog",
    label: "Fulfillment backlog",
    status,
    detail: backlog > 0 ? `${backlog} orders waiting to move forward` : "All clear",
  };
}

function buildJobComponent(snapshot: OperationalSnapshot): HealthComponent {
  const successRate = snapshot.jobs.successRate.value;
  const status = successRate < 70 ? "error" : successRate < 90 ? "warn" : "ok";
  return {
    id: "jobs",
    label: "Background jobs",
    status,
    detail: `${successRate.toFixed(1)}% success in last 24h`,
  };
}

function buildUptimeComponent(snapshot: OperationalSnapshot): HealthComponent {
  const availability = snapshot.uptime.availability.value;
  const status = availability < 80 ? "error" : availability < 95 ? "warn" : "ok";
  const lastPing = snapshot.uptime.lastPing
    ? `Last ping ${timeAgo(snapshot.uptime.lastPing.checkedAt)} (${snapshot.uptime.lastPing.status})`
    : "Awaiting first ping";

  return {
    id: "uptime",
    label: "Synthetic uptime",
    status,
    detail: `${availability.toFixed(1)}% · ${lastPing}`,
  };
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = diffMs / 60000;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m ago`;
  }
  return `${(minutes / 60).toFixed(1)}h ago`;
}
