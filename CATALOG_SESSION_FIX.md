# Quick Fix: Catalog Session Validation Error

## Issue
"Unable to validate session" error on /sales/catalog even after logout/login

## Root Cause
Browser may be caching old session or cookies not sending correctly

## Quick Fixes (Try in Order):

### Fix 1: Hard Refresh (30 seconds)
```
1. Press Cmd + Shift + R (Mac) or Ctrl + Shift + R (Windows)
2. This clears cache and reloads
3. Test catalog page again
```

### Fix 2: Clear Cookies (1 minute)
```
1. Open DevTools (F12)
2. Application tab → Cookies
3. Delete all cookies for localhost:3000
4. Logout
5. Login again
6. Test catalog
```

### Fix 3: Incognito Mode (1 minute)
```
1. Open incognito/private window
2. Go to http://localhost:3000/sales/login
3. Login
4. Navigate to /sales/catalog
5. Should work in clean session
```

### Fix 4: Clear Next.js Cache (2 minutes)
```bash
cd /Users/greghogue/Leora2/web
rm -rf .next
npm run dev
# Wait for rebuild
# Login and test
```

### Fix 5: Check Console (for devs)
```
1. Open DevTools (F12)
2. Console tab
3. Look for errors when loading catalog
4. Check Network tab → /api/sales/catalog request
5. Look at response (should be 200, not 401/403)
```

## Expected Behavior After Fix
- Catalog loads successfully
- Shows "2779 of 2779 SKUs"
- Products display in grid
- No session errors

## If Still Broken
Check `/web/src/app/api/sales/catalog/route.ts`:
- Should use `withSalesSession` 
- Should have `requireSalesRep: false` option
- Auth should match other working routes

The route exists and is correctly implemented, so this is likely a client-side caching issue.
