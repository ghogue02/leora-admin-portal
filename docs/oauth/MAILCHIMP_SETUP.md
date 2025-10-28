# Mailchimp OAuth Setup Guide

## Overview
This guide walks through setting up Mailchimp OAuth integration for Leora2. This integration allows users to sync their Mailchimp audiences (lists), create campaigns, and manage email marketing directly from Leora2.

## Prerequisites
- Mailchimp account (Free or paid tier)
- Access to Mailchimp Developer Portal
- Leora2 application running locally or deployed

## Setup Steps

### 1. Access Mailchimp Developer Portal

1. **Navigate to Developer Portal**
   - Go to: https://mailchimp.com/developer/
   - Click "Log In" at top right
   - Sign in with your Mailchimp credentials

2. **Access Your Apps**
   - Click your profile icon (top right)
   - Select "Account" → "Extras" → "Registered apps"
   - Or go directly to: https://admin.mailchimp.com/account/oauth2/

### 2. Register New Application

1. **Create New App**
   - Click "Register An App" button

2. **App Information**
   - **App Name**: `Leora2 Integration`
   - **App Description**:
     ```
     Leora2 calendar and email marketing integration.
     Allows users to sync Mailchimp audiences and create campaigns
     from within the Leora2 platform.
     ```
   - **Company/Organization**: Your company name
   - **App Website**: `https://yourdomain.com` (or `http://localhost:3005` for testing)

3. **OAuth Configuration**

   **Redirect URI:**

   **For Development:**
   ```
   http://localhost:3005/api/mailchimp/oauth/callback
   ```

   **For Production:**
   ```
   https://yourdomain.com/api/mailchimp/oauth/callback
   ```

   **Important Notes:**
   - Must be EXACT match (case-sensitive)
   - No trailing slashes
   - Can only add ONE redirect URI per app
   - Create separate apps for dev and production if needed

4. **Terms & Conditions**
   - Read Mailchimp API Terms
   - Check "I agree to the terms"
   - Click "Create" button

### 3. Save Your Credentials

After app creation, you'll see:

1. **Client ID**
   - Format: Numeric ID like `123456789`
   - This is your `MAILCHIMP_CLIENT_ID`
   - Visible on app details page

2. **Client Secret**
   - Format: Alphanumeric string like `abc123def456789ghi012jkl345mno678`
   - This is your `MAILCHIMP_CLIENT_SECRET`
   - **IMPORTANT**: Shown only once during creation
   - Click "Show Secret" if you need to view again (limited times)

3. **Save Credentials Securely**
   - Store in password manager
   - Never commit to git
   - Keep backup in secure location

### 4. Configure Environment Variables

Add to `/web/.env.local`:

```env
# Mailchimp OAuth
MAILCHIMP_CLIENT_ID=123456789
MAILCHIMP_CLIENT_SECRET=abc123def456789ghi012jkl345mno678
MAILCHIMP_REDIRECT_URI=http://localhost:3005/api/mailchimp/oauth/callback
```

**For Production** (`.env.production`):
```env
# Mailchimp OAuth
MAILCHIMP_CLIENT_ID=123456789
MAILCHIMP_CLIENT_SECRET=abc123def456789ghi012jkl345mno678
MAILCHIMP_REDIRECT_URI=https://yourdomain.com/api/mailchimp/oauth/callback
```

### 5. Understand Mailchimp OAuth Scopes

Mailchimp OAuth doesn't use explicit scopes like Google/Microsoft. Instead:

- **Default Access**: Full access to account
- **Permissions Granted**:
  - Read/write audiences (lists)
  - Create/send campaigns
  - View/edit templates
  - Access reports and analytics
  - Manage automation workflows

**Note**: Users grant ALL permissions or none. No granular control.

### 6. Test OAuth Flow

1. **Start Development Server**
   ```bash
   cd /Users/greghogue/Leora2/web
   npm run dev
   ```

2. **Test OAuth Initiation**
   ```bash
   curl http://localhost:3005/api/mailchimp/oauth
   ```

   Expected response:
   ```json
   {
     "authUrl": "https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=..."
   }
   ```

3. **Complete OAuth Flow**
   - Open the `authUrl` in browser
   - Sign in with Mailchimp account
   - Click "Allow" to grant permissions
   - You'll be redirected to callback URL
   - Check database for stored token

4. **Verify Token Storage**
   ```bash
   npx prisma studio
   ```
   - Navigate to `IntegrationToken` table
   - Verify token exists with `provider: 'mailchimp'`
   - Verify token is encrypted
   - Check metadata contains `dc` (data center) and `api_endpoint`

### 7. Understanding Mailchimp Data Centers

Mailchimp uses different data centers (DCs) for different accounts:

**Common DCs:**
- `us1` - United States (most common)
- `us2` - United States (newer accounts)
- `us3` - United States
- `us19` - United States
- `eu1` - Europe

**Why it matters:**
- API endpoint varies by DC
- Format: `https://{dc}.api.mailchimp.com/3.0/`
- DC is returned during OAuth metadata call
- Must use correct DC for all API calls

**Example:**
```javascript
// Metadata response
{
  "dc": "us1",
  "api_endpoint": "https://us1.api.mailchimp.com/3.0/",
  "login_url": "https://login.mailchimp.com"
}
```

### 8. Test Mailchimp Integration

1. **List Audiences**
   ```bash
   curl -X GET http://localhost:3005/api/mailchimp/lists \
     -H "Cookie: your-session-cookie"
   ```

   Expected response:
   ```json
   {
     "lists": [
       {
         "id": "abc123def4",
         "name": "Main Audience",
         "stats": {
           "member_count": 1500
         }
       }
     ]
   }
   ```

2. **Sync Audience to Leora2**
   ```bash
   curl -X POST http://localhost:3005/api/mailchimp/sync \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "listId": "abc123def4",
       "segmentId": null
     }'
   ```

3. **Create Campaign**
   ```bash
   curl -X POST http://localhost:3005/api/mailchimp/campaigns \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "type": "regular",
       "listId": "abc123def4",
       "subject": "Test Campaign",
       "fromName": "Your Company",
       "replyTo": "reply@yourcompany.com",
       "content": {
         "html": "<html><body><h1>Test Email</h1></body></html>"
       }
     }'
   ```

4. **Verify in Mailchimp Dashboard**
   - Log into Mailchimp web interface
   - Check Campaigns section
   - Verify campaign appears as draft

## OAuth Token Characteristics

### Unique Aspects of Mailchimp Tokens

1. **No Expiration**
   - Mailchimp access tokens don't expire
   - Valid until user revokes access
   - No refresh token needed

2. **No Refresh Tokens**
   - Unlike Google/Microsoft
   - Token remains valid indefinitely
   - Simpler token management

3. **Account-Specific**
   - Token tied to specific Mailchimp account
   - Includes data center information
   - Must use correct API endpoint

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: Redirect URI in request doesn't match Mailchimp app configuration

**Solution**:
1. Check exact URL in Mailchimp Developer Portal
2. Ensure no trailing slashes
3. Verify protocol (http vs https)
4. Check port number matches
5. URL is case-sensitive
6. May need separate apps for dev/production

### Error: "invalid_client"
**Cause**: Client ID or secret is incorrect

**Solution**:
1. Verify `MAILCHIMP_CLIENT_ID` in `.env.local`
2. Verify `MAILCHIMP_CLIENT_SECRET` in `.env.local`
3. Check for typos or extra spaces
4. View secret in Mailchimp Developer Portal
5. Regenerate credentials if needed

### Error: "access_denied"
**Cause**: User denied permissions or clicked "Don't Allow"

**Solution**:
1. User needs to click "Allow" during OAuth
2. Check account has necessary permissions
3. Verify Mailchimp account is active (not suspended)

### Error: "Wrong data center"
**Cause**: Using incorrect API endpoint for account

**Solution**:
1. Check `metadata.dc` from OAuth response
2. Verify using correct API endpoint
3. Format: `https://{dc}.api.mailchimp.com/3.0/`
4. Store DC in database metadata

### API Rate Limit Errors
**Cause**: Exceeded Mailchimp API rate limits

**Solution**:
1. Implement exponential backoff
2. Cache API responses when possible
3. Batch operations
4. Consider upgrading Mailchimp plan

## Mailchimp API Limitations

### Free Tier
- **Max contacts**: 500
- **Max sends**: 1,000/month
- **Max campaigns**: Limited

### Paid Tiers
- **Essentials**: 5,000+ contacts
- **Standard**: 100,000+ contacts
- **Premium**: 200,000+ contacts

### Rate Limits
- **Default**: 10 requests/second per account
- **Burst**: Short bursts allowed
- **Daily limits**: Vary by plan

### Webhook Limits
- **Max webhooks**: 50 per audience
- **Max retries**: 10 failed attempts

## Security Best Practices

### 1. Credential Management
- ✅ Store credentials in environment variables
- ✅ Never commit `.env.local` to git
- ✅ Use different credentials for dev/staging/production
- ✅ Separate apps for different environments
- ✅ Keep backup of client secret securely

### 2. Token Storage
- ✅ Encrypt tokens at rest (already implemented)
- ✅ Use secure database connections
- ✅ Store data center information
- ✅ Delete tokens on user disconnect

### 3. OAuth Flow
- ✅ Validate state parameter to prevent CSRF
- ✅ Use HTTPS in production
- ✅ Implement proper error handling
- ✅ Log OAuth events for audit

### 4. API Usage
- ✅ Respect rate limits
- ✅ Implement retry logic
- ✅ Cache responses appropriately
- ✅ Use webhooks for real-time updates
- ✅ Monitor API quota usage

## Production Deployment Checklist

- [ ] Production app registered in Mailchimp
- [ ] Production redirect URI configured
- [ ] Environment variables set in production
- [ ] HTTPS enabled
- [ ] Token encryption verified
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Rate limiting implemented
- [ ] User disconnect flow tested
- [ ] Webhook endpoints configured (if using)
- [ ] API quota monitoring setup
- [ ] Data center handling verified

## Monitoring & Maintenance

### What to Monitor
1. **OAuth Success Rate**: Track successful vs failed authorizations
2. **API Usage**: Monitor requests against rate limits
3. **Error Rates**: Track common error types
4. **User Disconnects**: Monitor revocation patterns
5. **Campaign Performance**: Track email metrics
6. **Sync Failures**: Monitor audience sync issues

### Maintenance Tasks
- **Daily**: Monitor API rate limit usage
- **Weekly**: Review error logs
- **Monthly**: Audit connected accounts
- **Quarterly**: Review security practices
- **As needed**: Update redirect URIs

## Webhook Integration (Optional)

Mailchimp supports webhooks for real-time updates:

### Available Webhooks
- `subscribe` - New subscriber
- `unsubscribe` - User unsubscribed
- `profile` - Profile updated
- `cleaned` - Email bounced/invalid
- `upemail` - Email changed
- `campaign` - Campaign sent

### Setup Webhooks
1. In Mailchimp, go to Audience → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/mailchimp/webhooks`
3. Select events to track
4. Mailchimp will POST to your endpoint

### Verify Webhooks
- Mailchimp doesn't use signatures
- Verify request source by IP
- Validate payload structure
- Implement idempotency

## Resources

- [Mailchimp API Documentation](https://mailchimp.com/developer/marketing/docs/fundamentals/)
- [OAuth 2.0 Guide](https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/)
- [Developer Portal](https://admin.mailchimp.com/account/oauth2/)
- [API Playground](https://mailchimp.com/developer/tools/api-playground/)
- [Status Page](https://status.mailchimp.com/)

## Support

For issues with Mailchimp integration:
1. Check error logs in application
2. Verify environment variables
3. Test OAuth flow step-by-step
4. Review Mailchimp app configuration
5. Check Mailchimp account status
6. Verify API rate limits not exceeded
7. Confirm correct data center being used

## Common Use Cases

### 1. Audience Sync
Sync Leora2 contacts to Mailchimp audience:
- Create/update subscribers
- Manage segments
- Track engagement

### 2. Campaign Management
Create and send campaigns from Leora2:
- Design emails
- Schedule sends
- Track performance

### 3. Automation
Trigger automated workflows:
- Welcome series
- Abandoned cart
- Re-engagement

### 4. Reporting
Pull Mailchimp metrics into Leora2:
- Open rates
- Click rates
- Subscriber growth

## Advanced Features

### Merge Fields
Map Leora2 customer data to Mailchimp:
```javascript
{
  "FNAME": "John",
  "LNAME": "Doe",
  "COMPANY": "Acme Corp",
  "PHONE": "555-1234"
}
```

### Tags
Organize subscribers:
```javascript
{
  "tags": ["VIP", "California", "Wine-Enthusiast"]
}
```

### Segments
Create dynamic segments:
- Conditions based on merge fields
- Activity-based (opened campaign X)
- Location-based
