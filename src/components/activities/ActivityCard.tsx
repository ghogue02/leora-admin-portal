/**
 * ActivityCard - Shared component for displaying activities across different views
 * Supports multiple variants: timeline, table, feed
 */

"use client";

import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { getActivityIcon, getActivityIconColor, getActivityIconBgColor } from "@/lib/activityIcons";
import { OutcomeBadges } from "./OutcomeBadges";
import { ActivityMetadata } from "./ActivityMetadata";

type Activity = {
  id: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcomes: string[];
  activityType: {
    id: string;
    name: string;
    code: string;
  };
  // Type-specific fields
  callDuration?: string | null;
  visitDuration?: string | null;
  attendees?: string | null;
  location?: string | null;
  changeType?: string | null;
  effectiveDate?: string | null;
  impactAssessment?: string | null;
  portalInteraction?: string | null;
  // Relations
  customer?: {
    id: string;
    name: string;
    accountNumber: string | null;
  } | null;
  order?: {
    id: string;
    orderNumber: string | null;
    total: number;
  } | null;
  samples?: Array<{
    id: string;
    skuId: string;
    sampleListItemId: string | null;
    feedback: string;
    followUpNeeded: boolean;
    followUpCompletedAt: string | null;
    sku: {
      id: string;
      code: string;
      name: string | null;
      brand: string | null;
      unitOfMeasure: string | null;
      size: string | null;
    } | null;
  }>;
  userName?: string;
};

type ActivityCardProps = {
  activity: Activity;
  variant?: "timeline" | "table" | "feed";
  showCustomer?: boolean;
  showSamples?: boolean;
  showRelatedOrder?: boolean;
  compact?: boolean;
  className?: string;
};

export function ActivityCard({
  activity,
  variant = "timeline",
  showCustomer = false,
  showSamples = true,
  showRelatedOrder = true,
  compact = false,
  className = "",
}: ActivityCardProps) {
  if (variant === "table") {
    return (
      <TableVariant
        activity={activity}
        showCustomer={showCustomer}
        showSamples={showSamples}
        showRelatedOrder={showRelatedOrder}
      />
    );
  }

  if (variant === "feed") {
    return <FeedVariant activity={activity} />;
  }

  return (
    <TimelineVariant
      activity={activity}
      showSamples={showSamples}
      showRelatedOrder={showRelatedOrder}
      compact={compact}
      className={className}
    />
  );
}

/**
 * Timeline variant - used in customer detail page
 */
function TimelineVariant({
  activity,
  showSamples,
  showRelatedOrder,
  compact,
  className,
}: {
  activity: Activity;
  showSamples: boolean;
  showRelatedOrder: boolean;
  compact: boolean;
  className: string;
}) {
  const Icon = getActivityIcon(activity.activityType.code);
  const iconColor = getActivityIconColor(activity.activityType.code);
  const iconBg = getActivityIconBgColor(activity.activityType.code);
  const isMajorChange = activity.activityType.code === "MAJOR_CHANGE";

  // Compact mode: smaller, less padding
  const padding = compact ? "p-3" : "p-4";
  const iconSize = compact ? "h-8 w-8" : "h-10 w-10";
  const iconInnerSize = compact ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      id={`activity-${activity.id}`}
      className={`group rounded-lg border bg-white transition hover:border-slate-300 ${padding} ${
        isMajorChange ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
      } ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`flex flex-shrink-0 items-center justify-center rounded-full ${iconBg} ${iconSize}`}>
          <Icon className={`${iconInnerSize} ${iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Subject line with optional badge */}
              <div className="flex items-center gap-1.5">
                <h4 className={`font-semibold text-gray-900 ${compact ? "text-sm" : "text-base"}`}>
                  {activity.subject}
                </h4>
                {isMajorChange && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Major Change
                  </span>
                )}
              </div>

              {/* Meta info - only show if not compact or if userName exists */}
              {(!compact || activity.userName) && (
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                  {!compact && <span>{activity.activityType.name}</span>}
                  {activity.userName && (
                    <>
                      {!compact && <span className="text-slate-300">•</span>}
                      <span>{activity.userName}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Timestamp - more compact */}
            <div className="flex-shrink-0 text-right text-xs text-gray-500">
              <p className="font-medium">{formatDateTime(activity.occurredAt).short}</p>
              {!compact && <p className="mt-0.5 text-[11px]">{formatDateTime(activity.occurredAt).time}</p>}
            </div>
          </div>

          {/* Outcomes */}
          {activity.outcomes.length > 0 && (
            <div className="mt-1.5">
              <OutcomeBadges outcomes={activity.outcomes} size="sm" maxDisplay={compact ? 2 : undefined} />
            </div>
          )}

          {/* Type-specific metadata - hide in compact */}
          {!compact && (
            <ActivityMetadata
              typeCode={activity.activityType.code}
              callDuration={activity.callDuration}
              visitDuration={activity.visitDuration}
              attendees={activity.attendees}
              location={activity.location}
              changeType={activity.changeType}
              effectiveDate={activity.effectiveDate}
              impactAssessment={activity.impactAssessment}
              portalInteraction={activity.portalInteraction}
              className="mt-2"
            />
          )}

          {/* Notes - hide in compact */}
          {activity.notes && !compact && (
            <div className="mt-2.5 rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{activity.notes}</p>
            </div>
          )}

          {/* Samples - hide in compact */}
          {showSamples && !compact && activity.samples && activity.samples.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {activity.samples.map((sample) => (
                <div key={sample.id} className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-2">
                  <p className="text-xs font-semibold text-blue-900">
                    {sample.sku?.name ?? "Sample"}
                    {sample.sku?.brand && ` • ${sample.sku.brand}`}
                    {sample.sku?.size && ` • ${sample.sku.size}`}
                  </p>
                  {sample.feedback && (
                    <p className="mt-0.5 text-[11px] text-blue-800">{sample.feedback}</p>
                  )}
                  {sample.followUpNeeded && !sample.followUpCompletedAt && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      Follow-up needed
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Related order - compact version */}
          {showRelatedOrder && activity.order && (
            <div className={`${compact ? "mt-1.5" : "mt-2.5"} flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs`}>
              <span className="font-semibold text-emerald-700">Order:</span>
              <Link
                href={`/sales/orders/${activity.order.id}`}
                className="font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-dotted"
              >
                {formatCurrency(activity.order.total)}
              </Link>
              {!compact && activity.order.orderNumber && (
                <span className="text-[11px] text-emerald-600">#{activity.order.orderNumber}</span>
              )}
            </div>
          )}

          {/* Follow-up - hide in compact */}
          {!compact && activity.followUpAt && (
            <div className="mt-1.5 text-xs text-amber-600">
              Follow-up: {formatDateTime(activity.followUpAt).short}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Table variant - used in activities list page
 */
function TableVariant({
  activity,
  showCustomer,
  showSamples,
  showRelatedOrder,
}: {
  activity: Activity;
  showCustomer: boolean;
  showSamples: boolean;
  showRelatedOrder: boolean;
}) {
  const Icon = getActivityIcon(activity.activityType.code);
  const iconColor = getActivityIconColor(activity.activityType.code);

  return (
    <tr className="transition hover:bg-slate-50">
      {/* Activity Type */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span className="text-sm font-medium text-gray-900">{activity.activityType.name}</span>
        </div>
      </td>

      {/* Subject & Details */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-900">{activity.subject}</span>
          {activity.notes && (
            <span className="text-xs text-gray-500 line-clamp-2">{activity.notes}</span>
          )}
          {activity.followUpAt && (
            <span className="text-xs text-blue-600">
              Follow-up: {formatDateTime(activity.followUpAt).full}
            </span>
          )}
          {showSamples && activity.samples && activity.samples.length > 0 && (
            <div className="mt-1 space-y-1">
              {activity.samples.map((sample) => (
                <div key={sample.id} className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">
                    {sample.sku?.name ?? "Sample"}
                  </span>
                  {sample.feedback && <span className="ml-2 text-gray-500">"{sample.feedback}"</span>}
                  {sample.followUpNeeded && !sample.followUpCompletedAt && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Follow-up
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Customer */}
      {showCustomer && (
        <td className="px-4 py-3">
          {activity.customer ? (
            <div className="flex flex-col">
              <Link
                href={`/sales/customers/${activity.customer.id}`}
                className="font-semibold text-gray-900 underline decoration-dotted underline-offset-4 transition hover:text-blue-600"
              >
                {activity.customer.name}
              </Link>
              {activity.customer.accountNumber && (
                <span className="text-xs text-gray-500">#{activity.customer.accountNumber}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
      )}

      {/* Date & Time */}
      <td className="px-4 py-3 text-gray-700 text-sm">
        {formatDateTime(activity.occurredAt).dateTime}
      </td>

      {/* Outcome */}
      <td className="px-4 py-3">
        <OutcomeBadges outcomes={activity.outcomes} size="sm" maxDisplay={2} />
      </td>

      {/* Order Result */}
      {showRelatedOrder && (
        <td className="px-4 py-3">
          {activity.order ? (
            <div className="flex flex-col">
              <Link
                href={`/sales/orders/${activity.order.id}`}
                className="font-semibold text-emerald-600 underline decoration-dotted underline-offset-4 transition hover:text-emerald-700"
              >
                {formatCurrency(activity.order.total)}
              </Link>
              {activity.order.orderNumber && (
                <span className="text-xs text-gray-500">Order #{activity.order.orderNumber}</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
      )}
    </tr>
  );
}

/**
 * Feed variant - used in sidebar activity feed
 */
function FeedVariant({ activity }: { activity: Activity }) {
  const Icon = getActivityIcon(activity.activityType.code);
  const iconColor = getActivityIconColor(activity.activityType.code);
  const iconBg = getActivityIconBgColor(activity.activityType.code);

  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2 transition hover:border-slate-200">
      <div className={`rounded-full p-1.5 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0 text-xs">
        <p className="font-semibold text-slate-900 truncate">{activity.subject}</p>
        <p className="text-[11px] text-slate-500 truncate">{activity.activityType.name}</p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span>{formatDateTime(activity.occurredAt).time}</span>
          {activity.customer && (
            <Link
              href={`/sales/customers/${activity.customer.id}`}
              className="text-indigo-600 hover:text-indigo-800 truncate max-w-[120px]"
            >
              {activity.customer.name}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
