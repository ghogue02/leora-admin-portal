import { z } from "zod";
import { AccountType, TaskPriority } from "@prisma/client";

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const createCallPlanSchema = z.object({
  week: z.number().int().min(1).max(53),
  year: z.number().int().min(2020).max(2100),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export const updateCallPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  effectiveAt: z.string().datetime().optional(),
});

export const addAccountToCallPlanSchema = z.object({
  customerId: z.string().uuid(),
  objective: z.string().max(500).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const updateCallPlanAccountSchema = z.object({
  objective: z.string().max(500).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  outcome: z.string().max(1000).optional(),
  contactedDate: z.string().datetime().optional(),
});

export const categorizeCustomersSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1),
  accountType: z.enum(["ACTIVE", "TARGET", "PROSPECT"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const listCallPlansQuerySchema = z.object({
  week: z.string().optional(),
  year: z.string().optional(),
  status: z.enum(["active", "archived", "all"]).optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type CreateCallPlanInput = z.infer<typeof createCallPlanSchema>;
export type UpdateCallPlanInput = z.infer<typeof updateCallPlanSchema>;
export type AddAccountToCallPlanInput = z.infer<typeof addAccountToCallPlanSchema>;
export type UpdateCallPlanAccountInput = z.infer<typeof updateCallPlanAccountSchema>;
export type CategorizeCustomersInput = z.infer<typeof categorizeCustomersSchema>;
export type ListCallPlansQuery = z.infer<typeof listCallPlansQuerySchema>;

// Response Types
export interface CallPlanSummary {
  id: string;
  name: string;
  description: string | null;
  week: number;
  year: number;
  effectiveAt: string | null;
  accountCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CallPlanAccount {
  id: string;
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  accountType: AccountType | null;
  priority: TaskPriority;
  objective: string | null;
  outcome: string | null;
  contactedDate: string | null;
  riskStatus: string;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  establishedRevenue: number | null;
  location: string | null;
  createdAt: string;
}

export interface CallPlanDetail extends CallPlanSummary {
  userId: string;
  accounts: CallPlanAccount[];
}

export interface CallPlanListResponse {
  callPlans: CallPlanSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface CallPlanAccountsResponse {
  accounts: CallPlanAccount[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalAccounts: number;
    completedAccounts: number;
    highPriority: number;
    atRiskAccounts: number;
  };
}
