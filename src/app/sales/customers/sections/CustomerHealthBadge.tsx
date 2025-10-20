import type { CustomerRiskStatus } from "@prisma/client";

type CustomerHealthBadgeProps = {
  status: CustomerRiskStatus;
  className?: string;
};

const BADGE_STYLES: Record<CustomerRiskStatus, { bg: string; text: string; label: string }> = {
  HEALTHY: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Healthy",
  },
  AT_RISK_CADENCE: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "At Risk (Cadence)",
  },
  AT_RISK_REVENUE: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "At Risk (Revenue)",
  },
  DORMANT: {
    bg: "bg-rose-100",
    text: "text-rose-700",
    label: "Dormant",
  },
  CLOSED: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Closed",
  },
};

export default function CustomerHealthBadge({ status, className = "" }: CustomerHealthBadgeProps) {
  const style = BADGE_STYLES[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
}
