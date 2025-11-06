export const ACTIVITY_OUTCOME_OPTIONS = [
  { value: 'RECEIVED_ORDER', label: 'Received Order' },
  { value: 'SCHEDULED_NEXT_APPOINTMENT', label: 'Scheduled Next Appointment' },
  { value: 'FOLLOW_UP_REQUIRED', label: 'Follow-up Required' },
  { value: 'CUSTOMER_NOT_INTERESTED', label: 'Customer Not Interested in Service' },
  { value: 'IMPROPER_FIT', label: 'Improper Fit' },
  { value: 'DECISION_MAKER_UNAVAILABLE', label: 'Decision Maker Unavailable' },
] as const;

export type ActivityOutcomeValue = typeof ACTIVITY_OUTCOME_OPTIONS[number]['value'];
