/**
 * Activity type icon mapping using Lucide React icons
 * Provides consistent, accessible icons across all activity views
 */

import {
  UserCircle,
  Wine,
  Mail,
  Phone,
  MessageCircle,
  Users,
  AlertCircle,
  Calendar,
  type LucideIcon,
} from "lucide-react";

export const ACTIVITY_TYPE_ICONS: Record<string, LucideIcon> = {
  IN_PERSON_VISIT: UserCircle,
  TASTING_APPOINTMENT: Wine,
  EMAIL_FOLLOW_UP: Mail,
  PHONE_CALL: Phone,
  TEXT_MESSAGE: MessageCircle,
  PUBLIC_TASTING_EVENT: Users,
  MAJOR_CHANGE: AlertCircle,
  PORTAL_FOLLOW_UP: Calendar,
} as const;

/**
 * Get the appropriate icon component for an activity type
 */
export function getActivityIcon(typeCode: string): LucideIcon {
  return ACTIVITY_TYPE_ICONS[typeCode] ?? AlertCircle;
}

/**
 * Get icon color based on activity type
 */
export function getActivityIconColor(typeCode: string): string {
  const colorMap: Record<string, string> = {
    IN_PERSON_VISIT: "text-blue-600",
    TASTING_APPOINTMENT: "text-purple-600",
    EMAIL_FOLLOW_UP: "text-slate-600",
    PHONE_CALL: "text-green-600",
    TEXT_MESSAGE: "text-indigo-600",
    PUBLIC_TASTING_EVENT: "text-orange-600",
    MAJOR_CHANGE: "text-amber-600",
    PORTAL_FOLLOW_UP: "text-cyan-600",
  };

  return colorMap[typeCode] ?? "text-slate-600";
}

/**
 * Get background color for activity type icon container
 */
export function getActivityIconBgColor(typeCode: string): string {
  const bgColorMap: Record<string, string> = {
    IN_PERSON_VISIT: "bg-blue-50",
    TASTING_APPOINTMENT: "bg-purple-50",
    EMAIL_FOLLOW_UP: "bg-slate-50",
    PHONE_CALL: "bg-green-50",
    TEXT_MESSAGE: "bg-indigo-50",
    PUBLIC_TASTING_EVENT: "bg-orange-50",
    MAJOR_CHANGE: "bg-amber-50",
    PORTAL_FOLLOW_UP: "bg-cyan-50",
  };

  return bgColorMap[typeCode] ?? "bg-slate-50";
}
