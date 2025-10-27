/**
 * Authenticated API client for sales portal
 * Ensures all requests include credentials (cookies) for session authentication
 */

export interface ApiClientOptions extends RequestInit {
  /** API endpoint path */
  path: string;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Request body (will be JSON stringified) */
  body?: any;
}

/**
 * Makes an authenticated API request with credentials included
 * @example
 * const data = await apiClient({
 *   path: '/api/sales/customers',
 *   method: 'GET',
 *   params: { status: 'active' }
 * });
 */
export async function apiClient<T = any>(options: ApiClientOptions): Promise<T> {
  const { path, params, body, ...fetchOptions } = options;

  // Build URL with query parameters
  let url = path;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url = `${path}?${searchParams.toString()}`;
  }

  // Ensure credentials are included
  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  // Add JSON body if provided
  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  // Handle non-OK responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  // Return JSON response
  return response.json();
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(path: string, params?: Record<string, string | number | boolean>) =>
    apiClient<T>({ path, method: 'GET', params }),

  post: <T = any>(path: string, body?: any) =>
    apiClient<T>({ path, method: 'POST', body }),

  put: <T = any>(path: string, body?: any) =>
    apiClient<T>({ path, method: 'PUT', body }),

  patch: <T = any>(path: string, body?: any) =>
    apiClient<T>({ path, method: 'PATCH', body }),

  delete: <T = any>(path: string) =>
    apiClient<T>({ path, method: 'DELETE' }),
};
