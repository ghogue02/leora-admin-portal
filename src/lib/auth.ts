/**
 * General Authentication Barrel Export
 * Re-exports authentication functions for portal and admin
 */

export { getServerSession } from './auth/session';
export { getPortalSession } from './auth/portal';
export { getAdminSession } from './auth/admin-session';
export { withAdminAuth } from './auth/admin';
