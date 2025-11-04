import type { CustomerRiskStatus } from "@prisma/client";

type CustomerHealthBadgeProps = {
  status: CustomerRiskStatus;
  className?: string;
};

const BADGE_STYLES: Record<CustomerRiskStatus, { bg: string; text: string; border: string; label: string; icon: string }> = {
  HEALTHY: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
    label: "Healthy",
    icon: "✓",
  },
  AT_RISK_CADENCE: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
    label: "At Risk - Cadence",
    icon: "⚠️",
  },
  AT_RISK_REVENUE: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200",
    label: "At Risk - Revenue",
    icon: "📉",
  },
  DORMANT: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
    label: "Dormant",
    icon: "💤",
  },
  CLOSED: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    label: "Closed",
    icon: "🔒",
  },
  PROSPECT: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
    label: "Prospect",
    icon: "🆕",
  },
  PROSPECT_COLD: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    label: "Cold Lead",
    icon: "❄️",
  },
};

export default function CustomerHealthBadge({ status, className = "" }: CustomerHealthBadgeProps) {
  const style = BADGE_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className="text-xs">{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
