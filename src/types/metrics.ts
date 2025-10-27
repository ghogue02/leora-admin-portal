/**
 * Type definitions for Metrics API
 * Phase 1.1: Metrics Definition System
 */

export interface MetricDefinition {
  id: string;
  tenantId: string;
  code: string; // "at_risk_customer", "contacted_recently", etc.
  name: string; // "At Risk Customer"
  description: string; // Full definition
  formula: MetricFormula | null; // Calculation formula
  version: number;
  effectiveAt: Date;
  deprecatedAt: Date | null;
  createdById: string;
  createdAt: Date;
}

export interface MetricFormula {
  field: string;
  operator: string;
  value: string | number | boolean;
  logic?: 'AND' | 'OR';
  conditions?: MetricFormula[];
}

export interface CreateMetricDefinitionInput {
  code: string;
  name: string;
  description: string;
  formula?: MetricFormula;
}

export interface UpdateMetricDefinitionInput {
  name?: string;
  description?: string;
  formula?: MetricFormula;
}

export interface MetricDefinitionListResponse {
  definitions: MetricDefinition[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface MetricDefinitionWithHistory extends MetricDefinition {
  history: MetricDefinition[];
  currentVersion: number;
}
