import { cookies as getCookies, headers as getHeaders } from "next/headers";
import { prisma, withTenant } from "@/lib/prisma";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { SALES_ACCESS_COOKIE } from "@/lib/auth/sales-cookies";
import { getActiveSalesSession } from "@/lib/auth/sales-session";
import { getActivePortalSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";

export type ServerAdminContext = {
  tenantId: string;
  tenantSlug: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  roles: string[];
  permissions: Set<string>;
  sessionType: "sales" | "portal";
};

type AdminContextOptions = {
  tenantSlug?: string | null;
};

export async function requireServerAdminContext(
  options: AdminContextOptions = {},
): Promise<ServerAdminContext | null> {
  const cookieStore = await getCookies();
  const headerStore = await getHeaders();
  const salesSessionId = cookieStore.get(SALES_ACCESS_COOKIE)?.value ?? null;
  const portalSessionId = cookieStore.get(ACCESS_COOKIE)?.value ?? null;

  if (!salesSessionId && !portalSessionId) {
    return null;
  }

  const resolvedSlug = options.tenantSlug ?? headerStore.get("x-tenant-slug") ?? null;
  const tenant = await resolveTenant(resolvedSlug);
  if (!tenant) {
    return null;
  }

  return withTenant(tenant.id, async (tx) => {
    if (salesSessionId) {
      const salesSession = await getActiveSalesSession(tx, tenant.id, salesSessionId);
      if (salesSession) {
        const roles = salesSession.user.roles.map((item) => item.role.code);
        if (isAdmin(roles)) {
          const permissions = collectPermissions(salesSession.user.roles.map((item) => item.role.permissions));
          const context: ServerAdminContext = {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            user: {
              id: salesSession.user.id,
              email: salesSession.user.email,
              name: salesSession.user.fullName,
            },
            roles,
            permissions,
            sessionType: "sales",
          };
          return context;
        }
      }
    }

    if (portalSessionId) {
      const portalSession = await getActivePortalSession(tx, tenant.id, portalSessionId);
      if (portalSession) {
        const roles = portalSession.portalUser.roles.map((item) => item.role.code);
        if (isAdmin(roles)) {
          const permissions = collectPermissions(
            portalSession.portalUser.roles.map((item) => item.role.permissions),
          );
          const context: ServerAdminContext = {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            user: {
              id: portalSession.portalUser.id,
              email: portalSession.portalUser.email,
              name: portalSession.portalUser.fullName,
            },
            roles,
            permissions,
            sessionType: "portal",
          };
          return context;
        }
      }
    }

    return null;
  });
}

async function resolveTenant(overrideSlug: string | null) {
  const slug = overrideSlug
    ?? process.env.DEFAULT_TENANT_SLUG
    ?? process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG
    ?? "well-crafted";

  return prisma.tenant.findFirst({
    where: { slug },
    select: { id: true, slug: true },
  });
}

function collectPermissions(
  rolePermissions: Array<Array<{ permission: { code: string } }>>,
): Set<string> {
  const permissions = new Set<string>();
  rolePermissions.forEach((items) => {
    items.forEach((entry) => permissions.add(entry.permission.code));
  });
  return permissions;
}
