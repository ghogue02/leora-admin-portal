/**
 * Permission Utilities
 *
 * Helper functions for checking user permissions and roles
 */

import type { SalesSession } from './auth/sales-session';

/**
 * Check if user has a specific permission code
 */
export function hasPermission(session: SalesSession | null, permissionCode: string): boolean {
  if (!session) return false;

  return session.user.roles.some(userRole =>
    userRole.role.permissions.some(
      rolePermission => rolePermission.permission.code === permissionCode
    )
  );
}

/**
 * Check if user has any of the specified permission codes
 */
export function hasAnyPermission(session: SalesSession | null, permissionCodes: string[]): boolean {
  if (!session) return false;

  return permissionCodes.some(code => hasPermission(session, code));
}

/**
 * Check if user has all of the specified permission codes
 */
export function hasAllPermissions(session: SalesSession | null, permissionCodes: string[]): boolean {
  if (!session) return false;

  return permissionCodes.every(code => hasPermission(session, code));
}

/**
 * Check if user has a specific role code
 */
export function hasRole(session: SalesSession | null, roleCode: string): boolean {
  if (!session) return false;

  return session.user.roles.some(userRole => userRole.role.code === roleCode);
}

/**
 * Check if user has any of the specified role codes
 */
export function hasAnyRole(session: SalesSession | null, roleCodes: string[]): boolean {
  if (!session) return false;

  return roleCodes.some(code => hasRole(session, code));
}

/**
 * Check if user can override prices (manager or admin only)
 */
export function canOverridePrices(session: SalesSession | null): boolean {
  if (!session) return false;

  // Check for specific permission first
  if (hasPermission(session, 'orders.override_price')) {
    return true;
  }

  // Fallback to role-based check (manager or admin)
  return hasAnyRole(session, ['manager', 'admin', 'system_admin']);
}

/**
 * Check if user can approve orders
 */
export function canApproveOrders(session: SalesSession | null): boolean {
  if (!session) return false;

  // Check for specific permission first
  if (hasPermission(session, 'orders.approve')) {
    return true;
  }

  // Fallback to role-based check (manager or admin)
  return hasAnyRole(session, ['manager', 'admin', 'system_admin']);
}

/**
 * Get all permission codes for a user
 */
export function getUserPermissions(session: SalesSession | null): string[] {
  if (!session) return [];

  const permissions = new Set<string>();

  session.user.roles.forEach(userRole => {
    userRole.role.permissions.forEach(rolePermission => {
      permissions.add(rolePermission.permission.code);
    });
  });

  return Array.from(permissions);
}

/**
 * Get all role codes for a user
 */
export function getUserRoles(session: SalesSession | null): string[] {
  if (!session) return [];

  return session.user.roles.map(userRole => userRole.role.code);
}
