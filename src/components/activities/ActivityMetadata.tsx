/**
 * ActivityMetadata - Display type-specific metadata fields for activities
 * Shows conditional information based on activity type
 */

import { Clock, MapPin, Users, AlertTriangle, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

type ActivityMetadataProps = {
  typeCode: string;
  callDuration?: string | null;
  visitDuration?: string | null;
  attendees?: string | null;
  location?: string | null;
  changeType?: string | null;
  effectiveDate?: string | null;
  impactAssessment?: string | null;
  portalInteraction?: string | null;
  className?: string;
};

export function ActivityMetadata({
  typeCode,
  callDuration,
  visitDuration,
  attendees,
  location,
  changeType,
  effectiveDate,
  impactAssessment,
  portalInteraction,
  className = "",
}: ActivityMetadataProps) {
  // Don't render if no metadata to show
  const hasMetadata =
    callDuration ||
    visitDuration ||
    attendees ||
    location ||
    changeType ||
    effectiveDate ||
    impactAssessment ||
    portalInteraction;

  if (!hasMetadata) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Phone call metadata */}
      {typeCode === "PHONE_CALL" && callDuration && (
        <MetadataBadge icon={Clock} label={callDuration} variant="info" />
      )}

      {/* Visit metadata */}
      {typeCode === "IN_PERSON_VISIT" && (
        <>
          {visitDuration && <MetadataBadge icon={Clock} label={visitDuration} variant="info" />}
          {location && <MetadataBadge icon={MapPin} label={location} variant="info" />}
          {attendees && <MetadataBadge icon={Users} label={attendees} variant="info" />}
        </>
      )}

      {/* Event metadata */}
      {typeCode === "PUBLIC_TASTING_EVENT" && (
        <>
          {location && <MetadataBadge icon={MapPin} label={location} variant="info" />}
          {attendees && <MetadataBadge icon={Users} label={attendees} variant="info" />}
        </>
      )}

      {/* Major change metadata */}
      {typeCode === "MAJOR_CHANGE" && (
        <>
          {changeType && (
            <MetadataBadge
              icon={AlertTriangle}
              label={formatChangeType(changeType)}
              variant="warning"
            />
          )}
          {effectiveDate && (
            <MetadataBadge
              icon={Calendar}
              label={`Effective: ${formatDateTime(effectiveDate).short}`}
              variant="warning"
            />
          )}
          {impactAssessment && (
            <MetadataBadge
              label={`Impact: ${impactAssessment}`}
              variant={getImpactVariant(impactAssessment)}
            />
          )}
        </>
      )}

      {/* Portal interaction metadata */}
      {typeCode === "PORTAL_FOLLOW_UP" && portalInteraction && (
        <MetadataBadge label={formatPortalInteraction(portalInteraction)} variant="info" />
      )}
    </div>
  );
}

/**
 * Individual metadata badge component
 */
type MetadataBadgeProps = {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "info" | "warning" | "success" | "error";
};

function MetadataBadge({ icon: Icon, label, variant = "info" }: MetadataBadgeProps) {
  const variantClasses = {
    info: "bg-slate-100 text-slate-700 border-slate-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${variantClasses[variant]}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

/**
 * Format change type for display
 */
function formatChangeType(changeType: string): string {
  const labels: Record<string, string> = {
    OWNERSHIP: "Ownership Change",
    MANAGEMENT: "Management Change",
    LICENSE: "License Change",
    LOCATION: "Location Change",
    CONTACT: "Contact Change",
  };

  return labels[changeType] ?? changeType;
}

/**
 * Format portal interaction for display
 */
function formatPortalInteraction(interaction: string): string {
  const labels: Record<string, string> = {
    VIEWED_CATALOG: "Viewed Catalog",
    SUBMITTED_ORDER: "Submitted Order",
    UPDATED_PROFILE: "Updated Profile",
    REQUESTED_SAMPLES: "Requested Samples",
  };

  return labels[interaction] ?? interaction;
}

/**
 * Get badge variant based on impact level
 */
function getImpactVariant(impact: string): "info" | "warning" | "error" {
  switch (impact) {
    case "HIGH":
      return "error";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "info";
  }
}
