/**
 * Call Plan API Client
 * Provides type-safe API calls for call plan operations
 */

import type {
  CallPlanSummary,
  CallPlanDetail,
  CallPlanListResponse,
  CallPlanAccountsResponse,
  CreateCallPlanInput,
  UpdateCallPlanInput,
  AddAccountToCallPlanInput,
  UpdateCallPlanAccountInput,
  CategorizeCustomersInput,
  ListCallPlansQuery,
} from "@/types/call-plan";

const API_BASE = "/api/call-plans";

/**
 * Fetch utility with error handling
 */
async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "An error occurred",
    }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * List all call plans with optional filters
 */
export async function listCallPlans(
  query?: ListCallPlansQuery
): Promise<CallPlanListResponse> {
  const params = new URLSearchParams();

  if (query?.week) params.set("week", query.week);
  if (query?.year) params.set("year", query.year);
  if (query?.status) params.set("status", query.status);
  if (query?.page) params.set("page", query.page);
  if (query?.pageSize) params.set("pageSize", query.pageSize);

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return fetchAPI<CallPlanListResponse>(url);
}

/**
 * Get a specific call plan by ID
 */
export async function getCallPlan(id: string): Promise<CallPlanDetail> {
  return fetchAPI<CallPlanDetail>(`${API_BASE}/${id}`);
}

/**
 * Create a new call plan
 */
export async function createCallPlan(
  data: CreateCallPlanInput
): Promise<CallPlanDetail> {
  return fetchAPI<CallPlanDetail>(API_BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing call plan
 */
export async function updateCallPlan(
  id: string,
  data: UpdateCallPlanInput
): Promise<CallPlanDetail> {
  return fetchAPI<CallPlanDetail>(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a call plan
 */
export async function deleteCallPlan(id: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
}

/**
 * Get accounts for a call plan
 */
export async function getCallPlanAccounts(
  id: string,
  page?: number,
  pageSize?: number
): Promise<CallPlanAccountsResponse> {
  const params = new URLSearchParams();
  if (page) params.set("page", page.toString());
  if (pageSize) params.set("pageSize", pageSize.toString());

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/${id}/accounts?${queryString}`
    : `${API_BASE}/${id}/accounts`;

  return fetchAPI<CallPlanAccountsResponse>(url);
}

/**
 * Add an account to a call plan
 */
export async function addAccountToCallPlan(
  callPlanId: string,
  data: AddAccountToCallPlanInput
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`${API_BASE}/${callPlanId}/accounts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Add multiple accounts to a call plan
 */
export async function addAccountsToCallPlan(
  callPlanId: string,
  accounts: AddAccountToCallPlanInput[]
): Promise<{ success: boolean; count: number }> {
  return fetchAPI<{ success: boolean; count: number }>(
    `${API_BASE}/${callPlanId}/accounts/bulk`,
    {
      method: "POST",
      body: JSON.stringify({ accounts }),
    }
  );
}

/**
 * Update a call plan account
 */
export async function updateCallPlanAccount(
  callPlanId: string,
  accountId: string,
  data: UpdateCallPlanAccountInput
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(
    `${API_BASE}/${callPlanId}/accounts/${accountId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Remove an account from a call plan
 */
export async function removeAccountFromCallPlan(
  callPlanId: string,
  accountId: string
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(
    `${API_BASE}/${callPlanId}/accounts/${accountId}`,
    {
      method: "DELETE",
    }
  );
}

/**
 * Categorize customers for CARLA analysis
 */
export async function categorizeCustomers(
  data: CategorizeCustomersInput
): Promise<{ success: boolean; categorized: number }> {
  return fetchAPI<{ success: boolean; categorized: number }>(
    `${API_BASE}/categorize`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Save a complete call plan with accounts
 */
export async function saveCompleteCallPlan(data: {
  id?: string;
  week: number;
  year: number;
  name?: string;
  description?: string;
  accounts: Array<{
    customerId: string;
    objective: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
  }>;
}): Promise<CallPlanDetail> {
  if (data.id) {
    // Update existing call plan
    const callPlan = await updateCallPlan(data.id, {
      name: data.name,
      description: data.description,
    });

    // Update accounts
    await Promise.all(
      data.accounts.map((account) =>
        updateCallPlanAccount(data.id!, account.customerId, {
          objective: account.objective,
          priority: account.priority,
        })
      )
    );

    return getCallPlan(data.id);
  } else {
    // Create new call plan
    const callPlan = await createCallPlan({
      week: data.week,
      year: data.year,
      name: data.name,
      description: data.description,
    });

    // Add accounts
    if (data.accounts.length > 0) {
      await addAccountsToCallPlan(
        callPlan.id,
        data.accounts.map((acc) => ({
          customerId: acc.customerId,
          objective: acc.objective,
          priority: acc.priority,
        }))
      );
    }

    return getCallPlan(callPlan.id);
  }
}

export const callPlanAPI = {
  list: listCallPlans,
  get: getCallPlan,
  create: createCallPlan,
  update: updateCallPlan,
  delete: deleteCallPlan,
  getAccounts: getCallPlanAccounts,
  addAccount: addAccountToCallPlan,
  addAccounts: addAccountsToCallPlan,
  updateAccount: updateCallPlanAccount,
  removeAccount: removeAccountFromCallPlan,
  categorize: categorizeCustomers,
  saveComplete: saveCompleteCallPlan,
};
