# Phase 4: Advanced Integrations - Setup Guide

## Overview

Phase 4 implements production-ready external integrations for Leora CRM:

- **Google Calendar** - OAuth 2.0 with automatic token refresh
- **Outlook Calendar** - Microsoft Graph API integration
- **Mailchimp** - OAuth 2.0 + webhook handlers
- **Connection Management** - Unified status dashboard and controls

## Prerequisites

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/connect/google/callback

# Microsoft Outlook Integration
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/calendar/connect/outlook/callback

# Mailchimp OAuth Integration
MAILCHIMP_CLIENT_ID=your-mailchimp-client-id
MAILCHIMP_CLIENT_SECRET=your-mailchimp-client-secret
MAILCHIMP_REDIRECT_URI=http://localhost:3000/api/mailchimp/oauth/callback
MAILCHIMP_WEBHOOK_SECRET=your-webhook-secret

# Legacy Mailchimp API Key (optional, for backwards compatibility)
MAILCHIMP_API_KEY=your-api-key
MAILCHIMP_SERVER_PREFIX=us1

# Token Encryption (generate with: openssl rand -base64 32)
TOKEN_ENCRYPTION_KEY=your-32-byte-encryption-key
```

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Leora CRM Integration"
3. Enable APIs:
   - Google Calendar API
   - Google OAuth 2.0

### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. User Type: External
3. App Information:
   - App name: "Leora CRM"
   - User support email: your-email@company.com
   - Developer contact: your-email@company.com
4. Scopes:
   - Add: `https://www.googleapis.com/auth/calendar.readonly`
   - Add: `https://www.googleapis.com/auth/calendar.events`
5. Test users: Add your email for testing

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: Web application
4. Name: "Leora CRM Web Client"
5. Authorized redirect URIs:
   - `http://localhost:3000/api/calendar/connect/google/callback`
   - `https://your-domain.com/api/calendar/connect/google/callback`
6. Save Client ID and Client Secret to `.env.local`

## Microsoft Outlook Setup

### 1. Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Name: "Leora CRM"
5. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
6. Redirect URI:
   - Platform: Web
   - URI: `http://localhost:3000/api/calendar/connect/outlook/callback`

### 2. Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission" > "Microsoft Graph"
3. Delegated permissions:
   - `Calendars.ReadWrite`
   - `offline_access`
4. Click "Grant admin consent"

### 3. Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: "Leora CRM Production"
4. Expires: 24 months
5. Copy secret value to `.env.local` (shown only once!)
6. Copy Application (client) ID to `.env.local`

## Mailchimp OAuth Setup

### 1. Register Mailchimp App

1. Go to [Mailchimp Developers](https://admin.mailchimp.com/account/oauth2/)
2. Click "Register Your Application"
3. Application Details:
   - Name: "Leora CRM"
   - Description: "Wine sales CRM integration"
   - Website: your-website.com
   - Redirect URI: `http://localhost:3000/api/mailchimp/oauth/callback`

### 2. Get OAuth Credentials

1. After registration, copy:
   - Client ID → `MAILCHIMP_CLIENT_ID`
   - Client Secret → `MAILCHIMP_CLIENT_SECRET`

### 3. Configure Webhooks

1. Go to [Mailchimp Webhooks](https://admin.mailchimp.com/lists/)
2. Select your audience
3. Settings > Webhooks
4. Create new webhook:
   - Callback URL: `https://your-domain.com/api/mailchimp/webhooks`
   - Events: Select all (subscribe, unsubscribe, profile, cleaned, upemail, campaign)
   - Send updates: Check "only when data changes"
   - Sources: Check "subscriber" and "admin"
5. Save and copy webhook secret to `MAILCHIMP_WEBHOOK_SECRET`

## Database Setup

The required tables (`IntegrationToken`, `CalendarEvent`) should already exist from previous phases. If not, create them:

```prisma
model IntegrationToken {
  id           String   @id @default(cuid())
  tenantId     String
  provider     String   // 'google' | 'outlook' | 'mailchimp'
  accessToken  String   @db.Text
  refreshToken String?  @db.Text
  expiresAt    DateTime?
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, provider])
  @@index([expiresAt])
}

model CalendarEvent {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String
  title       String
  description String?  @db.Text
  startTime   DateTime
  endTime     DateTime
  location    String?
  provider    String   // 'google' | 'outlook'
  externalId  String   // Event ID from provider
  customerId  String?
  taskId      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  task     Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([tenantId, userId, startTime])
  @@index([externalId])
  @@index([provider])
}
```

Run migration:
```bash
npx prisma migrate dev --name add-integration-tables
```

## Token Refresh Automation

### Setup Cron Job

Add to your crontab to refresh tokens hourly:

```bash
# Edit crontab
crontab -e

# Add this line:
0 * * * * cd /path/to/leora/web && node dist/jobs/refresh-tokens.js >> /var/log/leora-token-refresh.log 2>&1
```

### Alternative: Vercel Cron (Production)

If using Vercel, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 * * * *"
    }
  ]
}
```

Create `/api/cron/refresh-tokens/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { refreshAllTokens } from '@/jobs/refresh-tokens';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await refreshAllTokens();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

## Testing Integrations

### 1. Test Google Calendar

```bash
# Navigate to integrations page
open http://localhost:3000/sales/settings/integrations

# Click "Connect" for Google Calendar
# Should redirect to Google OAuth consent screen
# Approve permissions
# Should redirect back and show "Connected"

# Test sync
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "direction": "bidirectional"}'
```

### 2. Test Outlook Calendar

```bash
# Click "Connect" for Outlook Calendar
# Sign in with Microsoft account
# Approve permissions
# Verify connection status shows "Active"

# Test sync
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"provider": "outlook", "direction": "from"}'
```

### 3. Test Mailchimp OAuth

```bash
# Click "Connect" for Mailchimp
# Sign in to Mailchimp
# Approve access
# Verify account details shown

# Test webhook (simulate)
curl -X POST http://localhost:3000/api/mailchimp/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscribe",
    "data": {
      "email": "test@example.com",
      "list_id": "abc123",
      "merges": {
        "FNAME": "John",
        "LNAME": "Doe"
      }
    }
  }'
```

### 4. Test Batch Operations

```typescript
// Create multiple events
const response = await fetch('/api/calendar/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    events: [
      {
        title: 'Customer Visit 1',
        startTime: new Date('2025-11-01T10:00:00'),
        endTime: new Date('2025-11-01T11:00:00'),
        location: 'Acme Wine Bar',
      },
      {
        title: 'Customer Visit 2',
        startTime: new Date('2025-11-01T14:00:00'),
        endTime: new Date('2025-11-01T15:00:00'),
        location: 'Vino Restaurant',
      },
    ],
  }),
});

const result = await response.json();
console.log(`Created ${result.result.success} events`);
```

## Monitoring and Troubleshooting

### Check Integration Status

```bash
curl http://localhost:3000/api/integrations/status
```

Expected response:
```json
{
  "google-calendar": {
    "connected": true,
    "status": "active",
    "lastSync": "2025-10-27T00:00:00.000Z",
    "usageStats": {
      "label": "Synced Events",
      "value": "15 upcoming / 42 total"
    }
  },
  "outlook-calendar": {
    "connected": true,
    "status": "active"
  },
  "mailchimp": {
    "connected": true,
    "status": "active",
    "usageStats": {
      "label": "Account",
      "value": "us1"
    }
  }
}
```

### Common Issues

**Google OAuth Error: "redirect_uri_mismatch"**
- Ensure redirect URI in Google Cloud Console matches exactly
- Include protocol (http/https)
- No trailing slashes

**Microsoft OAuth Error: "AADSTS50011"**
- Check redirect URI in Azure portal
- Ensure correct tenant ID (use "common" for multi-tenant)

**Mailchimp Webhook Not Receiving Events**
- Verify webhook URL is publicly accessible (use ngrok for local testing)
- Check webhook secret matches environment variable
- Review Mailchimp webhook logs

**Token Refresh Failing**
- Check if refresh token is stored (`refreshToken` field not null)
- Verify OAuth was initiated with `access_type: 'offline'` (Google) or `offline_access` scope (Microsoft)
- Review error logs in token refresh job

### Logs

View token refresh logs:
```bash
tail -f /var/log/leora-token-refresh.log
```

View webhook logs:
```bash
# In your Next.js console
# Webhook events are logged to stdout
```

## Security Best Practices

1. **Token Encryption**: All tokens are encrypted at rest using `TOKEN_ENCRYPTION_KEY`
2. **HTTPS Only**: Always use HTTPS in production for OAuth callbacks
3. **Webhook Verification**: Verify Mailchimp webhook signatures
4. **Scope Minimization**: Request only necessary OAuth scopes
5. **Token Rotation**: Automatically refresh tokens before expiration
6. **Secure Secrets**: Never commit secrets to git; use environment variables

## Next Steps

After setup:

1. ✅ Test all OAuth flows end-to-end
2. ✅ Verify webhook delivery from Mailchimp
3. ✅ Confirm token refresh runs successfully
4. ✅ Monitor integration status dashboard
5. ✅ Create integration tests (see `/tests/integration/phase4-integrations.test.ts`)
6. ✅ Deploy to production with proper environment variables
7. ✅ Set up monitoring/alerting for integration failures

## Support

For issues or questions:
- Review logs in `/var/log/leora-token-refresh.log`
- Check integration status API: `/api/integrations/status`
- Consult provider documentation:
  - [Google Calendar API](https://developers.google.com/calendar)
  - [Microsoft Graph Calendar](https://learn.microsoft.com/en-us/graph/api/resources/calendar)
  - [Mailchimp API](https://mailchimp.com/developer/)

---

**Version**: 1.0.0
**Last Updated**: October 2025
**Phase**: 4 - Advanced Integrations
