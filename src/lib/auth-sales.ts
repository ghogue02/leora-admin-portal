/**
 * Sales Authentication Barrel Export
 * Re-exports sales authentication functions for easier imports
 */

import { cookies } from 'next/headers';
import { readSalesSessionCookies } from './auth/sales-cookies';
import { getActiveSalesSession, type SalesSession } from './auth/sales-session';
import { db } from '@/lib/prisma';

export { withSalesSession } from './auth/sales';
export type { SalesSession, SalesSessionContext, SalesAuthorizationOptions } from './auth/sales';

/**
 * Get current sales session from cookies
 * Used in API routes to authenticate requests
 */
export async function getSalesSession(): Promise<SalesSession | null> {
  const cookieStore = await cookies();
  const { sessionId, tenantId } = readSalesSessionCookies({
    cookies: { get: (name: string) => cookieStore.get(name) }
  } as any);

  if (!sessionId || !tenantId) {
    return null;
  }

  return getActiveSalesSession(db, tenantId, sessionId);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireSalesAuth(): Promise<SalesSession> {
  const session = await getSalesSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
}
