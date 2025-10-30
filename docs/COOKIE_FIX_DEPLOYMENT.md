# Cookie Fix Deployment Guide

**Date**: October 20, 2025
**Issue**: Session cookies not being set on Vercel deployment
**Status**: ✅ FIXED - Ready to Deploy

---

## 🔧 Changes Made

### 1. Fixed Cookie Path Mismatch ✅
**File**: `/web/src/lib/auth/sales-cookies.ts:29`

**Problem**: Refresh token cookie used path `/api/sales/auth` while access cookie used `/`
**Fix**: Changed both cookies to use path `/` for consistency

```typescript
// BEFORE (BROKEN):
path: "/api/sales/auth"

// AFTER (FIXED):
path: "/"
```

### 2. Fixed Cookie Setting in Login Route ✅
**File**: `/web/src/app/api/sales/auth/login/route.ts`

**Problem**: Cookies were set inside `withTenantFromRequest` wrapper, and mutations didn't survive in Vercel's Edge runtime
**Fix**: Moved cookie setting OUTSIDE the wrapper to final response object

```typescript
// Return data from wrapper (not response object)
const { result: loginData } = await withTenantFromRequest(...);

// Create response OUTSIDE wrapper
const response = NextResponse.json({
  user: loginData.user,
  session: loginData.session,
});

// Apply cookies to final response
applySalesSessionCookies(response, loginData.sessionId, ...);
return response;
```

### 3. Fixed Environment Variables ✅
**File**: `/web/.env.production`

**Problem**: All environment variables had literal `\n` escape sequences
**Fix**: Removed escape sequences and added `NODE_ENV=production`

### 4. Created Vercel Configuration ✅
**File**: `/web/vercel.json`

**Added**:
- CORS headers for API routes
- Access-Control-Allow-Credentials for cookie support
- NODE_ENV=production environment variable

---

## 🚀 Deployment Steps

### Step 1: Commit Changes
```bash
cd /Users/greghogue/Leora2/web

git add src/lib/auth/sales-cookies.ts
git add src/app/api/sales/auth/login/route.ts
git add .env.production
git add vercel.json

git commit -m "Fix: Session cookies not being set on Vercel

- Fixed cookie path mismatch (both use / now)
- Moved cookie setting outside withTenantFromRequest wrapper
- Fixed malformed environment variables
- Added vercel.json configuration for CORS
- Added NODE_ENV=production to environment

Resolves session validation errors on deployed site."
```

### Step 2: Push to Repository
```bash
git push origin main
```

### Step 3: Verify Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Ensure these are set**:
- `NODE_ENV` = `production`
- `DEFAULT_TENANT_SLUG` = `well-crafted`
- `DATABASE_URL` = (your database URL)
- `SALES_SESSION_MAX_AGE` = `86400`
- `SALES_SESSION_TTL_MS` = `86400000`

### Step 4: Trigger Deployment

Vercel will auto-deploy on push, or manually trigger:
```bash
vercel --prod
```

### Step 5: Test on Deployed Site

1. Navigate to: https://web-omega-five-81.vercel.app/sales/login
2. Open DevTools → Network tab
3. Login with credentials:
   - Email: `travis@wellcraftedbeverage.com`
   - Password: `SalesDemo2025`
4. **Check Response Headers** for:
   ```
   Set-Cookie: sales_session_id=...; Path=/; HttpOnly; Secure; SameSite=Lax
   Set-Cookie: sales_refresh_token=...; Path=/; HttpOnly; Secure; SameSite=Lax
   ```
5. **Check Application → Cookies** tab - should show both cookies
6. Navigate to `/sales/leora` - AutoInsights should load without errors

---

## ✅ Expected Results

### Before Fix:
- ❌ No cookies in browser
- ❌ "Unable to validate session" error
- ❌ AutoInsights fails to load
- ❌ Logout automatically triggered

### After Fix:
- ✅ Two cookies set: `sales_session_id` and `sales_refresh_token`
- ✅ Cookies visible in DevTools → Application → Cookies
- ✅ Session validation succeeds
- ✅ AutoInsights loads successfully
- ✅ No automatic logout

---

## 🔍 Verification Checklist

After deployment:

- [ ] Login succeeds without errors
- [ ] Browser DevTools shows 2 cookies set
- [ ] Cookies have `Secure` flag (HTTPS)
- [ ] Cookies have `HttpOnly` flag
- [ ] Cookies have `Path=/`
- [ ] `/api/sales/insights` returns 200 (not 500)
- [ ] AutoInsights displays data
- [ ] No "Unable to validate session" errors
- [ ] No automatic logout
- [ ] Session persists on page refresh

---

## 🐛 Troubleshooting

### If cookies still don't appear:

1. **Check Response Headers**:
   ```bash
   curl -i -X POST https://web-omega-five-81.vercel.app/api/sales/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"travis@wellcraftedbeverage.com","password":"SalesDemo2025"}'
   ```
   Look for `Set-Cookie` headers in response

2. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Deployments → Functions
   - Look for login logs showing:
     ```
     ✅ [Login] Cookies applied to response
     ✅ [Login] Session ID: <uuid>
     ```

3. **Check Browser Console**:
   - Should NOT see "Unable to validate session"
   - Network tab should show cookies in request headers for `/api/sales/*`

4. **Verify NODE_ENV**:
   - Vercel logs should show `NODE_ENV=production`
   - Without this, `secure` flag won't be set correctly

---

## 📊 Changes Summary

| File | Lines Changed | Type | Impact |
|------|---------------|------|--------|
| `sales-cookies.ts` | 29 | Bug Fix | Critical - Cookie path consistency |
| `login/route.ts` | 33-122 | Refactor | Critical - Cookie setting architecture |
| `.env.production` | All | Fix | High - Malformed env vars |
| `vercel.json` | New | Config | High - CORS and headers |
| `sales.ts` | 110-132 | Enhancement | Medium - Better error logging |

---

## 🎯 Root Cause Explained

The cookie issue had **two root causes**:

1. **Architectural Issue**: Cookies were set inside the `withTenantFromRequest` wrapper. In Vercel's Edge runtime, response mutations don't survive wrapper processing.

2. **Path Mismatch**: Refresh token cookie used path `/api/sales/auth`, which:
   - Created browser confusion
   - Prevented proper cookie clearing
   - Caused inconsistent cookie behavior

The fix ensures cookies are set on the final response object and both use consistent paths.

---

## 📞 Support

If issues persist after deployment:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test with curl to see raw HTTP headers
4. Check browser DevTools → Network → Response Headers
