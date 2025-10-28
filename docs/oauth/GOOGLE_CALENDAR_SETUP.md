# Google Calendar OAuth Setup Guide

## Overview
This guide walks through setting up Google Calendar OAuth integration for Leora2. The integration allows users to sync their calendar events with the Leora2 platform.

## Prerequisites
- Google Account
- Access to Google Cloud Console
- Leora2 application running locally or deployed

## Setup Steps

### 1. Create Google Cloud Project

1. **Navigate to Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter project name: `Leora2 Calendar Integration`
   - Select organization (if applicable)
   - Click "Create"

3. **Wait for Project Creation**
   - Project creation takes 30-60 seconds
   - You'll see a notification when complete

### 2. Enable Google Calendar API

1. **Navigate to APIs & Services**
   - From the hamburger menu (☰), select "APIs & Services" → "Library"
   - Or visit: https://console.cloud.google.com/apis/library

2. **Search for Calendar API**
   - In the search box, type "Google Calendar API"
   - Click on "Google Calendar API" from results

3. **Enable the API**
   - Click the "Enable" button
   - Wait for activation (10-20 seconds)

### 3. Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen**
   - Go to: APIs & Services → OAuth consent screen
   - Or visit: https://console.cloud.google.com/apis/credentials/consent

2. **Select User Type**
   - **Development/Testing**: Choose "External"
   - **Production (G Suite)**: Choose "Internal" if available
   - Click "Create"

3. **App Information**
   - **App name**: `Leora2`
   - **User support email**: Your email address
   - **App logo**: Upload your logo (optional, 120x120px minimum)
   - **Application home page**: `https://yourdomain.com` (or `http://localhost:3005` for dev)
   - **Application privacy policy**: `https://yourdomain.com/privacy` (required for production)
   - **Application terms of service**: `https://yourdomain.com/terms` (optional)

4. **Developer Contact Information**
   - Enter your email address
   - Click "Save and Continue"

5. **Scopes Configuration**
   - Click "Add or Remove Scopes"
   - Search for: `calendar.readonly`
   - Select: `https://www.googleapis.com/auth/calendar.readonly`
   - **Permissions included**:
     - See and download any calendar you can access using your Google Calendar
   - Click "Update"
   - Click "Save and Continue"

6. **Test Users (for External apps)**
   - Click "Add Users"
   - Add your email and any test users' emails
   - Click "Add"
   - Click "Save and Continue"

7. **Review Summary**
   - Review all settings
   - Click "Back to Dashboard"

### 4. Create OAuth 2.0 Credentials

1. **Navigate to Credentials**
   - Go to: APIs & Services → Credentials
   - Or visit: https://console.cloud.google.com/apis/credentials

2. **Create Credentials**
   - Click "Create Credentials" at the top
   - Select "OAuth client ID"

3. **Configure OAuth Client**
   - **Application type**: Select "Web application"
   - **Name**: `Leora2 Web Client`

4. **Add Authorized Redirect URIs**

   **For Development:**
   ```
   http://localhost:3005/api/calendar/connect/google/callback
   ```

   **For Production:**
   ```
   https://yourdomain.com/api/calendar/connect/google/callback
   ```

   **Important Notes:**
   - Must be EXACT match (including protocol, port, path)
   - No trailing slashes
   - Add both if testing locally and in production
   - Can add multiple redirect URIs

5. **Create Client**
   - Click "Create"
   - Modal will appear with credentials

### 5. Save Your Credentials

You'll see a modal with:
- **Client ID**: Format like `123456789-abc123def456.apps.googleusercontent.com`
- **Client Secret**: Format like `GOCSPX-abcdefg123456789`

**IMPORTANT**:
- Download JSON (click "Download JSON")
- Store securely - you'll need these values
- Client Secret should NEVER be committed to git

### 6. Configure Environment Variables

Add to `/web/.env.local`:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3005/api/calendar/connect/google/callback
```

**For Production** (`.env.production`):
```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/google/callback
```

### 7. Test OAuth Flow

1. **Start Development Server**
   ```bash
   cd /Users/greghogue/Leora2/web
   npm run dev
   ```

2. **Test OAuth Initiation**
   ```bash
   curl http://localhost:3005/api/calendar/connect/google
   ```

   Expected response:
   ```json
   {
     "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
   }
   ```

3. **Complete OAuth Flow**
   - Open the `authUrl` in browser
   - Sign in with Google account
   - Grant calendar permissions
   - You'll be redirected to callback URL
   - Check database for stored token

4. **Verify Token Storage**
   ```bash
   npx prisma studio
   ```
   - Navigate to `IntegrationToken` table
   - Verify token exists with `provider: 'google'`
   - Verify token is encrypted

### 8. Test Calendar Integration

1. **Verify API Endpoints**
   ```bash
   # List calendar events
   curl -X GET http://localhost:3005/api/calendar/events \
     -H "Cookie: your-session-cookie"

   # Sync calendar
   curl -X POST http://localhost:3005/api/calendar/sync \
     -H "Cookie: your-session-cookie"
   ```

2. **Create Test Event**
   ```bash
   curl -X POST http://localhost:3005/api/calendar/events \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "title": "Test Meeting",
       "description": "OAuth integration test",
       "startTime": "2025-10-28T10:00:00Z",
       "endTime": "2025-10-28T11:00:00Z",
       "attendees": ["test@example.com"]
     }'
   ```

3. **Verify in Google Calendar**
   - Open Google Calendar in browser
   - Check if test event appears
   - Verify all details match

## OAuth Scopes Explained

### Current Scope: `calendar.readonly`
- **What it allows**: Read-only access to user's calendar
- **Use cases**:
  - View upcoming events
  - Sync availability
  - Display calendar in UI

### Optional: Upgrade to `calendar` scope
If you need write access for creating events:

1. Update scope in code (`/src/app/api/calendar/connect/google/route.ts`):
   ```typescript
   const SCOPES = ['https://www.googleapis.com/auth/calendar'];
   ```

2. Update OAuth consent screen to include new scope

3. Users will need to re-authorize

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: Redirect URI in request doesn't match Google Cloud Console configuration

**Solution**:
1. Check exact URL in Google Cloud Console
2. Ensure no trailing slashes
3. Verify protocol (http vs https)
4. Check port number matches

### Error: "access_denied"
**Cause**: User denied permissions or app not verified

**Solution**:
1. If external app, ensure user is in test users list
2. Complete OAuth consent screen configuration
3. Verify all required scopes are requested

### Error: "invalid_client"
**Cause**: Client ID or secret is incorrect

**Solution**:
1. Verify `GOOGLE_CLIENT_ID` in `.env.local`
2. Verify `GOOGLE_CLIENT_SECRET` in `.env.local`
3. Check for typos or extra spaces
4. Regenerate credentials if needed

### Token Refresh Issues
**Cause**: Refresh token not stored or expired

**Solution**:
1. Ensure `access_type: 'offline'` in auth URL generation
2. Use `prompt: 'consent'` to force refresh token
3. Store refresh token in database
4. Implement token refresh logic

## Security Best Practices

### 1. Credential Management
- ✅ Store credentials in environment variables
- ✅ Never commit `.env.local` to git
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate secrets periodically (every 90 days)

### 2. Token Storage
- ✅ Encrypt tokens at rest (already implemented)
- ✅ Use secure database connections
- ✅ Implement token expiration checks
- ✅ Delete tokens on user disconnect

### 3. OAuth Flow
- ✅ Validate state parameter to prevent CSRF
- ✅ Use HTTPS in production
- ✅ Implement proper error handling
- ✅ Log OAuth events for audit

### 4. Scope Minimization
- ✅ Request minimum necessary scopes
- ✅ Explain scope usage to users
- ✅ Allow users to revoke access
- ✅ Document why each scope is needed

## Production Deployment Checklist

- [ ] OAuth consent screen fully configured
- [ ] Privacy policy URL added
- [ ] Terms of service URL added (optional)
- [ ] Production redirect URI configured
- [ ] Environment variables set in production
- [ ] HTTPS enabled
- [ ] Token encryption verified
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Security audit completed
- [ ] Rate limiting implemented
- [ ] User disconnect flow tested

## Monitoring & Maintenance

### What to Monitor
1. **OAuth Success Rate**: Track successful vs failed authorizations
2. **Token Refresh Rate**: Monitor refresh token usage
3. **API Quota**: Google Calendar API has daily limits
4. **Error Rates**: Track common error types
5. **User Disconnects**: Monitor revocation patterns

### Maintenance Tasks
- **Weekly**: Review error logs
- **Monthly**: Check API quota usage
- **Quarterly**: Rotate client secrets
- **Yearly**: Review and update scopes
- **As needed**: Update OAuth consent screen

## Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [OAuth 2.0 for Web Server Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth Playground](https://developers.google.com/oauthplayground/)

## Support

For issues with Google Calendar integration:
1. Check error logs in application
2. Verify environment variables
3. Test OAuth flow step-by-step
4. Review Google Cloud Console settings
5. Check Google Calendar API quota

## Common API Limits

- **Queries per day**: 1,000,000
- **Queries per user per second**: 10
- **Queries per second**: 500

**Note**: Free tier limits may be lower. Monitor usage in Google Cloud Console.
