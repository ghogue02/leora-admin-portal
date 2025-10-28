# Sales Portal Login - Cookie Flow Diagram

## Complete Request Flow (What SHOULD Happen)

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT: POST /api/sales/auth/login                          │
│ Body: { email, password }                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ROUTE HANDLER: /src/app/api/sales/auth/login/route.ts      │
│ ├─ Lines 16-31: Validate input (email, password)           │
│ └─ Line 34: Enter withTenantFromRequest()                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ TENANT WRAPPER: /src/lib/tenant.ts                         │
│ ├─ Lines 30-31: Read tenant headers                        │
│ ├─ Lines 33-41: Resolve tenant (id/slug/default)          │
│ └─ Line 43: Call handler(tenantId, db)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ HANDLER FUNCTION (Lines 34-115)                            │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Step 1: Query User (Lines 36-51)                     │   │
│ │ ├─ Find user by email + tenantId                     │   │
│ │ └─ Include salesRepProfile                           │   │
│ └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│                     ▼                                        │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Step 2: Validate User (Lines 53-73)                  │   │
│ │ ├─ User exists? → NO: return 401                     │   │
│ │ ├─ Has sales profile? → NO: return 403               │   │
│ │ ├─ Profile active? → NO: return 403                  │   │
│ │ └─ Verify password → FAIL: return 401                │   │
│ └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│                     ▼                                        │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Step 3: Create Session (Lines 84-95)                 │   │
│ │ ├─ sessionId = randomUUID()                          │   │
│ │ ├─ refreshToken = randomUUID()                       │   │
│ │ ├─ expiresAt = Date.now() + SESSION_TTL_MS          │   │
│ │ └─ Call createSalesSession(db, ...)                  │   │
│ └──────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    ▼                                         │
│          ┌─────────────────────────┐                        │
│          │ sales-session.ts        │                        │
│          │ createSalesSession()    │                        │
│          ├─────────────────────────┤                        │
│          │ Lines 74-82:            │                        │
│          │ INSERT INTO             │                        │
│          │   salesSession          │                        │
│          │ VALUES (                │                        │
│          │   id: sessionId,        │                        │
│          │   tenantId,             │                        │
│          │   userId,               │                        │
│          │   expiresAt,            │                        │
│          │   refreshToken          │                        │
│          │ )                       │                        │
│          └─────────┬───────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Step 4: Create Response (Lines 97-111)               │   │
│ │ const response = NextResponse.json({                 │   │
│ │   user: { id, email, fullName, salesRep },          │   │
│ │   session: { id, expiresAt }                        │   │
│ │ });                                                   │   │
│ └──────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    ▼                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Step 5: SET COOKIES (Line 113) ⚠️ CRITICAL           │   │
│ │ applySalesSessionCookies(                            │   │
│ │   response,          ← NextResponse object           │   │
│ │   sessionId,         ← UUID                          │   │
│ │   refreshToken,      ← UUID                          │   │
│ │   ttl                ← SESSION_TTL_MS / 1000         │   │
│ │ );                                                    │   │
│ └──────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    ▼                                         │
│          ┌─────────────────────────┐                        │
│          │ sales-cookies.ts        │                        │
│          │ applySalesSessionCookies│                        │
│          ├─────────────────────────┤                        │
│          │ Line 16-22:             │                        │
│          │ response.cookies.set(   │                        │
│          │   "sales_session_id",   │                        │
│          │   sessionId,            │                        │
│          │   {                     │                        │
│          │     httpOnly: true,     │                        │
│          │     secure: true,       │   ⚠️ MUTATION         │
│          │     sameSite: "lax",    │   HAPPENS HERE        │
│          │     maxAge: ttl,        │                        │
│          │     path: "/"           │                        │
│          │   }                     │                        │
│          │ );                      │                        │
│          │                         │                        │
│          │ Line 24-30:             │                        │
│          │ response.cookies.set(   │                        │
│          │   "sales_refresh_token",│                        │
│          │   refreshToken, {...}   │                        │
│          │ );                      │                        │
│          └─────────┬───────────────┘                        │
│                    │                                         │
│                    ▼                                         │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Step 6: Return Response (Line 114)                   │   │
│ │ return response;  ← Response with cookies attached   │   │
│ └──────────────────┬───────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ WRAPPER RETURN: tenant.ts Line 45                          │
│ return { tenantId: tenant.id, result: response };          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ FINAL RETURN: login/route.ts Line 117                      │
│ return result;  ← Should be the response object            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ NEXT.JS SENDS HTTP RESPONSE                                 │
│ Status: 200 OK                                              │
│ Headers:                                                    │
│   Content-Type: application/json                           │
│   Set-Cookie: sales_session_id=<uuid>; HttpOnly; Secure... │ ⚠️ SHOULD BE HERE
│   Set-Cookie: sales_refresh_token=<uuid>; HttpOnly; ...    │ ⚠️ SHOULD BE HERE
│ Body: { user: {...}, session: {...} }                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ BROWSER RECEIVES & STORES COOKIES                           │
│ Application → Cookies:                                      │
│   sales_session_id = <uuid>                                │
│   sales_refresh_token = <uuid>                             │
└─────────────────────────────────────────────────────────────┘
```

---

## What's ACTUALLY Happening (Bug Analysis)

```
┌─────────────────────────────────────────────────────────────┐
│ PROBLEM POINT 1: Response Object Mutation                  │
│                                                              │
│ Line 113: applySalesSessionCookies(response, ...)          │
│                                                              │
│ This MUTATES the response.cookies collection:               │
│                                                              │
│ response = {                                                │
│   status: 200,                                              │
│   body: { user, session },                                 │
│   cookies: Map {                                           │
│     "sales_session_id" → {                                 │
│       value: "uuid-123",                                    │
│       options: { httpOnly: true, secure: true, ... }       │
│     },                                                      │
│     "sales_refresh_token" → {                              │
│       value: "uuid-456",                                    │
│       options: { ... }                                      │
│     }                                                       │
│   }                                                         │
│ }                                                           │
│                                                              │
│ ⚠️ Issue: This mutation might not survive wrapper chain    │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ PROBLEM POINT 2: Wrapper Chain Processing                  │
│                                                              │
│ withTenantFromRequest wraps the response:                   │
│                                                              │
│ const result = await withTenant(                            │
│   tenant.id,                                                │
│   (tx) => handler(tenant.id, tx)                           │
│ );                                                          │
│                                                              │
│ return { tenantId: tenant.id, result };                    │
│                                                              │
│ Then login route does:                                      │
│ const { result } = await withTenantFromRequest(...);       │
│ return result;                                              │
│                                                              │
│ ⚠️ Potential Issues:                                        │
│ 1. Response object serialization/deserialization            │
│ 2. Cookie metadata lost in wrapper processing               │
│ 3. Edge runtime handles objects differently                 │
│ 4. Vercel might strip cookies during deployment             │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ACTUAL VERCEL RESPONSE (Production)                        │
│                                                              │
│ Status: 200 OK                                              │
│ Headers:                                                    │
│   Content-Type: application/json                           │
│   ❌ Set-Cookie: (MISSING!)                                │
│ Body: { user: {...}, session: {...} }                      │
│                                                              │
│ Result: Cookies NOT sent to browser                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Cookie Setting Locations (Where it SHOULD work)

### Current Implementation (Lines 113-114)
```typescript
// INSIDE handler, INSIDE wrapper
applySalesSessionCookies(response, sessionId, refreshToken, ttl);
return response;
```

**Problem**: Response goes through wrapper chain, cookies might be lost.

---

## Recommended Fix Locations

### Option A: Set Cookies Outside Wrapper (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│ HANDLER (Lines 34-115)                                      │
│ ├─ Authenticate user                                        │
│ ├─ Create session in DB                                    │
│ └─ Return DATA ONLY (not response)                         │
│    return {                                                 │
│      userData: {...},                                       │
│      sessionData: {...},                                    │
│      sessionId,                                             │
│      refreshToken                                           │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ AFTER WRAPPER (Lines 117+)                                  │
│ const { result } = await withTenantFromRequest(...);       │
│                                                              │
│ // Create response OUTSIDE wrapper                          │
│ const response = NextResponse.json({                        │
│   user: result.userData,                                    │
│   session: result.sessionData                              │
│ });                                                         │
│                                                              │
│ // Set cookies AFTER all wrapping                          │
│ applySalesSessionCookies(                                   │
│   response,                                                 │
│   result.sessionId,                                        │
│   result.refreshToken,                                     │
│   ttl                                                       │
│ );                                                          │
│                                                              │
│ return response;  ← Direct return, no wrapper interference │
└─────────────────────────────────────────────────────────────┘
```

### Option B: Manual Header Setting (Most Reliable)

```typescript
const response = NextResponse.json({...});

// Direct header manipulation instead of cookies API
response.headers.append('Set-Cookie',
  `sales_session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}; Path=/`
);
response.headers.append('Set-Cookie',
  `sales_refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl * 7}; Path=/api/sales/auth`
);

return response;
```

---

## Error Conditions That Skip Cookie Setting

### Early Returns (Before Line 113)

```
Line 20:  return NextResponse.json({ error: "Invalid JSON" }, 400)
          ❌ No cookies set

Line 25:  return NextResponse.json({ error: "Email required" }, 400)
          ❌ No cookies set

Line 30:  return NextResponse.json({ error: "Password required" }, 400)
          ❌ No cookies set

Line 54:  return NextResponse.json({ error: "Invalid credentials" }, 401)
          ❌ No cookies set

Line 62:  return NextResponse.json({ error: "No sales profile" }, 403)
          ❌ No cookies set

Line 69:  return NextResponse.json({ error: "Account inactive" }, 403)
          ❌ No cookies set

Line 78:  return NextResponse.json({ error: "Invalid credentials" }, 401)
          ❌ No cookies set

Line 124: return NextResponse.json({ error: "Unable to authenticate" }, 500)
          ❌ No cookies set (catch block)
```

**All error responses correctly do NOT set cookies** (this is intentional).

---

## Production vs Development Behavior

### Development (Local)
```
NODE_ENV=development
├─ secure: false  ← Cookies work over HTTP
├─ Response object mutations work
└─ ✅ Cookies ARE set
```

### Production (Vercel)
```
NODE_ENV=production
├─ secure: true  ← Requires HTTPS (Vercel provides this ✅)
├─ Edge runtime may serialize response differently
└─ ❌ Cookies NOT being set
```

**Key Difference**: Not the `secure` flag itself, but how the response object is processed.

---

## Verification Checklist

### To Confirm Cookies ARE Set (Should See)
- [ ] `Set-Cookie` headers in HTTP response
- [ ] Cookies stored in browser Application tab
- [ ] `/api/sales/auth/me` works without re-login
- [ ] Session persists across page refreshes

### To Confirm Cookies NOT Set (Currently Seeing)
- [ ] No `Set-Cookie` headers in response
- [ ] No cookies in browser storage
- [ ] `/api/sales/auth/me` returns 401
- [ ] Must re-login on every page load

---

## Files Requiring Changes

### 1. `/web/src/app/api/sales/auth/login/route.ts`
**Current**: Lines 97-114 (create response, set cookies, return inside handler)
**Change**: Move cookie setting outside wrapper

### 2. `/web/src/lib/auth/sales-cookies.ts`
**Optional**: Add manual header setting as fallback
**Optional**: Add domain configuration support

### 3. Environment Variables (Vercel)
**Add**: `COOKIE_DOMAIN=.yourdomain.com` (if needed)
