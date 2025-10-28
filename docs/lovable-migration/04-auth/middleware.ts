/**
 * LOVABLE MIGRATION - Authentication Middleware
 *
 * Protects routes requiring authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth-config';

// ===== PROTECTED ROUTES =====

const PROTECTED_ROUTES = {
  sales: ['/sales/dashboard', '/sales/customers', '/sales/catalog', '/sales/orders'],
  portal: ['/portal/catalog', '/portal/orders', '/portal/cart', '/portal/account'],
  admin: ['/admin'],
};

// ===== MIDDLEWARE FUNCTION =====

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route needs protection
  const needsAuth =
    PROTECTED_ROUTES.sales.some(route => pathname.startsWith(route)) ||
    PROTECTED_ROUTES.portal.some(route => pathname.startsWith(route)) ||
    PROTECTED_ROUTES.admin.some(route => pathname.startsWith(route));

  if (!needsAuth) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return redirectToLogin(request, pathname);
  }

  try {
    // Verify session
    const session = await getSession(token);

    if (!session) {
      return redirectToLogin(request, pathname);
    }

    // Check role-based access
    if (pathname.startsWith('/sales') && session.user.role !== 'sales') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (pathname.startsWith('/portal') && session.user.role !== 'portal') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Add user info to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.user.id);
    requestHeaders.set('x-user-email', session.user.email);
    requestHeaders.set('x-tenant-id', session.user.tenantId);
    requestHeaders.set('x-user-role', session.user.role || 'unknown');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware auth error:', error);
    return redirectToLogin(request, pathname);
  }
}

// ===== HELPER FUNCTIONS =====

function redirectToLogin(request: NextRequest, returnUrl: string) {
  const loginUrl = returnUrl.startsWith('/sales')
    ? '/sales/login'
    : returnUrl.startsWith('/admin')
    ? '/admin/login'
    : '/portal/login';

  const url = new URL(loginUrl, request.url);
  url.searchParams.set('returnUrl', returnUrl);

  return NextResponse.redirect(url);
}

// ===== CONFIGURATION =====

export const config = {
  matcher: [
    '/sales/:path*',
    '/portal/:path*',
    '/admin/:path*',
  ],
};

// ===== API ROUTE PROTECTION =====

export async function withSalesSession(
  request: NextRequest,
  handler: (session: any, req: NextRequest) => Promise<Response>
) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(token);

  if (!session || session.user.role !== 'sales') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handler(session, request);
}

export async function withPortalSession(
  request: NextRequest,
  handler: (session: any, req: NextRequest) => Promise<Response>
) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getSession(token);

  if (!session || session.user.role !== 'portal') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handler(session, request);
}

// ===== CLIENT-SIDE AUTH HELPERS =====

export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
  }
}
