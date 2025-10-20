import { prisma, withTenant } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

const TENANT_ID_HEADER = "x-tenant-id";
const TENANT_SLUG_HEADER = "x-tenant-slug";

export type TenantContext<T> = {
  tenantId: string;
  result: T;
};

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}

export async function requireTenantBySlug(slug: string) {
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    throw new Error(`Tenant with slug "${slug}" was not found.`);
  }
  return tenant;
}

export async function withTenantFromRequest<T>(
  request: Request,
  handler: (tenantId: string, db: PrismaClient | Prisma.TransactionClient) => Promise<T>,
): Promise<TenantContext<T>> {
  const tenantIdHeader = request.headers.get(TENANT_ID_HEADER);
  const tenantSlugHeader = request.headers.get(TENANT_SLUG_HEADER);

  const tenant = tenantIdHeader
    ? await prisma.tenant.findUnique({ where: { id: tenantIdHeader } })
    : tenantSlugHeader
      ? await requireTenantBySlug(tenantSlugHeader)
      : await resolveDefaultTenant();

  if (!tenant) {
    throw new Error("Tenant could not be resolved from the current request.");
  }

  const result = await withTenant(tenant.id, (tx) => handler(tenant.id, tx));

  return { tenantId: tenant.id, result };
}

async function resolveDefaultTenant() {
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG;
  console.log('[Tenant] DEFAULT_TENANT_SLUG from env:', defaultSlug);

  if (!defaultSlug) {
    console.error('[Tenant] DEFAULT_TENANT_SLUG is not set in environment');
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: defaultSlug },
  });

  console.log('[Tenant] Found tenant:', tenant ? `${tenant.slug} (${tenant.id})` : 'NOT FOUND');

  return tenant;
}
