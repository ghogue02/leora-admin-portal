/**
 * Activity Type Field Configuration
 *
 * Defines conditional fields, validation rules, and UI behavior for each activity type.
 */

export type ActivityTypeFieldConfig = {
  // Field visibility
  showCallDuration?: boolean;
  showVisitDuration?: boolean;
  showAttendees?: boolean;
  showLocation?: boolean;
  showChangeType?: boolean;
  showEffectiveDate?: boolean;
  showImpactAssessment?: boolean;
  showPortalInteraction?: boolean;
  showSamples?: boolean;
  samplesExpandedByDefault?: boolean;
  showOutcomes?: boolean;

  // Validation rules
  requireNotes?: boolean;
  notesMinLength?: number;
  charLimit?: number;

  // Auto-population
  suggestedFollowUpDays?: number;
  autoSubject?: string; // Template string with ${customerName}

  // Custom outcomes (if defined, use these instead of default outcomes)
  customOutcomes?: Array<{
    value: string;
    label: string;
  }>;
};

export const ACTIVITY_TYPE_FIELDS: Record<string, ActivityTypeFieldConfig> = {
  'email': {
    showSamples: false,
    requireNotes: false,
    suggestedFollowUpDays: 3,
    autoSubject: 'Email to ${customerName}',
    customOutcomes: [
      { value: 'EMAIL_SENT', label: 'Email Sent' },
      { value: 'RESPONSE_RECEIVED', label: 'Response Received' },
      { value: 'INTERESTED', label: 'Customer Interested' },
      { value: 'NOT_INTERESTED', label: 'Not Interested' },
      { value: 'BOUNCED', label: 'Email Bounced' },
    ],
  },
  'call': {
    showCallDuration: true,
    requireNotes: true,
    showSamples: true,
    samplesExpandedByDefault: false,
    suggestedFollowUpDays: 7,
    autoSubject: 'Phone call with ${customerName}',
    customOutcomes: [
      { value: 'SPOKE_WITH_DM', label: 'Spoke with Decision Maker' },
      { value: 'LEFT_VOICEMAIL', label: 'Left Voicemail' },
      { value: 'NO_ANSWER', label: 'No Answer' },
      { value: 'INTERESTED', label: 'Customer Interested' },
      { value: 'NOT_INTERESTED', label: 'Not Interested' },
      { value: 'ORDER_PLACED', label: 'Order Placed' },
    ],
  },
  'text': {
    showSamples: false,
    requireNotes: false,
    charLimit: 500,
    autoSubject: 'Text message to ${customerName}',
    customOutcomes: [
      { value: 'MESSAGE_SENT', label: 'Message Sent' },
      { value: 'REPLY_RECEIVED', label: 'Reply Received' },
      { value: 'INTERESTED', label: 'Customer Interested' },
      { value: 'UNSUBSCRIBE_REQUESTED', label: 'Unsubscribe Requested' },
    ],
  },
  'visit': {
    showVisitDuration: true,
    showAttendees: true,
    showLocation: true,
    showSamples: true,
    samplesExpandedByDefault: true,
    requireNotes: true,
    suggestedFollowUpDays: 7,
    customOutcomes: [
      { value: 'POSITIVE_MEETING', label: 'Positive Meeting' },
      { value: 'NEEDS_FOLLOWUP', label: 'Needs Follow-up' },
      { value: 'DECISION_PENDING', label: 'Decision Pending' },
      { value: 'ORDER_PLACED', label: 'Order Placed' },
      { value: 'SAMPLES_DELIVERED', label: 'Samples Delivered' },
      { value: 'ISSUES_DISCUSSED', label: 'Issues Discussed' },
    ],
  },
  'MAJOR_CHANGE': {
    showChangeType: true,
    showEffectiveDate: true,
    showImpactAssessment: true,
    requireNotes: true,
    notesMinLength: 50,
    showSamples: false,
    showOutcomes: false, // Use changeType instead
  },
  'tasting': {
    showLocation: true,
    showAttendees: true,
    showSamples: true,
    samplesExpandedByDefault: true,
    requireNotes: true,
    suggestedFollowUpDays: 3,
    customOutcomes: [
      { value: 'HIGH_INTEREST', label: 'High Interest' },
      { value: 'ORDERS_PLACED', label: 'Orders Placed' },
      { value: 'SAMPLES_DISTRIBUTED', label: 'Samples Distributed' },
      { value: 'FEEDBACK_COLLECTED', label: 'Feedback Collected' },
      { value: 'FOLLOWUP_REQUESTED', label: 'Follow-up Requested' },
    ],
  },
  'event': {
    showLocation: true,
    showAttendees: true,
    showSamples: true,
    samplesExpandedByDefault: true,
    requireNotes: true,
    suggestedFollowUpDays: 3,
    customOutcomes: [
      { value: 'WELL_ATTENDED', label: 'Well Attended' },
      { value: 'HIGH_INTEREST', label: 'High Interest' },
      { value: 'ORDERS_PLACED', label: 'Orders Placed' },
      { value: 'SAMPLES_DISTRIBUTED', label: 'Samples Distributed' },
    ],
  },
  'portal.follow-up': {
    showPortalInteraction: true,
    showSamples: false,
    autoSubject: 'Portal activity follow-up',
    customOutcomes: [
      { value: 'CATALOG_VIEWED', label: 'Catalog Viewed' },
      { value: 'ORDER_SUBMITTED', label: 'Order Submitted' },
      { value: 'PROFILE_UPDATED', label: 'Profile Updated' },
    ],
  },
};

/**
 * Duration options for calls
 */
export const CALL_DURATION_OPTIONS = [
  { value: '<5min', label: 'Less than 5 minutes' },
  { value: '5-15min', label: '5-15 minutes' },
  { value: '15-30min', label: '15-30 minutes' },
  { value: '30min+', label: '30+ minutes' },
];

/**
 * Duration options for visits
 */
export const VISIT_DURATION_OPTIONS = [
  { value: '<30min', label: 'Less than 30 minutes' },
  { value: '30min-1hr', label: '30 minutes - 1 hour' },
  { value: '1-2hr', label: '1-2 hours' },
  { value: '2hr+', label: '2+ hours' },
];

/**
 * Change type options for major changes
 */
export const CHANGE_TYPE_OPTIONS = [
  { value: 'OWNERSHIP', label: 'Change in Ownership' },
  { value: 'MANAGEMENT', label: 'Management Change' },
  { value: 'LICENSE', label: 'License Change' },
  { value: 'LOCATION', label: 'Location Change' },
  { value: 'CONTACT', label: 'Primary Contact Change' },
  { value: 'BUSINESS_MODEL', label: 'Business Model Change' },
  { value: 'OTHER', label: 'Other Major Change' },
];

/**
 * Impact assessment options
 */
export const IMPACT_ASSESSMENT_OPTIONS = [
  { value: 'HIGH', label: 'High Impact' },
  { value: 'MEDIUM', label: 'Medium Impact' },
  { value: 'LOW', label: 'Low Impact' },
];

/**
 * Portal interaction types
 */
export const PORTAL_INTERACTION_OPTIONS = [
  { value: 'VIEWED_CATALOG', label: 'Viewed Catalog' },
  { value: 'SUBMITTED_ORDER', label: 'Submitted Order' },
  { value: 'PROFILE_UPDATED', label: 'Updated Profile' },
  { value: 'DOWNLOADED_REPORT', label: 'Downloaded Report' },
  { value: 'CONTACTED_SUPPORT', label: 'Contacted Support' },
];

/**
 * Get field configuration for an activity type
 */
export function getActivityTypeConfig(activityTypeCode: string): ActivityTypeFieldConfig {
  return ACTIVITY_TYPE_FIELDS[activityTypeCode] || {};
}

/**
 * Get custom outcomes for an activity type, or return default outcomes
 */
export function getOutcomesForActivityType(activityTypeCode: string, defaultOutcomes: any[]) {
  const config = ACTIVITY_TYPE_FIELDS[activityTypeCode];
  if (config?.customOutcomes) {
    return config.customOutcomes;
  }
  return defaultOutcomes;
}
