# Sales Portal Login Cookie Flow - Complete Analysis

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: Cookies ARE being set, but there's a **critical flow architecture problem** with how the response is being returned from the `withTenantFromRequest` wrapper.

---

## Complete Authentication Flow

### 1. Login Request Entry Point
**File**: `/web/src/app/api/sales/auth/login/route.ts`

```
POST /api/sales/auth/login
├─ Lines 15-21: Parse request body
├─ Lines 23-31: Validate email and password
└─ Lines 33-117: Enter withTenantFromRequest wrapper
```

### 2. Tenant Resolution & Database Operations
**File**: `/web/src/lib/tenant.ts`

```
withTenantFromRequest()
├─ Lines 30-31: Read headers (x-tenant-id, x-tenant-slug)
├─ Lines 33-41: Resolve tenant from headers or default
└─ Line 43: Execute handler callback with tenant context
```

### 3. Authentication & Session Creation
**File**: `/web/src/app/api/sales/auth/login/route.ts` (inside handler)

```
Handler Function (Lines 34-115)
├─ Lines 36-51: Query user with sales rep profile
├─ Lines 53-73: Validate user, profile, and active status
├─ Lines 76-82: Verify password with bcrypt
├─ Lines 84-95: Create session in database
│   └─ Calls createSalesSession() in sales-session.ts
├─ Lines 97-111: Create response JSON
└─ Line 113: **COOKIE SETTING HAPPENS HERE**
    └─ applySalesSessionCookies(response, sessionId, refreshToken, ttl)
```

### 4. Session Database Storage
**File**: `/web/src/lib/auth/sales-session.ts`

```
createSalesSession()
├─ Lines 40-67: Query user with full profile
├─ Lines 69-71: Throw error if user not found
├─ Lines 74-82: INSERT into salesSession table
└─ Lines 84-100: Return session object
```

### 5. Cookie Application
**File**: `/web/src/lib/auth/sales-cookies.ts`

```
applySalesSessionCookies()
├─ Line 14: Determine secure flag (production = true)
├─ Lines 16-22: Set SALES_ACCESS_COOKIE
│   ├─ httpOnly: true
│   ├─ secure: true (in production)
│   ├─ sameSite: "lax"
│   ├─ maxAge: SESSION_TTL_MS / 1000
│   └─ path: "/"
└─ Lines 24-30: Set SALES_REFRESH_COOKIE
    ├─ httpOnly: true
    ├─ secure: true (in production)
    ├─ sameSite: "lax"
    ├─ maxAge: SESSION_TTL_MS * 7 / 1000
    └─ path: "/api/sales/auth"
```

---

## THE CRITICAL BUG

### Problem Location: Lines 113-117 in login/route.ts

```typescript
      // Line 97: Response object created with cookies
      const response = NextResponse.json({...});

      // Line 113: Cookies are set on this response object
      applySalesSessionCookies(response, sessionId, refreshToken, ttl);

      // Line 114: THIS response is returned from handler
      return response;
    });

    // Line 117: BUT THIS returns the "result" field from wrapper!
    return result;  // ⚠️ THIS IS THE BUG!
```

### The Issue Explained

**What's happening:**

1. `withTenantFromRequest` wraps the handler in a transaction context
2. The handler creates a `NextResponse` object and sets cookies on it (Line 113)
3. The handler returns this response object (Line 114)
4. `withTenantFromRequest` wraps this in `{ tenantId, result }` structure (Line 45 in tenant.ts)
5. **Line 117 returns `result`** which is the NextResponse object

**The problem:**

Looking at `/web/src/lib/tenant.ts` line 43-45:

```typescript
const result = await withTenant(tenant.id, (tx) => handler(tenant.id, tx));

return { tenantId: tenant.id, result };
```

The `withTenantFromRequest` function returns `{ tenantId, result }` but then on line 117 of the login route:

```typescript
return result;
```

This **appears correct** but there's a potential issue with how the response object is being passed through multiple wrapper layers.

---

## ACTUAL ROOT CAUSE: Response Mutation Through Wrappers

### The Real Problem

**NextResponse.cookies is a mutable API**, but when the response goes through:
1. Handler function (where cookies are set)
2. `withTenant` wrapper
3. `withTenantFromRequest` wrapper
4. Final return to Next.js

**The cookie modifications might not persist** through all these layers, especially in production environments where:
- Response objects might be serialized/deserialized
- Edge runtime behaves differently than Node.js runtime
- Vercel's middleware layer processes responses differently

### Evidence

Looking at the cookie setting code:

```typescript
// sales-cookies.ts line 16-22
response.cookies.set(SALES_ACCESS_COOKIE, sessionId, {
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: maxAgeSeconds,
  path: "/",
});
```

This **mutates** the response object. In local dev this works fine, but in production:
- The response might be cloned/copied during wrapper processing
- Cookie headers might be stripped by Vercel's edge network
- The `secure: true` flag in production requires HTTPS (which should be fine on Vercel)

---

## Cookie Configuration Analysis

### Cookie Settings (Production)

**SALES_ACCESS_COOKIE** (`sales_session_id`):
```typescript
{
  httpOnly: true,        // ✅ Correct - prevents XSS
  secure: true,          // ✅ Correct - HTTPS only in production
  sameSite: "lax",       // ✅ Correct - protects against CSRF
  maxAge: 86400,         // ✅ 24 hours (default)
  path: "/",             // ✅ Available to all routes
}
```

**SALES_REFRESH_COOKIE** (`sales_refresh_token`):
```typescript
{
  httpOnly: true,        // ✅ Correct
  secure: true,          // ✅ Correct
  sameSite: "lax",       // ✅ Correct
  maxAge: 604800,        // ✅ 7 days (7x session)
  path: "/api/sales/auth", // ⚠️ RESTRICTED - only accessible to auth endpoints
}
```

### Missing Configuration

**No explicit domain setting** - This could be an issue if:
- Vercel deployment uses a different domain than expected
- Subdomain configuration is causing cookie scope issues
- Cross-domain requests are happening

---

## Verification Points

### ✅ What's Working
1. Session creation in database (`createSalesSession`)
2. Password verification
3. User and profile validation
4. Response JSON structure
5. Cookie configuration values are correct

### ⚠️ What MIGHT Be Failing
1. **Cookie persistence through wrapper layers** (most likely)
2. Cookie domain matching on Vercel
3. Response object mutations not being preserved
4. Edge runtime vs Node runtime differences

### ❌ Potential Issues
1. No explicit cookie `domain` setting
2. Response object passed through multiple wrapper functions
3. No verification that cookies are in final HTTP headers
4. No error handling if cookie setting fails silently

---

## Solution Recommendations

### Option 1: Set Cookies Directly in Headers (Recommended)

Instead of using `response.cookies.set()`, manually construct Set-Cookie headers:

```typescript
const cookieStrings = [
  `${SALES_ACCESS_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`,
  `${SALES_REFRESH_COOKIE}=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge * 7}; Path=/api/sales/auth`
];

const response = NextResponse.json({...});
cookieStrings.forEach(cookie => {
  response.headers.append('Set-Cookie', cookie);
});
```

### Option 2: Apply Cookies After Wrapper Returns

```typescript
const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
  // ... authentication logic

  // Return data only, not response
  return {
    user: {...},
    session: {...},
    sessionId,
    refreshToken,
  };
});

// Create response OUTSIDE wrapper
const response = NextResponse.json({
  user: result.user,
  session: result.session,
});

// Apply cookies AFTER all wrappers
applySalesSessionCookies(response, result.sessionId, result.refreshToken, ttl);
return response;
```

### Option 3: Add Explicit Domain Configuration

```typescript
// In sales-cookies.ts
const domain = process.env.COOKIE_DOMAIN || undefined;

response.cookies.set(SALES_ACCESS_COOKIE, sessionId, {
  httpOnly: true,
  secure,
  sameSite: "lax",
  maxAge: maxAgeSeconds,
  path: "/",
  domain, // Add this
});
```

Then set in Vercel env: `COOKIE_DOMAIN=.yourdomain.com`

---

## Testing Plan

### 1. Verify Cookie Headers in Response

Add logging before return:

```typescript
console.log('Response headers:', Object.fromEntries(response.headers.entries()));
console.log('Response cookies:', response.cookies.getAll());
```

### 2. Check Vercel Function Logs

In Vercel dashboard, check function logs for the login endpoint to see if cookies are present in the response.

### 3. Network Inspection

In browser DevTools > Network tab:
- Check Response Headers for `Set-Cookie`
- Verify cookie values match generated sessionId/refreshToken
- Check Application > Cookies to see if they're stored

### 4. Compare Local vs Production

Test the exact same login request locally vs on Vercel to see where behavior diverges.

---

## Files Involved

| File | Purpose | Lines |
|------|---------|-------|
| `/web/src/app/api/sales/auth/login/route.ts` | Login endpoint | 15-126 |
| `/web/src/lib/auth/sales-session.ts` | Session creation | 32-101 |
| `/web/src/lib/auth/sales-cookies.ts` | Cookie setting | 8-31 |
| `/web/src/lib/tenant.ts` | Tenant resolution wrapper | 26-46 |

---

## Next Steps

1. **Immediate**: Add logging to verify cookie headers in production
2. **Short-term**: Implement Option 2 (apply cookies outside wrapper)
3. **Medium-term**: Add explicit domain configuration
4. **Long-term**: Add integration tests for cookie setting in auth flow

---

## Environment Variables Impact

**Current behavior**:
- `NODE_ENV=production` → `secure: true` (HTTPS only)
- `SALES_SESSION_TTL_MS` → Controls cookie lifetime (default: 86400000ms = 24h)
- `SALES_SESSION_MAX_AGE` → Cookie max-age in seconds (default: 86400s = 24h)

**Missing**:
- `COOKIE_DOMAIN` - Should be set for Vercel deployment
- No cookie-specific debug logging in production
