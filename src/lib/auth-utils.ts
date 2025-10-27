/**
 * Authentication Utilities
 * Helper functions for authentication across the application
 */

import { NextRequest } from 'next/server';
import { getSalesSession } from './auth-sales';
import type { SalesSession } from './auth/sales-session';

/**
 * Get authenticated tenant ID from request
 */
export async function getAuthenticatedTenantId(request?: NextRequest): Promise<string | null> {
  const session = await getSalesSession();
  return session?.tenantId ?? null;
}

/**
 * Get authenticated user ID from request
 */
export async function getAuthenticatedUserId(request?: NextRequest): Promise<string | null> {
  const session = await getSalesSession();
  return session?.userId ?? null;
}

/**
 * Get full authenticated session
 */
export async function getAuthenticatedSession(request?: NextRequest): Promise<SalesSession | null> {
  return getSalesSession();
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuthentication(request?: NextRequest): Promise<SalesSession> {
  const session = await getSalesSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
}

/**
 * Alias for requireAuthentication (common naming convention)
 */
export const requireAuth = requireAuthentication;
