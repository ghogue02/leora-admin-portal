# Cookie Bug Summary - Sales Portal Login

## The Problem

Cookies are **NOT being set** after successful login on the deployed Vercel site, but **ARE working** in local development.

**Symptom**: User logs in successfully (gets 200 response with user/session data), but no cookies are stored in the browser.

---

## Root Cause

**Location**: `/web/src/app/api/sales/auth/login/route.ts` Lines 113-117

The issue is that cookies are being set on a NextResponse object **inside** the `withTenantFromRequest` wrapper function, and these cookie mutations may not survive the wrapper chain processing in production.

### The Problematic Code Flow

```typescript
// Lines 34-115: Inside withTenantFromRequest wrapper
const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
  // ... authentication logic ...

  // Line 97: Create response
  const response = NextResponse.json({...});

  // Line 113: Set cookies on response (MUTATION)
  applySalesSessionCookies(response, sessionId, refreshToken, ttl);

  // Line 114: Return response
  return response;
});

// Line 117: Return the wrapped result
return result;  // ⚠️ Cookie mutations might be lost here
```

### Why It Fails in Production

1. **Response Object Mutation**: `response.cookies.set()` mutates the response object
2. **Wrapper Processing**: The response goes through the `withTenantFromRequest` wrapper which wraps it in `{ tenantId, result }`
3. **Edge Runtime**: Vercel's edge runtime may serialize/deserialize the response differently than Node.js
4. **Cookie Metadata Loss**: Cookie header metadata might not survive the wrapper chain

---

## The Fix (Recommended)

**Move cookie setting OUTSIDE the wrapper** so cookies are applied directly to the final response object.

### Implementation

**File**: `/web/src/app/api/sales/auth/login/route.ts`

**Change Lines 88-117 from:**

```typescript
      const session = await createSalesSession(
        db,
        tenantId,
        user.id,
        sessionId,
        refreshToken,
        expiresAt,
      );

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          salesRep: {
            id: user.salesRepProfile.id,
            territoryName: user.salesRepProfile.territoryName,
          },
        },
        session: {
          id: sessionId,
          expiresAt: expiresAt.toISOString(),
        },
      });

      applySalesSessionCookies(response, sessionId, refreshToken, Math.floor(SESSION_TTL_MS / 1000));
      return response;
    });

    return result;
```

**To:**

```typescript
      const session = await createSalesSession(
        db,
        tenantId,
        user.id,
        sessionId,
        refreshToken,
        expiresAt,
      );

      // Return data only, not response object
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          salesRep: {
            id: user.salesRepProfile.id,
            territoryName: user.salesRepProfile.territoryName,
          },
        },
        session: {
          id: sessionId,
          expiresAt: expiresAt.toISOString(),
        },
        sessionId,
        refreshToken,
      };
    });

    // Create response OUTSIDE wrapper
    const response = NextResponse.json({
      user: result.user,
      session: result.session,
    });

    // Apply cookies AFTER wrapper processing
    applySalesSessionCookies(
      response,
      result.sessionId,
      result.refreshToken,
      Math.floor(SESSION_TTL_MS / 1000)
    );

    return response;
```

---

## Alternative Fix (Manual Headers)

If the above doesn't work, use direct header manipulation instead of the cookies API.

**File**: `/web/src/lib/auth/sales-cookies.ts`

**Replace the `applySalesSessionCookies` function:**

```typescript
export function applySalesSessionCookies(
  response: NextResponse,
  sessionId: string,
  refreshToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
) {
  const secure = process.env.NODE_ENV === "production";
  const secureFlag = secure ? "; Secure" : "";

  // Use direct header manipulation instead of cookies API
  const sessionCookie = `${SALES_ACCESS_COOKIE}=${sessionId}; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${maxAgeSeconds}; Path=/`;
  const refreshCookie = `${SALES_REFRESH_COOKIE}=${refreshToken}; HttpOnly${secureFlag}; SameSite=Lax; Max-Age=${maxAgeSeconds * 7}; Path=/api/sales/auth`;

  response.headers.append("Set-Cookie", sessionCookie);
  response.headers.append("Set-Cookie", refreshCookie);
}
```

---

## Testing After Fix

### 1. Deploy to Vercel
```bash
git add .
git commit -m "Fix cookie setting for sales portal login"
git push
```

### 2. Test Login Flow
1. Navigate to `/sales/auth/login`
2. Enter valid credentials
3. Open DevTools > Network tab
4. Submit login form
5. Check response headers for `Set-Cookie`

**Expected Result:**
```
Set-Cookie: sales_session_id=<uuid>; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
Set-Cookie: sales_refresh_token=<uuid>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/api/sales/auth
```

### 3. Verify Cookie Storage
1. Open DevTools > Application tab
2. Navigate to Cookies > your-domain.vercel.app
3. Check for `sales_session_id` and `sales_refresh_token`

### 4. Test Session Persistence
1. Navigate to a protected route
2. Refresh the page
3. Verify you remain logged in (no redirect to login)

---

## Why This Happens

### Development vs Production Differences

| Aspect | Development | Production (Vercel) |
|--------|-------------|---------------------|
| Runtime | Node.js | Edge Runtime |
| Response Processing | Direct | Serialized through edge |
| Cookie API | Works with mutation | May lose mutations |
| HTTPS | Not required | Required (secure flag) |

The key difference is **how response objects are processed** through wrapper functions in different runtime environments.

---

## Related Files

1. **Login Route**: `/web/src/app/api/sales/auth/login/route.ts`
   - Where the bug manifests (Lines 97-117)

2. **Cookie Utilities**: `/web/src/lib/auth/sales-cookies.ts`
   - Cookie setting implementation (Lines 8-31)

3. **Session Management**: `/web/src/lib/auth/sales-session.ts`
   - Session creation (works fine, not the issue)

4. **Tenant Wrapper**: `/web/src/lib/tenant.ts`
   - Wrapping function (Lines 26-46)

---

## Prevention for Future

**Rule**: When working with Next.js response objects in wrapper functions:

1. **Never mutate response objects inside wrappers** (especially for critical operations like cookies)
2. **Return data from wrappers**, create responses outside
3. **Apply cookies/headers as the last step** before returning from route handler
4. **Test in production-like environments** (not just local dev)

---

## Verification Checklist

After deploying the fix, verify:

- [ ] Login returns 200 with user/session data ✅ (already working)
- [ ] Response contains `Set-Cookie` headers ❌ (currently missing)
- [ ] Browser stores both cookies ❌ (currently missing)
- [ ] `/api/sales/auth/me` returns 200 ❌ (currently 401)
- [ ] Session persists after page refresh ❌ (currently requires re-login)
- [ ] Cookies have correct attributes (httpOnly, secure, sameSite)
- [ ] Cookie expiration is 24 hours for session, 7 days for refresh

---

## Impact

**Current**: Users must re-authenticate on every page load/refresh
**After Fix**: Users remain authenticated for 24 hours (session lifetime)

**Security**: No security implications - the fix actually ensures proper security flags are preserved.
