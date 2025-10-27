/**
 * API Client for Metrics Definitions
 * Handles all API interactions for metric management
 */

import {
  MetricDefinition,
  MetricDefinitionListResponse,
  MetricDefinitionWithHistory,
  CreateMetricDefinitionInput,
  UpdateMetricDefinitionInput,
} from '@/types/metrics';

const API_BASE = '/api/metrics/definitions';

export class MetricsApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'MetricsApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new MetricsApiError(response.status, error.message || response.statusText);
  }
  return response.json();
}

export const metricsApi = {
  /**
   * Get all metric definitions with optional filtering
   */
  async list(params?: {
    search?: string;
    page?: number;
    limit?: number;
    includeDeprecated?: boolean;
  }): Promise<MetricDefinitionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.includeDeprecated) searchParams.set('includeDeprecated', 'true');

    const url = `${API_BASE}?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<MetricDefinitionListResponse>(response);
  },

  /**
   * Get a specific metric definition by code
   */
  async get(code: string, includeHistory = false): Promise<MetricDefinition | MetricDefinitionWithHistory> {
    const searchParams = new URLSearchParams();
    if (includeHistory) searchParams.set('includeHistory', 'true');

    const url = `${API_BASE}/${code}?${searchParams.toString()}`;
    const response = await fetch(url);
    return handleResponse<MetricDefinition | MetricDefinitionWithHistory>(response);
  },

  /**
   * Create a new metric definition
   */
  async create(data: CreateMetricDefinitionInput): Promise<MetricDefinition> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<MetricDefinition>(response);
  },

  /**
   * Update an existing metric definition (creates new version)
   */
  async update(code: string, data: UpdateMetricDefinitionInput): Promise<MetricDefinition> {
    const response = await fetch(`${API_BASE}/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<MetricDefinition>(response);
  },

  /**
   * Deprecate a metric definition (soft delete)
   */
  async deprecate(code: string): Promise<MetricDefinition> {
    const response = await fetch(`${API_BASE}/${code}`, {
      method: 'DELETE',
    });
    return handleResponse<MetricDefinition>(response);
  },
};
