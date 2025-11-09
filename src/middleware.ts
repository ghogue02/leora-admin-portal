import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin/dev routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/dev")) {
    // Check for sales or portal session cookies
    const salesSessionId = request.cookies.get("sales_session_id")?.value;
    const portalSessionId = request.cookies.get("portal_session_id")?.value;

    // If no session at all, redirect to login
    if (!salesSessionId && !portalSessionId) {
      // Redirect to sales login since admin requires sales.admin role
      return NextResponse.redirect(new URL("/sales/auth/login", request.url));
    }

    // Let the request through - the API routes will validate admin privileges
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dev/:path*",
    // Add other protected routes here as needed
  ],
};
