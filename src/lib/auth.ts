/**
 * Authentication compatibility barrel.
 * Provides legacy helpers used by older API routes until they are refactored.
 */

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDefaultTenantSlug } from "@/lib/tenant";
import { getActiveSalesSession, type SalesSession } from "@/lib/auth/sales-session";
import { getActivePortalSession } from "@/lib/auth/session";
import { SALES_ACCESS_COOKIE } from "@/lib/auth/sales-cookies";
import { ACCESS_COOKIE as PORTAL_ACCESS_COOKIE } from "@/lib/auth/cookies";

export type LegacySessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  name?: string | null;
  tenantId: string;
  sessionType: "sales" | "portal";
  roles: Array<{
    role: {
      code: string;
      permissions: Array<{
        permission: {
          code: string;
        };
      }>;
    };
  }>;
  salesRep?: SalesSession["user"]["salesRep"];
  isActive: boolean;
};

export type LegacySession = {
  user: LegacySessionUser;
};

/**
 * Replacement for NextAuth's getServerSession.
 * Resolves either a sales session or a portal session based on cookies.
 */
export async function getServerSession(..._args: unknown[]): Promise<LegacySession | null> {
  const headerStore = await safeHeaders();
  const tenant = await resolveTenant(headerStore);
  if (!tenant) {
    return null;
  }

  const cookieStore = await safeCookiesStore();
  if (!cookieStore) {
    return null;
  }
  const salesSessionId = cookieStore.get(SALES_ACCESS_COOKIE)?.value ?? null;
  if (salesSessionId) {
    const salesSession = await getActiveSalesSession(prisma, tenant.id, salesSessionId);
    if (salesSession) {
      return { user: buildSalesSessionUser(salesSession, tenant.id) };
    }
  }

  const portalSessionId = cookieStore.get(PORTAL_ACCESS_COOKIE)?.value ?? null;
  if (portalSessionId) {
    const portalSession = await getActivePortalSession(prisma, tenant.id, portalSessionId);
    if (portalSession) {
      return { user: buildPortalSessionUser(portalSession, tenant.id) };
    }
  }

  return null;
}

export { withSalesSession } from "./auth/sales";
export { withPortalSession } from "./auth/portal";
export { withAdminSession } from "./auth/admin";

async function safeHeaders(): Promise<Headers> {
  try {
    return await headers();
  } catch {
    // When called outside of a request (e.g., during build), fall back to empty headers.
    return new Headers();
  }
}

async function safeCookiesStore() {
  try {
    return await cookies();
  } catch {
    return null;
  }
}

async function resolveTenant(headerStore: Headers) {
  const tenantIdHeader = headerStore.get("x-tenant-id");
  if (tenantIdHeader) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantIdHeader },
      select: { id: true, slug: true },
    });
    if (tenant) {
      return tenant;
    }
  }

  const slugHeader = headerStore.get("x-tenant-slug");
  const slug = slugHeader || getDefaultTenantSlug();
  if (!slug) {
    return null;
  }

  return prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });
}

function buildSalesSessionUser(session: SalesSession, tenantId: string): LegacySessionUser {
  return {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    name: session.user.fullName,
    tenantId,
    sessionType: "sales",
    roles: session.user.roles,
    salesRep: session.user.salesRep,
    isActive: session.user.isActive,
  };
}

type PortalSessionWithUser = NonNullable<Awaited<ReturnType<typeof getActivePortalSession>>>;

function buildPortalSessionUser(
  session: PortalSessionWithUser,
  tenantId: string,
): LegacySessionUser {
  return {
    id: session.portalUser.id,
    email: session.portalUser.email,
    fullName: session.portalUser.fullName,
    name: session.portalUser.fullName,
    tenantId,
    sessionType: "portal",
    roles: session.portalUser.roles,
    isActive: session.portalUser.status === "ACTIVE",
  };
}
