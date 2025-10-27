/**
 * Zod validation schemas for Metrics API
 * Phase 1.1: Metrics Definition System
 */

import { z } from 'zod';

// Recursive formula schema
const metricFormulaSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    field: z.string().min(1, 'Field is required'),
    operator: z.enum(['>', '<', '>=', '<=', '=', '!=', 'contains', 'in', 'between']),
    value: z.union([z.string(), z.number(), z.boolean()]),
    logic: z.enum(['AND', 'OR']).optional(),
    conditions: z.array(metricFormulaSchema).optional(),
  })
);

export const createMetricDefinitionSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(100, 'Code must be less than 100 characters')
    .regex(/^[a-z0-9_]+$/, 'Code must contain only lowercase letters, numbers, and underscores'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters'),
  formula: metricFormulaSchema.optional(),
});

export const updateMetricDefinitionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  formula: metricFormulaSchema.optional(),
});

export const metricDefinitionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  includeDeprecated: z.coerce.boolean().default(false),
  code: z.string().optional(),
  search: z.string().optional(),
});

export type CreateMetricDefinitionInput = z.infer<typeof createMetricDefinitionSchema>;
export type UpdateMetricDefinitionInput = z.infer<typeof updateMetricDefinitionSchema>;
export type MetricDefinitionQuery = z.infer<typeof metricDefinitionQuerySchema>;
