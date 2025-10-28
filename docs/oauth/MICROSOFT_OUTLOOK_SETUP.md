# Microsoft Outlook Calendar OAuth Setup Guide

## Overview
This guide walks through setting up Microsoft Outlook Calendar OAuth integration for Leora2 using Azure Active Directory (Azure AD). This integration allows users to sync their Outlook calendar events with the Leora2 platform.

## Prerequisites
- Microsoft account (personal or work/school)
- Access to Azure Portal
- Leora2 application running locally or deployed

## Setup Steps

### 1. Access Azure Portal

1. **Navigate to Azure Portal**
   - Go to: https://portal.azure.com/
   - Sign in with your Microsoft account

2. **Navigate to Azure Active Directory**
   - In search bar, type "Azure Active Directory"
   - Click on "Azure Active Directory" service
   - Or access directly: https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/Overview

### 2. Register Application

1. **Navigate to App Registrations**
   - In left menu, click "App registrations"
   - Or go to: https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps

2. **Create New Registration**
   - Click "New registration" at the top

3. **Configure Application**
   - **Name**: `Leora2 Calendar Integration`
   - **Supported account types**: Choose based on your needs:
     - **Accounts in this organizational directory only**: For single tenant (most restrictive)
     - **Accounts in any organizational directory**: For multi-tenant business apps
     - **Accounts in any organizational directory and personal Microsoft accounts**: For widest access (recommended)
   - **Redirect URI**:
     - Platform: Select "Web"
     - URI: `http://localhost:3005/api/calendar/connect/outlook/callback`
   - Click "Register"

### 3. Save Application (Client) ID

After registration, you'll see the application overview page:

1. **Copy Application (client) ID**
   - Format: `12345678-1234-1234-1234-123456789abc`
   - This is your `MICROSOFT_CLIENT_ID` (also called `OUTLOOK_CLIENT_ID`)
   - Save this value

2. **Copy Directory (tenant) ID**
   - Format: `87654321-4321-4321-4321-cba987654321`
   - This is your `MICROSOFT_TENANT_ID` (also called `OUTLOOK_TENANT_ID`)
   - Save this value
   - **Note**: Use `common` instead for multi-tenant apps

### 4. Create Client Secret

1. **Navigate to Certificates & Secrets**
   - In left menu, click "Certificates & secrets"
   - Select "Client secrets" tab

2. **Create New Secret**
   - Click "New client secret"
   - **Description**: `Leora2 Production Secret`
   - **Expires**: Choose duration
     - **Recommended**: 24 months (maximum)
     - Set calendar reminder to rotate before expiration
   - Click "Add"

3. **Copy Secret Value**
   - **IMMEDIATELY** copy the "Value" (not the "Secret ID")
   - Format: `abc123~XYZ.789-DEF_456ghi`
   - This is your `MICROSOFT_CLIENT_SECRET` (also called `OUTLOOK_CLIENT_SECRET`)
   - **WARNING**: This value is only shown ONCE. If you lose it, you must create a new secret.

### 5. Configure API Permissions

1. **Navigate to API Permissions**
   - In left menu, click "API permissions"

2. **Add Permissions**
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Delegated permissions"

3. **Select Calendar Permissions**
   - Search for "Calendars"
   - Select the following permissions:
     - ✅ `Calendars.Read` - Read user calendars
     - ✅ `Calendars.ReadWrite` - Read and write user calendars
     - ✅ `offline_access` - Maintain access to data (for refresh tokens)
   - Click "Add permissions"

4. **Grant Admin Consent (if required)**
   - If you see "Grant admin consent for [organization]" button
   - Click it to grant organization-wide consent
   - **Note**: Only available to Global Administrator role
   - If not admin, users will be prompted individually

### 6. Add Redirect URIs

1. **Navigate to Authentication**
   - In left menu, click "Authentication"

2. **Add Platform** (if not already done)
   - If no platforms listed, click "Add a platform"
   - Select "Web"

3. **Configure Redirect URIs**

   **For Development:**
   ```
   http://localhost:3005/api/calendar/connect/outlook/callback
   ```

   **For Production:**
   ```
   https://yourdomain.com/api/calendar/connect/outlook/callback
   ```

   **Important Notes:**
   - Add both development and production URIs
   - Must be EXACT match (case-sensitive)
   - No trailing slashes
   - Protocol must match (http for local, https for production)

4. **Implicit Grant Settings**
   - Leave unchecked (not needed for authorization code flow)

5. **Advanced Settings**
   - **Allow public client flows**: No
   - **Default client type**: No

6. **Save Changes**
   - Click "Save" at the bottom

### 7. Configure Environment Variables

Add to `/web/.env.local`:

```env
# Microsoft Outlook OAuth
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_TENANT_ID=common
MICROSOFT_CLIENT_SECRET=abc123~XYZ.789-DEF_456ghi
MICROSOFT_REDIRECT_URI=http://localhost:3005/api/calendar/connect/outlook/callback

# Alternative naming (if code uses OUTLOOK_ prefix)
OUTLOOK_CLIENT_ID=12345678-1234-1234-1234-123456789abc
OUTLOOK_TENANT_ID=common
OUTLOOK_CLIENT_SECRET=abc123~XYZ.789-DEF_456ghi
OUTLOOK_REDIRECT_URI=http://localhost:3005/api/calendar/connect/outlook/callback
```

**For Production** (`.env.production`):
```env
# Microsoft Outlook OAuth
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_TENANT_ID=common
MICROSOFT_CLIENT_SECRET=abc123~XYZ.789-DEF_456ghi
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback

# Alternative naming (if code uses OUTLOOK_ prefix)
OUTLOOK_CLIENT_ID=12345678-1234-1234-1234-123456789abc
OUTLOOK_TENANT_ID=common
OUTLOOK_CLIENT_SECRET=abc123~XYZ.789-DEF_456ghi
OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback
```

### 8. Test OAuth Flow

1. **Start Development Server**
   ```bash
   cd /Users/greghogue/Leora2/web
   npm run dev
   ```

2. **Test OAuth Initiation**
   ```bash
   curl http://localhost:3005/api/calendar/connect/outlook
   ```

   Expected response:
   ```json
   {
     "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?..."
   }
   ```

3. **Complete OAuth Flow**
   - Open the `authUrl` in browser
   - Sign in with Microsoft account
   - Grant calendar permissions
   - You'll be redirected to callback URL
   - Check database for stored token

4. **Verify Token Storage**
   ```bash
   npx prisma studio
   ```
   - Navigate to `IntegrationToken` table
   - Verify token exists with `provider: 'outlook'`
   - Verify token is encrypted

### 9. Test Calendar Integration

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
       "title": "Test Outlook Meeting",
       "description": "OAuth integration test",
       "startTime": "2025-10-28T10:00:00Z",
       "endTime": "2025-10-28T11:00:00Z",
       "attendees": ["test@outlook.com"]
     }'
   ```

3. **Verify in Outlook Calendar**
   - Open Outlook Calendar (web or desktop)
   - Check if test event appears
   - Verify all details match

## API Permissions Explained

### Required Permissions

#### 1. `Calendars.Read`
- **What it allows**: Read user's calendar events
- **Use cases**:
  - View upcoming events
  - Sync availability
  - Display calendar in UI

#### 2. `Calendars.ReadWrite`
- **What it allows**: Create, update, and delete calendar events
- **Use cases**:
  - Create meetings from Leora2
  - Update event details
  - Cancel meetings
  - Block calendar time

#### 3. `offline_access`
- **What it allows**: Get refresh tokens for long-term access
- **Use cases**:
  - Access calendar without re-authentication
  - Sync events in background
  - Maintain persistent connection

### Optional Permissions

#### `User.Read`
- Get basic user profile information
- Useful for displaying user's name/photo

#### `Mail.Read`
- Read user's email (if email integration needed)

## Troubleshooting

### Error: "AADSTS50011: redirect_uri_mismatch"
**Cause**: Redirect URI in request doesn't match Azure AD configuration

**Solution**:
1. Check exact URL in Azure Portal → Authentication
2. Ensure no trailing slashes
3. Verify protocol (http vs https)
4. Check port number matches
5. URL is case-sensitive

### Error: "AADSTS65001: Invalid client"
**Cause**: Client ID is incorrect or app not found

**Solution**:
1. Verify `MICROSOFT_CLIENT_ID` in `.env.local`
2. Check Application (client) ID in Azure Portal
3. Ensure app registration is in correct directory

### Error: "AADSTS7000215: Invalid client secret"
**Cause**: Client secret is incorrect or expired

**Solution**:
1. Verify `MICROSOFT_CLIENT_SECRET` in `.env.local`
2. Check secret hasn't expired in Azure Portal
3. Create new secret if needed
4. Update environment variable

### Error: "AADSTS65005: Invalid scope"
**Cause**: Requested scope not configured in API permissions

**Solution**:
1. Go to Azure Portal → API permissions
2. Verify all required scopes are added
3. Grant admin consent if needed
4. Wait 5-10 minutes for changes to propagate

### Error: "Need admin approval"
**Cause**: Application requires admin consent for organization

**Solution**:
1. Contact Azure AD administrator
2. Or use personal Microsoft account for testing
3. Or request specific user consent (not organization-wide)

### Token Refresh Issues
**Cause**: Refresh token not obtained or invalid

**Solution**:
1. Ensure `offline_access` scope is requested
2. Check refresh token is stored in database
3. Implement token refresh logic in code
4. Verify token hasn't been revoked

## Understanding Tenant IDs

### Single Tenant App
Use your specific Directory (tenant) ID:
```env
MICROSOFT_TENANT_ID=87654321-4321-4321-4321-cba987654321
```

**When to use**:
- Internal business applications
- Organization-specific tools
- Maximum security/control

### Multi-Tenant App
Use `common`:
```env
MICROSOFT_TENANT_ID=common
```

**When to use**:
- Public SaaS applications
- Support any Microsoft account
- Personal and work accounts

### Organizations Only
Use `organizations`:
```env
MICROSOFT_TENANT_ID=organizations
```

**When to use**:
- B2B applications
- Work/school accounts only
- No personal Microsoft accounts

### Consumers Only
Use `consumers`:
```env
MICROSOFT_TENANT_ID=consumers
```

**When to use**:
- B2C applications
- Personal Microsoft accounts only
- No work/school accounts

## Security Best Practices

### 1. Credential Management
- ✅ Store credentials in environment variables
- ✅ Never commit `.env.local` to git
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate secrets before expiration
- ✅ Set calendar reminder for secret rotation

### 2. Token Storage
- ✅ Encrypt tokens at rest (already implemented)
- ✅ Use secure database connections
- ✅ Implement token expiration checks
- ✅ Delete tokens on user disconnect
- ✅ Store refresh tokens securely

### 3. OAuth Flow
- ✅ Validate state parameter to prevent CSRF
- ✅ Use HTTPS in production
- ✅ Implement proper error handling
- ✅ Log OAuth events for audit
- ✅ Handle token refresh automatically

### 4. Permission Minimization
- ✅ Request minimum necessary permissions
- ✅ Explain permission usage to users
- ✅ Allow users to revoke access
- ✅ Document why each permission is needed

## Production Deployment Checklist

- [ ] App registration created in Azure AD
- [ ] Production redirect URI configured
- [ ] Environment variables set in production
- [ ] HTTPS enabled
- [ ] Client secret expiration tracked
- [ ] Token encryption verified
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Admin consent granted (if needed)
- [ ] Security audit completed
- [ ] Rate limiting implemented
- [ ] User disconnect flow tested
- [ ] Token refresh logic verified

## Monitoring & Maintenance

### What to Monitor
1. **OAuth Success Rate**: Track successful vs failed authorizations
2. **Token Refresh Rate**: Monitor refresh token usage
3. **API Calls**: Microsoft Graph has throttling limits
4. **Error Rates**: Track common error types
5. **User Disconnects**: Monitor revocation patterns
6. **Secret Expiration**: Track client secret expiry dates

### Maintenance Tasks
- **Weekly**: Review error logs
- **Monthly**: Check API usage and throttling
- **Before expiry**: Rotate client secrets (set reminders)
- **Quarterly**: Review and update permissions
- **Yearly**: Audit application security
- **As needed**: Update redirect URIs for new environments

## API Rate Limits

Microsoft Graph has complex throttling:

### Per-User Limits
- **Default**: ~4,000 requests per 20 minutes per user
- **Peak**: May be lower during high usage

### Per-App Limits
- **Default**: ~50,000 requests per 20 minutes per app

### When Throttled
- **Response**: HTTP 429 Too Many Requests
- **Retry-After header**: Time to wait before retry
- **Implement exponential backoff**

## Resources

- [Microsoft Graph Calendar API](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- [Azure Portal](https://portal.azure.com/)

## Support

For issues with Outlook Calendar integration:
1. Check error logs in application
2. Verify environment variables
3. Test OAuth flow step-by-step
4. Review Azure AD app registration settings
5. Check Microsoft Graph API quotas
6. Verify client secret hasn't expired

## Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| AADSTS50011 | Redirect URI mismatch | Check Azure Portal redirect URIs |
| AADSTS65001 | Invalid client | Verify client ID |
| AADSTS7000215 | Invalid client secret | Check/regenerate secret |
| AADSTS65005 | Invalid scope | Add scope to API permissions |
| AADSTS90072 | Need admin approval | Request admin consent |
| AADSTS700016 | Application not found | Check tenant ID and client ID |
