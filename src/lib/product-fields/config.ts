import { Prisma, ProductFieldInputType, ProductFieldScope } from "@prisma/client";

import { db } from "@/lib/prisma";

type DefinitionWithOptions = Prisma.ProductFieldDefinitionGetPayload<{
  include: { options: true };
}>;

type TenantConfigRecord = Prisma.TenantProductFieldConfigGetPayload<{
  select: {
    fieldId: true;
    visible: true;
    required: true;
    displayOrder: true;
    showInPortal: true;
    filterable: true;
    defaultValue: true;
  };
}>;

export type CompiledProductField = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  section: string | null;
  scope: ProductFieldScope;
  inputType: ProductFieldInputType;
  supportsManualEntry: boolean;
  visible: boolean;
  required: boolean;
  displayOrder: number;
  showInPortal: boolean;
  filterable: boolean;
  defaultValue: unknown;
  options: Array<{
    id: string;
    label: string;
    value: string;
    isDefault: boolean;
  }>;
};

type RegistryCache = {
  expiresAt: number;
  data: DefinitionWithOptions[];
};

type TenantCacheEntry = {
  expiresAt: number;
  data: Map<string, TenantConfigRecord>;
};

const REGISTRY_CACHE_TTL_MS = 60_000;
const TENANT_CACHE_TTL_MS = 60_000;

const registryCache: RegistryCache = {
  expiresAt: 0,
  data: [],
};

const tenantCache = new Map<string, TenantCacheEntry>();

export function clearProductFieldCaches() {
  registryCache.data = [];
  registryCache.expiresAt = 0;
  tenantCache.clear();
}

async function loadRegistry(force = false) {
  const now = Date.now();
  if (!force && registryCache.expiresAt > now && registryCache.data.length) {
    return registryCache.data;
  }

  const definitions = await db.productFieldDefinition.findMany({
    orderBy: [
      { defaultDisplayOrder: "asc" },
      { label: "asc" },
    ],
    include: {
      options: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
    },
  });

  registryCache.data = definitions;
  registryCache.expiresAt = now + REGISTRY_CACHE_TTL_MS;
  return definitions;
}

async function loadTenantOverrides(tenantId: string, force = false) {
  const now = Date.now();
  const cached = tenantCache.get(tenantId);
  if (
    !force &&
    cached &&
    cached.expiresAt > now
  ) {
    return cached.data;
  }

  const overrides = await db.tenantProductFieldConfig.findMany({
    where: { tenantId },
    select: {
      fieldId: true,
      visible: true,
      required: true,
      displayOrder: true,
      showInPortal: true,
      filterable: true,
      defaultValue: true,
    },
  });

  const map = new Map<string, TenantConfigRecord>();
  overrides.forEach((override) => {
    map.set(override.fieldId, override);
  });

  tenantCache.set(tenantId, {
    data: map,
    expiresAt: now + TENANT_CACHE_TTL_MS,
  });

  return map;
}

export type GetTenantConfigOptions = {
  scopes?: ProductFieldScope[];
  includeHidden?: boolean;
  forceRefresh?: boolean;
};

export async function getTenantProductFieldConfig(
  tenantId: string,
  options: GetTenantConfigOptions = {},
): Promise<CompiledProductField[]> {
  const { scopes, includeHidden = false, forceRefresh = false } = options;
  const [definitions, overrides] = await Promise.all([
    loadRegistry(forceRefresh),
    loadTenantOverrides(tenantId, forceRefresh),
  ]);

  const scopeSet = scopes ? new Set(scopes) : null;

  return definitions
    .filter((definition) => !scopeSet || scopeSet.has(definition.scope))
    .map((definition) => {
      const override = overrides.get(definition.id);
      const visible = override?.visible ?? definition.defaultVisibility;
      if (!visible && !includeHidden) {
        return null;
      }

      const displayOrder =
        override?.displayOrder ??
        definition.defaultDisplayOrder ??
        Number.MAX_SAFE_INTEGER;

      return {
        id: definition.id,
        key: definition.key,
        label: definition.label,
        description: definition.description ?? null,
        section: definition.section ?? null,
        scope: definition.scope,
        inputType: definition.inputType,
        supportsManualEntry: definition.supportsManualEntry,
        visible,
        required: override?.required ?? definition.defaultRequired,
        displayOrder,
        showInPortal:
          override?.showInPortal ?? definition.showInPortalByDefault,
        filterable:
          override?.filterable ?? definition.filterableByDefault,
        defaultValue: override?.defaultValue ?? definition.defaultValue,
        options: (definition.options ?? []).map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          isDefault: option.isDefault,
        })),
      };
    })
    .filter((field): field is CompiledProductField => Boolean(field))
    .sort((a, b) => {
      if (a.displayOrder === b.displayOrder) {
        return a.label.localeCompare(b.label);
      }
      return a.displayOrder - b.displayOrder;
    });
}
