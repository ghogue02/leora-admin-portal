export type ActivityCategory = "in_person" | "electronic" | "event" | "other";

export interface ActivityTypeUiConfig {
  key: string;
  label: string;
  category: ActivityCategory;
  barColorClass: string;
  badgeClass: string;
}

const DEFAULT_KEY = "other";

const ACTIVITY_TYPE_MATCHERS: Record<string, string[]> = {
  "in-person-visit": [
    "in-person-visit",
    "in_person_visit",
    "in-person",
    "inperson",
    "visit",
    "customer-visit",
    "meeting",
    "sales-call",
    "salesmeeting",
  ],
  tasting: ["tasting", "tasting-appointment", "tasting-event", "tasting-demo"],
  "public-event": ["event", "public-event", "wine-event", "public-tasting", "festival"],
  "phone-call": ["phone-call", "call", "phone", "follow-up-phone-call", "call-follow-up"],
  email: ["email", "email-sent", "follow-up-email", "email-follow-up"],
  text: ["text", "sms", "text-message", "sms-follow-up", "text-follow-up"],
};

const ACTIVITY_TYPE_UI_CONFIGS: Record<string, ActivityTypeUiConfig> = {
  "in-person-visit": {
    key: "in-person-visit",
    label: "In-Person Visits",
    category: "in_person",
    barColorClass: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  tasting: {
    key: "tasting",
    label: "Tasting Appointments",
    category: "in_person",
    barColorClass: "bg-purple-500",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
  "public-event": {
    key: "public-event",
    label: "Events",
    category: "event",
    barColorClass: "bg-pink-500",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-300",
  },
  "phone-call": {
    key: "phone-call",
    label: "Phone Calls",
    category: "electronic",
    barColorClass: "bg-green-500",
    badgeClass: "bg-green-100 text-green-800 border-green-300",
  },
  email: {
    key: "email",
    label: "Emails",
    category: "electronic",
    barColorClass: "bg-gray-500",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
  },
  text: {
    key: "text",
    label: "Text Messages",
    category: "electronic",
    barColorClass: "bg-yellow-500",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  other: {
    key: "other",
    label: "Other Activities",
    category: "other",
    barColorClass: "bg-slate-500",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
  },
};

const ACTIVITY_TYPE_REGEX = /\[activityType:([^\]]+)\]/gi;
const OUTCOME_REGEX = /\[outcome:([a-z_-]+):([^\]]+)\]/gi;

const normalizeIdentifier = (value?: string | null) => {
  if (!value) return null;
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
};

export const getActivityTypeUiConfig = (key?: string | null): ActivityTypeUiConfig => {
  if (!key) return ACTIVITY_TYPE_UI_CONFIGS[DEFAULT_KEY];
  return ACTIVITY_TYPE_UI_CONFIGS[key] || ACTIVITY_TYPE_UI_CONFIGS[DEFAULT_KEY];
};

export const resolveActivityTypeKey = (code?: string | null, name?: string | null) => {
  const candidates = [code, name].map(normalizeIdentifier).filter(Boolean) as string[];

  for (const candidate of candidates) {
    for (const [key, matchers] of Object.entries(ACTIVITY_TYPE_MATCHERS)) {
      if (candidate === key || matchers.includes(candidate)) {
        return key;
      }
    }
  }

  return candidates[0] || DEFAULT_KEY;
};

export const resolveActivityTypeMeta = ({
  code,
  name,
}: {
  code?: string | null;
  name?: string | null;
}): ActivityTypeUiConfig & { key: string; label: string } => {
  const key = resolveActivityTypeKey(code, name);
  const config = getActivityTypeUiConfig(key);

  return {
    ...config,
    key: config.key,
    label: name?.trim() || config.label,
  };
};

export interface ParsedTaskMetadata {
  activityTypeId: string | null;
  outcomeType: string | null;
  outcomeTimestamp: string | null;
  notes: string;
}

export const parseTaskMetadata = (description?: string | null): ParsedTaskMetadata => {
  let activityTypeId: string | null = null;
  let outcomeType: string | null = null;
  let outcomeTimestamp: string | null = null;

  let notes = description || "";

  notes = notes.replace(ACTIVITY_TYPE_REGEX, (_match, id: string) => {
    if (!activityTypeId) {
      activityTypeId = id;
    }
    return "";
  });

  notes = notes.replace(OUTCOME_REGEX, (_match, type: string, timestamp: string) => {
    outcomeType = type?.toLowerCase() || null;
    outcomeTimestamp = timestamp || null;
    return "";
  });

  return {
    activityTypeId,
    outcomeType,
    outcomeTimestamp,
    notes: notes.trim(),
  };
};

export const composeTaskDescription = ({
  activityTypeId,
  outcomeType,
  outcomeTimestamp,
  notes,
}: {
  activityTypeId?: string | null;
  outcomeType?: string | null;
  outcomeTimestamp?: string | null;
  notes?: string | null;
}) => {
  const parts: string[] = [];

  if (activityTypeId) {
    parts.push(`[activityType:${activityTypeId}]`);
  }

  if (outcomeType) {
    const normalizedOutcome = outcomeType.toLowerCase();
    const timestamp = outcomeTimestamp || new Date().toISOString();
    parts.push(`[outcome:${normalizedOutcome}:${timestamp}]`);
  }

  const cleanedNotes = notes?.trim();
  if (cleanedNotes) {
    parts.push(cleanedNotes);
  }

  return parts.join(" ").trim();
};
