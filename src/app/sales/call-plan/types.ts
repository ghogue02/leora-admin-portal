/**
 * Call Plan Types for X/Y/Blank Marking System
 */

export type ContactOutcome = "contacted" | "visited" | null;

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
