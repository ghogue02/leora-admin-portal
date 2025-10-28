# Authentication Debugging Guide

Quick reference for debugging authentication issues in the sales portal.

## Quick Checks

### 1. Browser Cookie Check
Visit: http://localhost:3000/sales/debug/cookies

This page shows:
- ✅ All cookies the browser has
- ✅ Live API test to `/api/sales/auth/me`
- ✅ Expected cookie names

**Expected cookies:**
- `sales_session_id` - Session identifier
- `sales_refresh_token` - Refresh token

### 2. Database Session Check
```bash
npx tsx scripts/debug-auth.ts
```

Shows:
- ✅ User details (Travis Vernon)
- ✅ Active sessions
- ✅ Session expiry
- ✅ Tenant configuration

### 3. API Endpoint Test
```bash
bash scripts/test-session.sh
```

Tests:
- ✅ `/api/sales/auth/me` with cookie
- ✅ `/api/sales/auth/me` without cookie
- ✅ `/api/sales/auth/debug` with cookie

## Common Issues

### Issue: 401 Unauthorized

**Symptom:** API calls return 401 Unauthorized

**Causes:**
1. Missing `credentials: "include"` in fetch call
2. Session expired
3. Cookie not set
4. Wrong tenant header

**Fix:**
```typescript
// ❌ WRONG
fetch("/api/sales/auth/me")

// ✅ CORRECT
fetch("/api/sales/auth/me", { credentials: "include" })

// ✅ BETTER - use API client
import { api } from "@/lib/api-client";
const data = await api.get("/api/sales/auth/me");
```

### Issue: Session Expired

**Symptom:** "Session expired" error even after login

**Causes:**
1. Session TTL too short
2. Clock skew between server and database
3. Session deleted from database

**Fix:**
1. Check session in database:
   ```bash
   npx tsx scripts/debug-auth.ts
   ```
2. Verify expiry time is in future
3. Re-login if needed

### Issue: Cookie Not Set

**Symptom:** Browser has no `sales_session_id` cookie

**Causes:**
1. Login response not setting cookie
2. Cookie domain/path mismatch
3. Browser blocking cookies

**Fix:**
1. Check browser cookies: http://localhost:3000/sales/debug/cookies
2. Check login response headers for `Set-Cookie`
3. Verify cookie domain is `localhost` (not `127.0.0.1`)
4. Check browser privacy settings

### Issue: Wrong Tenant

**Symptom:** "Tenant could not be resolved" error

**Causes:**
1. Missing `X-Tenant-Slug` header
2. Default tenant not configured
3. Tenant doesn't exist in database

**Fix:**
1. Add header to fetch call:
   ```typescript
   fetch("/api/sales/auth/me", {
     credentials: "include",
     headers: {
       "X-Tenant-Slug": "well-crafted"
     }
   });
   ```
2. Check `.env.local` has `DEFAULT_TENANT_SLUG=well-crafted`
3. Verify tenant exists: `npx tsx scripts/debug-auth.ts`

## Debug Endpoints

### GET /api/sales/auth/debug
Returns:
- Session ID (if present)
- Refresh token (if present)
- All cookies
- Request headers

### GET /api/sales/auth/me
Returns (if authenticated):
- User data
- Session data
- Roles

## Environment Variables

Check these in `.env.local`:

```bash
DEFAULT_TENANT_SLUG=well-crafted
SALES_SESSION_TTL_MS=86400000    # 24 hours
SALES_SESSION_MAX_AGE=86400       # 24 hours
NODE_ENV=development              # Not "production"
```

## Manual Session Creation

If you need to manually create a session for testing:

```typescript
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const sessionId = randomUUID();
const userId = '23dca8f8-a137-494d-b343-89a2034ab247'; // Travis
const tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed'; // Well Crafted

await prisma.salesSession.create({
  data: {
    id: sessionId,
    userId,
    tenantId,
    refreshToken: randomUUID(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  }
});

console.log('Session ID:', sessionId);
// Set this cookie in browser: sales_session_id=${sessionId}
```

## Browser DevTools Debugging

### Check Cookies
1. Open DevTools (F12)
2. Go to Application tab
3. Expand "Cookies" on left
4. Select http://localhost:3000
5. Look for `sales_session_id` and `sales_refresh_token`

### Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click on `/api/sales/auth/me` request
5. Check:
   - Request Headers → Cookie header present?
   - Response Headers → Status 200 or 401?
   - Response → Error message if any

### Check Console Logs
The auth middleware logs extensively. Look for:
- `🔐 [withSalesSession] Starting session validation`
- `✅ [withSalesSession] Session validated successfully`
- `❌ [withSalesSession] Session not found or expired`

## Login Flow Debug

To trace a full login:

1. Open DevTools Console
2. Go to http://localhost:3000/sales/login
3. Enter credentials:
   - Email: travis@wellcraftedbeverage.com
   - Password: [current password]
4. Watch console for:
   ```
   ✅ [Login] Cookies applied to response
   ✅ [Login] Session ID: ...
   ✅ [Login] Cookie count: 2
   ```
5. Check Network tab for `/api/sales/auth/login` response
6. Verify `Set-Cookie` headers present
7. Check Application → Cookies for new cookies
8. Navigate to dashboard
9. Verify `/api/sales/auth/me` sends cookies

## Testing Checklist

Before reporting auth is "broken":

- [ ] Browser has `sales_session_id` cookie
- [ ] Session exists in database and not expired
- [ ] Fetch calls include `credentials: "include"`
- [ ] Request includes `X-Tenant-Slug` header (if needed)
- [ ] `.env.local` has correct tenant configuration
- [ ] User exists and is active
- [ ] User has sales rep profile
- [ ] Sales rep is active

## Quick Fixes

### Force Re-login
1. Clear all cookies: DevTools → Application → Clear site data
2. Go to: http://localhost:3000/sales/login
3. Login again

### Reset Session
```bash
# Delete all expired sessions
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.salesSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
console.log('Expired sessions deleted');
await p.\$disconnect();
"
```

### Verify Current Session
```bash
# Get active session ID
npx tsx scripts/debug-auth.ts

# Test with that session ID
SESSION_ID="<paste-from-above>"
curl -H "Cookie: sales_session_id=$SESSION_ID" \
  -H "X-Tenant-Slug: well-crafted" \
  http://localhost:3000/api/sales/auth/me | jq
```

## Contact & Resources

- **Migration Guide:** `/docs/API_CLIENT_MIGRATION.md`
- **Fix Summary:** `/docs/AUTH_FIX_SUMMARY.md`
- **API Client Utility:** `/src/lib/api-client.ts`
- **Test Scripts:** `/scripts/debug-auth.ts`, `/scripts/test-session.sh`

---

**TIP:** When in doubt, use the API client utility (`@/lib/api-client`) instead of raw `fetch()` calls. It handles credentials, headers, and error handling automatically!
