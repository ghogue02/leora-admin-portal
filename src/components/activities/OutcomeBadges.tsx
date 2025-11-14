/**
 * OutcomeBadges - Shared component for displaying activity outcomes
 * Consolidates badge rendering logic across all activity views
 */

import { ACTIVITY_OUTCOME_OPTIONS, type ActivityOutcomeValue } from "@/constants/activityOutcomes";

type OutcomeBadgesProps = {
  outcomes: string[];
  size?: "sm" | "md";
  maxDisplay?: number;
  className?: string;
};

export function OutcomeBadges({ outcomes, size = "md", maxDisplay, className = "" }: OutcomeBadgesProps) {
  if (!outcomes.length) return null;

  // Create label mapping
  const labelMap = ACTIVITY_OUTCOME_OPTIONS.reduce<Record<string, string>>((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

  // Handle truncation if maxDisplay is set
  const displayed = maxDisplay ? outcomes.slice(0, maxDisplay) : outcomes;
  const remaining = maxDisplay && outcomes.length > maxDisplay ? outcomes.length - maxDisplay : 0;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {displayed.map((outcome) => (
        <span
          key={outcome}
          className={`inline-flex items-center rounded-full bg-blue-50 font-semibold text-blue-700 ${sizeClasses[size]}`}
        >
          {labelMap[outcome] ?? outcome}
        </span>
      ))}
      {remaining > 0 && (
        <span className={`text-slate-500 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
          +{remaining} more
        </span>
      )}
    </div>
  );
}

/**
 * Individual outcome badge component for more granular control
 */
type OutcomeBadgeProps = {
  outcome: string;
  label?: string;
  size?: "sm" | "md";
};

export function OutcomeBadge({ outcome, label, size = "md" }: OutcomeBadgeProps) {
  const displayLabel = label ?? ACTIVITY_OUTCOME_OPTIONS.find((opt) => opt.value === outcome)?.label ?? outcome;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
  };

  // Color variations based on outcome type
  const colorClasses = getOutcomeColor(outcome);

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]} ${colorClasses}`}>
      {displayLabel}
    </span>
  );
}

/**
 * Get color classes based on outcome type
 */
function getOutcomeColor(outcome: string): string {
  const colorMap: Record<string, string> = {
    RECEIVED_ORDER: "bg-emerald-50 text-emerald-700",
    SCHEDULED_NEXT_APPOINTMENT: "bg-blue-50 text-blue-700",
    FOLLOW_UP_REQUIRED: "bg-amber-50 text-amber-700",
    CUSTOMER_NOT_INTERESTED: "bg-slate-100 text-slate-600",
    IMPROPER_FIT: "bg-slate-100 text-slate-600",
    DECISION_MAKER_UNAVAILABLE: "bg-orange-50 text-orange-700",
  };

  return colorMap[outcome] ?? "bg-blue-50 text-blue-700";
}
