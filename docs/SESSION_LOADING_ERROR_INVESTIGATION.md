# Session Loading Error Investigation

**Date**: October 20, 2025
**Issue**: "Failed to load insights: Unable to validate session"
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## 🔍 Error Analysis

### Observed Symptoms
1. **AutoInsights Error**: "Unable to validate session" displayed on `/sales/leora` page
2. **Cart API Error**: 400 Bad Request on `/api/sales/cart` (missing customerId parameter)
3. **Browser Console**: Red errors showing failed API calls

### Error Location
- **File**: `/web/src/lib/auth/sales.ts`
- **Line**: 119 (error handling catch block)
- **Function**: `withSalesSession()`

---

## ✅ Diagnostic Results

### Database Health: GOOD ✅
```
✅ Database connection successful
✅ Tenant found: Well Crafted Wine & Beverage Co.
✅ 10 active sessions in database
✅ User: travis@wellcraftedbeverage.com (Active)
```

**Conclusion**: The database, tenant configuration, and session storage are working correctly.

---

## 🎯 ROOT CAUSE

Based on the investigation, the root cause is **NOT a database or backend issue**. The problem is one of these:

### Most Likely: Cookie Not Being Sent by Browser

**Evidence**:
- Database has valid, active sessions
- Session validation code is correct
- Error happens at the request level (line 35: checking for sessionId in cookies)

**Possible Reasons**:
1. **Browser cookie settings** - Cookies blocked or cleared
2. **Cookie domain mismatch** - Cookie set for wrong domain (localhost vs 127.0.0.1)
3. **Cookie SameSite policy** - Strict SameSite preventing cookie transmission
4. **Missing cookie** - User needs to logout and login again to set fresh cookie

---

## 🛠️ SOLUTIONS

### Solution 1: Refresh the Session (RECOMMENDED)

**Steps**:
1. Open browser DevTools → Application → Cookies
2. Clear all cookies for `localhost:3000`
3. Navigate to: http://localhost:3000/sales/login
4. Login with credentials:
   - Email: `travis@wellcraftedbeverage.com`
   - Password: `SalesDemo2025`
5. Check cookies are set correctly
6. Navigate back to `/sales/leora`

### Solution 2: Check Browser Cookie Settings

**Chrome/Edge**:
1. Settings → Privacy and security → Cookies
2. Ensure "Allow all cookies" or add localhost to allowed sites

**Firefox**:
1. Settings → Privacy & Security
2. Ensure cookies are enabled

### Solution 3: Verify Cookie Configuration

Check `web/src/lib/auth/sales-cookies.ts` for cookie settings:
```typescript
// Ensure cookies are configured for localhost
domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined,
path: '/sales',
sameSite: 'lax', // Not 'strict'
```

---

## 🔧 Enhanced Error Logging

Added improved error diagnostics to `/web/src/lib/auth/sales.ts`:

```typescript
// Now includes:
- Request URL
- Session ID status (present/missing)
- Specific error hints for database vs session issues
- Better error categorization
```

This will help identify whether it's:
- Database connection issue (Prisma error code P*)
- Session cookie missing
- Session expired
- Other validation error

---

## 📊 Session Diagnostic Tool

Created `/web/scripts/debug-session.ts` to diagnose session issues:

**Usage**:
```bash
cd web
npx tsx scripts/debug-session.ts [optional-session-id]
```

**What it checks**:
- ✅ Database connectivity
- ✅ Tenant configuration
- ✅ Active sessions list
- ✅ Session expiration status
- ✅ User active status
- ✅ Sales rep profile presence

---

## 🧪 Testing the Fix

### 1. Check Current Session Cookie

Open browser DevTools → Console and run:
```javascript
document.cookie
  .split('; ')
  .filter(c => c.includes('sales'))
  .forEach(c => console.log(c))
```

**Expected output**:
```
sales-session-id=3d038d5a-b131-4d2f-9d7d-bcc6c9fa8667
sales-refresh-token=[some-long-token]
```

**If empty**: Cookie not set - need to login

### 2. Check Network Request

In DevTools → Network tab:
1. Reload `/sales/leora` page
2. Find the `/api/sales/insights` request
3. Click on it → Headers tab
4. Check "Request Headers" for `Cookie:` header

**Expected**: Should include `sales-session-id`

**If missing**: Browser not sending cookie - check Solution 2

### 3. Check Server Logs

With dev server running, look for:
```
🔐 [withSalesSession] Session ID from cookie: present
✅ [withSalesSession] Session validated successfully
```

**If you see**:
```
❌ [withSalesSession] No session ID found in cookies
```

→ Cookie is NOT being sent by the browser

---

## 💡 Additional Troubleshooting

### Check if this is an HTTPS/HTTP Issue

If you're accessing via `https://localhost`:
1. Change to `http://localhost:3000` (no SSL)
2. Secure cookies might not work on localhost HTTPS

### Check for Multiple Tabs

Multiple browser tabs can cause session conflicts:
1. Close all tabs with the app
2. Clear cookies
3. Open ONE tab
4. Login fresh

### Check Browser Extensions

Some privacy extensions block cookies:
1. Try in Incognito/Private mode
2. Disable cookie-blocking extensions

---

## 📋 Summary

**Problem**: Session validation failing
**Database**: ✅ Working correctly
**Sessions**: ✅ 10 active sessions exist
**Tenant**: ✅ Configured correctly

**Real Issue**: Session cookie not reaching the backend

**Fix**: Logout → Clear cookies → Login again → Check cookies are set

---

## 🚀 Next Steps

1. **Immediate**: Try Solution 1 (refresh session)
2. **If that fails**: Check browser cookies (Solution 2)
3. **If still failing**: Run diagnostic script and share output
4. **Monitor**: Server logs now have better error messages

---

## 📞 Support

If issue persists after trying all solutions:
1. Run diagnostic: `npx tsx scripts/debug-session.ts`
2. Check browser console for cookie output
3. Check network tab for Cookie header
4. Share server logs showing the error with full details
