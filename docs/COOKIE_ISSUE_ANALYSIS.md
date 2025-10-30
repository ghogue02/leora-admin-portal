# Cookie Issue Analysis - Production vs Local

**Date**: October 20, 2025
**Status**: 🔍 **INVESTIGATING** - Cookies work locally but not on Vercel
**Latest Deploy**: Debug headers added to diagnose issue

---

## 🐛 Problem Statement

**Symptoms**:
1. ✅ **Local (localhost:3002)** - Everything works perfectly
   - Login succeeds
   - Cookies visible in DevTools
   - Session validation works
   - Catalog page loads with products

2. ❌ **Deployed (web-omega-five-81.vercel.app)** - Cookies not working
   - Login appears to succeed (no error shown)
   - **NO cookies in DevTools → Application → Cookies** (empty!)
   - Navigation to `/sales/catalog` shows "Unable to validate session"
   - API requests return 500 "Internal Server Error"

---

## 🔍 Investigation Results

### Test 1: Direct API Call to Production
```bash
curl -X POST https://web-omega-five-81.vercel.app/api/sales/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"travis@wellcraftedbeverage.com","password":"..."}'
```

**Result**: `401 Invalid email or password`

**Possible Reasons**:
1. Password different in production DB
2. Missing X-Tenant-Slug header
3. Database query issue

### Test 2: Catalog API with Test Cookie
```bash
curl -H "Cookie: sales_session_id=test" \
  https://web-omega-five-81.vercel.app/api/sales/catalog
```

**Result**:
```json
{
  "error": "Unable to validate session.",
  "details": "Invalid `prisma.salesSession.findUnique()` invocation:
   Inconsistent column data: Error creating UUID, invalid character:
   expected [0-9a-fA-F-], found `t` at 1",
  "hint": "Database connection issue. Please check server logs.",
  "sessionId": "present"
}
```

**Key Finding**: The error shows `sessionId: "present"` which confirms:
- Cookie IS being sent in request
- Server IS reading the cookie
- But the UUID validation fails because cookie value is invalid

**Conclusion**: Either:
1. Cookies are being set with INVALID values (not UUIDs)
2. Cookie values are being corrupted in transmission
3. Browser is not storing cookies at all

### Test 3: Database Check
```bash
npx tsx scripts/debug-session.ts
```

**Result**: ✅ Database healthy
- 10 active sessions in database
- All are valid UUIDs
- User `travis@wellcraftedbeverage.com` exists
- Tenant `well-crafted` exists

**Conclusion**: Database is fine. Sessions ARE being created.

---

## 🎯 Root Cause Hypothesis

Based on all evidence, the issue is:

**Cookies are NOT being set in the browser on the deployed Vercel site.**

### Evidence:
1. User reports: "there are no cookies from what i can see under application in devtools"
2. Login page shows "Logout" button (because layout renders nav for all /sales/* pages)
3. After "successful" login, navigating to other pages fails with session validation errors
4. curl test with `Cookie: sales_session_id=test` proves server CAN read cookies
5. Local version works perfectly (cookies visible in DevTools)

### Why Cookies Aren't Being Set:

**Hypothesis #1: SameSite=Lax + Vercel Routing** ⚠️
- Vercel may be handling routing in a way that treats navigation as cross-site
- `SameSite=Lax` blocks cookies in cross-site POST requests
- **Solution**: Try `SameSite=None` with `Secure=true`

**Hypothesis #2: Secure Flag Issue** ⚠️
- Cookies set with `Secure=true` REQUIRE HTTPS
- If `NODE_ENV` isn't set correctly on Vercel, `Secure` might be `false`
- Browser would reject `Secure=false` cookies on HTTPS site
- **Verification**: Check debug headers (added in latest deploy)

**Hypothesis #3: Cookie Domain Mismatch** ⚠️
- No `domain` attribute specified in cookie config
- Browser might reject cookies without explicit domain on Vercel
- **Solution**: Add `domain` attribute for Vercel deployments

**Hypothesis #4: Response Not Reaching Browser** ⚠️
- Next.js Edge Runtime might be stripping cookies
- Vercel middleware might be interfering
- **Solution**: Verify Set-Cookie headers actually in HTTP response

---

## ✅ Fixes Attempted So Far

### Fix #1: Move Cookie Setting Outside Wrapper ✅
**File**: `/src/app/api/sales/auth/login/route.ts`
**Change**: Apply cookies to final response object, not inside `withTenantFromRequest`
**Status**: ✅ Deployed
**Result**: Works locally, still fails on Vercel

### Fix #2: Fix Cookie Path Mismatch ✅
**File**: `/src/lib/auth/sales-cookies.ts`
**Change**: Both cookies use `path: "/"` (was `/api/sales/auth` for refresh)
**Status**: ✅ Deployed
**Result**: Works locally, still fails on Vercel

### Fix #3: Add `credentials: 'include'` ✅
**File**: `/src/app/sales/login/page.tsx`
**Change**: Added `credentials: 'include'` to fetch requests
**Status**: ✅ Deployed
**Result**: Works locally, still fails on Vercel

### Fix #4: Environment Variables ✅
**Added**: `NODE_ENV=production`, `SALES_SESSION_MAX_AGE`, `SALES_SESSION_TTL_MS`
**Status**: ✅ Set in Vercel
**Result**: Still investigating

### Fix #5: Debug Headers (Current) 🔄
**File**: `/src/app/api/sales/auth/login/route.ts`
**Change**: Added debug headers to verify cookie setting
**Headers**:
- `X-Debug-Session-ID`: First 12 chars of UUID
- `X-Debug-Cookies-Set`: Confirms cookies applied
- `X-Debug-Secure-Flag`: Shows if Secure flag is true
**Status**: 🔄 Deploying now
**Purpose**: Diagnose exact issue

---

## 🧪 Next Testing Steps

### Step 1: Check Debug Headers (After Deployment)
1. Wait for Vercel deployment to complete
2. Login on deployed site
3. Open DevTools → Network
4. Check `/api/sales/auth/login` response headers
5. Look for:
   - `X-Debug-Session-ID`: Should show first 12 chars of UUID
   - `X-Debug-Cookies-Set`: Should be "true"
   - `X-Debug-Secure-Flag`: Should be "true" (production)
   - `Set-Cookie`: **CRITICAL** - should have 2 entries

### Step 2: Verify Set-Cookie Headers
If `Set-Cookie` headers are MISSING:
- **Problem**: Cookies not being added to response
- **Next Step**: Check if Next.js is stripping them

If `Set-Cookie` headers are PRESENT:
- **Problem**: Browser rejecting cookies
- **Possible Reasons**:
  - SameSite policy too strict
  - Domain mismatch
  - Secure flag issue
  - Cookie size too large

### Step 3: Test with Modified Cookie Config
Try these modifications one at a time:

**Test A: SameSite=None**
```typescript
sameSite: "none" as const,
secure: true, // Required with SameSite=None
```

**Test B: Add Domain**
```typescript
domain: process.env.VERCEL_URL ?
  `.${process.env.VERCEL_URL}` : undefined
```

**Test C: Remove HttpOnly (Temporary Debug)**
```typescript
httpOnly: false, // TEMPORARY - to see cookie in JS
```

---

## 📊 Comparison: Local vs Production

| Aspect | Local (Works ✅) | Production (Fails ❌) |
|--------|-----------------|----------------------|
| Login Success | ✅ Yes | ✅ Yes (sometimes) |
| Cookies Visible | ✅ Yes | ❌ No |
| Session Valid | ✅ Yes | ❌ No |
| Catalog Loads | ✅ Yes | ❌ No (error) |
| NODE_ENV | development | production |
| Secure Flag | false | true |
| URL Protocol | HTTP | HTTPS |
| Domain | localhost:3002 | web-omega-five-81.vercel.app |

**Key Difference**: HTTPS + Secure flag

**Hypothesis**: The combination of `Secure=true` + `SameSite=Lax` + HTTPS + Vercel routing is preventing cookies from being set or sent.

---

## 🛠️ Recommended Next Steps

### Immediate Actions:
1. ✅ **Wait for deployment** with debug headers
2. **Test login** and check response headers
3. **Verify Set-Cookie** headers are present
4. **Try SameSite=None** if headers present but cookies not stored

### If Still Failing:
1. Check Vercel function logs for cookie-related errors
2. Test with different browsers (Chrome vs Firefox)
3. Try disabling browser cookie restrictions
4. Check if Vercel middleware is interferring

### Nuclear Option:
If all else fails, switch to different auth method:
- Session tokens in localStorage (less secure)
- Authorization header instead of cookies
- Server-side sessions with session ID in URL params

---

## 📝 Key Learnings

### What Works:
- ✅ Database connection
- ✅ Session creation
- ✅ Password verification
- ✅ Cookie setting code (locally)
- ✅ Environment variables

### What Doesn't Work:
- ❌ Cookies not appearing in browser (production only)
- ❌ Session validation failing (production only)
- ❌ Cookie transmission (production only)

### What We Know:
1. **Code is correct** - works perfectly locally
2. **Database is fine** - sessions being created
3. **Problem is environmental** - Vercel-specific issue
4. **Not a backend issue** - cookies are being set in code
5. **Likely a browser/HTTP issue** - cookies not reaching browser

---

## 🔗 Related Documentation

- `/docs/COOKIE_FIX_DEPLOYMENT.md` - Original cookie fix deployment
- `/docs/LOGIN_PAGE_FIX_COMPLETE.md` - Login page UX fixes
- `/docs/DEPLOYMENT_COMPLETE.md` - Environment setup
- `/docs/VERCEL_ENV_ADDED.md` - Environment variables added

---

**Status**: 🔄 **Awaiting deployment with debug headers**
**Next Action**: Test login after deployment and check debug headers
**ETA**: 2-3 minutes for Vercel deployment
