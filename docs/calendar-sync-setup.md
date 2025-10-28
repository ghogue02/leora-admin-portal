# Calendar Synchronization Setup Guide

This guide provides complete instructions for setting up Google Calendar and Outlook Calendar integrations with OAuth authentication.

## Table of Contents

- [Overview](#overview)
- [Google Calendar Setup](#google-calendar-setup)
- [Outlook Calendar Setup](#outlook-calendar-setup)
- [Environment Variables](#environment-variables)
- [Database Migration](#database-migration)
- [API Usage](#api-usage)
- [Testing](#testing)

## Overview

The calendar synchronization infrastructure supports:

- **Bidirectional sync** between local database and external calendars
- **Google Calendar** integration via OAuth 2.0
- **Outlook/Microsoft Calendar** integration via Microsoft Graph API
- **Automatic token refresh** for expired OAuth tokens
- **Event CRUD operations** with optional external calendar sync

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" for Google Workspace)
3. Fill in required fields:
   - App name: Your application name
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (for testing phase)

### 3. Create OAuth Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/calendar/connect/google/callback`
   - Production: `https://yourdomain.com/api/calendar/connect/google/callback`
5. Save the **Client ID** and **Client Secret**

### 4. Environment Variables

Add to your `.env.local`:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/connect/google/callback
```

## Outlook Calendar Setup

### 1. Register Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in details:
   - Name: Your application name
   - Supported account types: Choose based on requirements
   - Redirect URI:
     - Platform: Web
     - URI: `http://localhost:3000/api/calendar/connect/outlook/callback`
5. Click "Register"

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission" > "Microsoft Graph"
3. Select "Delegated permissions"
4. Add the following permissions:
   - `Calendars.Read`
   - `Calendars.ReadWrite`
   - `offline_access`
5. Click "Add permissions"
6. Click "Grant admin consent" (if you have admin rights)

### 3. Create Client Secret

1. Navigate to "Certificates & secrets"
2. Click "New client secret"
3. Add description and select expiration
4. Click "Add"
5. **Copy the secret value immediately** (it won't be shown again)

### 4. Note Your IDs

From the "Overview" page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

### 5. Environment Variables

Add to your `.env.local`:

```bash
OUTLOOK_CLIENT_ID=your_application_client_id
OUTLOOK_CLIENT_SECRET=your_client_secret
OUTLOOK_TENANT_ID=your_directory_tenant_id
OUTLOOK_REDIRECT_URI=http://localhost:3000/api/calendar/connect/outlook/callback
```

## Environment Variables

Complete `.env.local` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database
SHADOW_DATABASE_URL=postgresql://user:password@localhost:5432/shadow_database
DIRECT_URL=postgresql://user:password@localhost:5432/database

# NextAuth (if using)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/connect/google/callback

# Outlook Calendar
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_TENANT_ID=your_outlook_tenant_id
OUTLOOK_REDIRECT_URI=http://localhost:3000/api/calendar/connect/outlook/callback
```

## Database Migration

The `IntegrationToken` model should already exist in your Prisma schema. If not, add it:

```prisma
model IntegrationToken {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  provider     String    // "google" or "outlook"
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, provider])
  @@index([tenantId])
}
```

Run migration:

```bash
npx prisma migrate dev --name add_calendar_sync
npx prisma generate
```

## API Usage

### Connect Google Calendar

```typescript
// 1. Initiate OAuth flow
const response = await fetch('/api/calendar/connect/google');
const { authUrl } = await response.json();
window.location.href = authUrl;

// 2. After user authorizes, handle callback
// (This is done automatically by the backend)
await fetch('/api/calendar/connect/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, state }),
});
```

### Connect Outlook Calendar

```typescript
// 1. Initiate OAuth flow
const response = await fetch('/api/calendar/connect/outlook');
const { authUrl } = await response.json();
window.location.href = authUrl;

// 2. After user authorizes, handle callback
await fetch('/api/calendar/connect/outlook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code, state }),
});
```

### Trigger Sync

```typescript
// Bidirectional sync (default)
await fetch('/api/calendar/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google', // or 'outlook'
    direction: 'bidirectional', // or 'from' or 'to'
  }),
});
```

### Manage Events

```typescript
// Create event
const event = await fetch('/api/calendar/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Sales Meeting',
    description: 'Quarterly review',
    startTime: '2025-11-01T10:00:00Z',
    endTime: '2025-11-01T11:00:00Z',
    location: '123 Main St',
    customerId: 'customer-uuid',
    eventType: 'meeting',
    syncToProvider: 'google', // Optional: sync to external calendar
  }),
});

// Update event
await fetch('/api/calendar/events', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'event-uuid',
    title: 'Updated Meeting',
    syncToProvider: 'google',
  }),
});

// Delete event
await fetch('/api/calendar/events?id=event-uuid&syncToProvider=google', {
  method: 'DELETE',
});

// List events
const events = await fetch('/api/calendar/events?start=2025-11-01&end=2025-11-30');
```

## Testing

### Manual Testing Steps

1. **Connect Google Calendar**:
   - Navigate to your app's calendar settings
   - Click "Connect Google Calendar"
   - Authorize the application
   - Verify token is stored in database

2. **Connect Outlook Calendar**:
   - Click "Connect Outlook Calendar"
   - Sign in with Microsoft account
   - Grant permissions
   - Verify token is stored

3. **Test Sync**:
   - Create events in Google/Outlook
   - Trigger sync from your app
   - Verify events appear in local database
   - Create event in app
   - Verify it syncs to external calendar

4. **Test CRUD Operations**:
   - Create event via API
   - Update event via API
   - Delete event via API
   - Verify changes reflect in external calendar

### Automated Testing

```typescript
// Example Jest test
import { CalendarSyncService } from '@/lib/calendar-sync';

describe('CalendarSyncService', () => {
  it('should sync events from Google Calendar', async () => {
    const service = new CalendarSyncService();
    const result = await service.syncFromProvider(
      'tenant-id',
      'user-id',
      'google'
    );

    expect(result.success).toBe(true);
    expect(result.synced).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **Token Expired Error**:
   - Tokens are automatically refreshed
   - Check that refresh token is stored
   - Verify OAuth scopes include `offline_access` (Outlook)

2. **OAuth Redirect Mismatch**:
   - Ensure redirect URIs match exactly in OAuth config
   - Check for trailing slashes
   - Verify protocol (http vs https)

3. **Permission Denied**:
   - Verify API permissions are granted
   - Check if admin consent is required (Outlook)
   - Ensure user has access to calendars

4. **Events Not Syncing**:
   - Check date ranges in sync request
   - Verify token has not expired
   - Check API rate limits

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for all credentials
3. **Implement rate limiting** on sync endpoints
4. **Validate user ownership** of events before operations
5. **Log OAuth failures** for debugging
6. **Rotate client secrets** regularly
7. **Use HTTPS in production** for all OAuth flows

## Next Steps

- Implement webhook listeners for real-time sync
- Add calendar conflict detection
- Create UI components for calendar view
- Implement recurring event support
- Add calendar sharing features

## Support

For issues or questions:
- Check API documentation: [Google Calendar API](https://developers.google.com/calendar), [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
- Review error logs in application
- Contact development team
