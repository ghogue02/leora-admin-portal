/**
 * Call Plan Types for tracking contact methods
 */

export type ContactOutcome = "in_person" | "phone" | "email" | "text" | null;

export interface ContactOutcomeData {
  outcome: ContactOutcome;
  markedAt?: Date;
  notes?: string;
}

export interface AccountWithOutcome {
  id: string;
  name: string;
  city?: string;
  state?: string;
  outcome: ContactOutcome;
  markedAt?: Date;
  notes?: string;
  taskId?: string;
}

export interface WeeklyProgressData {
  totalAccounts: number;
  inPersonCount: number;
  phoneCount: number;
  emailCount: number;
  textCount: number;
  contactedCount: number;
  visitedCount: number;
  notReachedCount: number;
  percentComplete: number;
}

export interface RepProgress {
  repId: string;
  repName: string;
  progress: WeeklyProgressData;
}
