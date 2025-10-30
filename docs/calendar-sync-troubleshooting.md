# Calendar Sync Troubleshooting Guide

## Overview

This guide helps diagnose and resolve issues with Google Calendar and Outlook Calendar synchronization in Leora CRM.

## Architecture

### Sync Components

1. **Token Management**
   - Proactive token refresh (5 minutes before expiry)
   - Encrypted token storage
   - Automatic retry with exponential backoff

2. **Delta Queries**
   - Google: Sync tokens for incremental updates
   - Outlook: Delta links for change tracking
   - 90%+ reduction in API calls vs full sync

3. **Error Handling**
   - Transient errors: Automatic retry with backoff
   - Auth errors: Require user re-authentication
   - Permanent errors: Auto-disable sync
   - Rate limits: Exponential backoff with jitter

4. **Health Monitoring**
   - Per-calendar sync metrics
   - Consecutive failure tracking
   - Auto-disable after 5 failures

## Common Issues

### 1. Token Expired or Invalid

**Symptoms:**
- Sync status shows "Authentication failed"
- 401/403 errors in logs
- Calendar marked as disabled

**Diagnosis:**
```bash
# Check sync status
curl http://localhost:3000/api/calendar/health
```

**Resolution:**
1. Navigate to Settings > Calendars
2. Click "Disconnect" on the failing calendar
3. Reconnect the calendar to get fresh tokens
4. Verify sync status shows "Active"

**Prevention:**
- System automatically refreshes tokens 5 minutes before expiry
- If refresh token expires, user must re-authenticate

---

### 2. Rate Limit Exceeded

**Symptoms:**
- Sync shows "Rate limit exceeded" error
- 429 errors in server logs
- Slow or paused syncing

**Resolution:**
1. System automatically handles rate limits with exponential backoff
2. Manual resync will respect rate limits
3. If persistent, check API quota limits in Google/Microsoft consoles

**API Quotas:**
- Google Calendar API: 1,000,000 requests/day
- Microsoft Graph API: Variable by license type

---

### 3. Consecutive Sync Failures

**Symptoms:**
- Calendar sync shows "Disabled" status
- 5+ consecutive failures in metrics
- Red error badge in settings UI

**Resolution:**
1. Review error message in calendar settings
2. Address root cause (usually auth or permissions)
3. Use manual resync button in UI to re-enable

---

## Health Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/api/calendar/health | jq '.'
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-25T10:30:00Z",
  "syncs": [{
    "provider": "google",
    "isActive": true,
    "lastSync": "2025-10-25T10:25:00Z",
    "consecutiveFailures": 0,
    "metrics": {
      "eventsSynced": 42,
      "syncDuration": 1234
    }
  }],
  "summary": {
    "totalSyncs": 2,
    "activeSyncs": 2,
    "syncsWithErrors": 0
  }
}
```

## Database Schema

### CalendarSyncMetadata Table

```sql
CREATE TABLE "CalendarSyncMetadata" (
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "syncToken" TEXT,
  "deltaLink" TEXT,
  "lastSuccessfulSync" TIMESTAMP,
  "consecutiveFailures" INTEGER DEFAULT 0,
  "eventsSynced" INTEGER DEFAULT 0,
  "syncDuration" INTEGER DEFAULT 0,
  "lastError" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  CONSTRAINT "CalendarSyncMetadata_pkey" PRIMARY KEY ("tenantId", "userId", "provider")
);
```

**Last Updated:** 2025-10-25
