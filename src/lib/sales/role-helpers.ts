const SALES_MANAGER_ROLE_CODES = ["sales.manager", "sales.admin", "admin", "system_admin"] as const;

export type SalesManagerRoleCode = (typeof SALES_MANAGER_ROLE_CODES)[number];

/**
 * Determine if a set of role codes grants sales-manager privileges.
 */
export function hasSalesManagerPrivileges(roles: readonly string[]): boolean {
  return roles.some((code) => SALES_MANAGER_ROLE_CODES.includes(code as SalesManagerRoleCode));
}

/**
 * Helper to extract plain role codes from the nested session payload.
 */
export function extractRoleCodes(
  roles: Array<{ role: { code: string | null } | null }> | null | undefined,
): string[] {
  if (!roles) return [];
  return roles
    .map((entry) => entry.role?.code)
    .filter((code): code is string => Boolean(code));
}

export { SALES_MANAGER_ROLE_CODES };
