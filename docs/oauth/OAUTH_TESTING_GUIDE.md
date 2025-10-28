# OAuth Integration Testing Guide

## Overview
This guide provides comprehensive testing procedures for all three OAuth integrations (Google Calendar, Microsoft Outlook, and Mailchimp) in Leora2.

## Prerequisites
- All OAuth apps configured (see individual setup guides)
- Environment variables set in `.env.local`
- Development server running (`npm run dev`)
- Valid user account in database

## Testing Strategy

### Test Levels
1. **Unit Tests**: Individual OAuth functions
2. **Integration Tests**: Complete OAuth flow
3. **End-to-End Tests**: User journey
4. **Security Tests**: Token security and encryption
5. **Error Handling**: Edge cases and failures

## 1. Google Calendar Testing

### 1.1 OAuth Flow Test

**Step 1: Initiate OAuth**
```bash
curl -X GET http://localhost:3005/api/calendar/connect/google \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -v
```

**Expected Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Validation:**
- ✅ Status code: 200
- ✅ `authUrl` contains valid Google OAuth URL
- ✅ URL includes `client_id` parameter
- ✅ URL includes `scope` parameter
- ✅ URL includes `state` parameter

**Step 2: Complete Authorization (Manual)**
1. Copy `authUrl` from response
2. Open in browser
3. Sign in with Google account
4. Click "Allow" to grant permissions
5. You'll be redirected to callback URL

**Step 3: Handle Callback**
```bash
# This happens automatically in browser, but you can test the endpoint
curl -X POST http://localhost:3005/api/calendar/connect/google \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
    "state": "{\"email\":\"user@example.com\"}"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully"
}
```

**Validation:**
- ✅ Status code: 200
- ✅ Success message returned
- ✅ Token stored in database (encrypted)
- ✅ `expiresAt` set correctly

**Step 4: Verify Token Storage**
```bash
npx prisma studio
```

Navigate to `IntegrationToken` table and verify:
- ✅ Record exists with `provider: 'google'`
- ✅ `accessToken` is encrypted (not plain text)
- ✅ `refreshToken` is encrypted
- ✅ `expiresAt` is set (future date)
- ✅ `metadata` contains scope info

### 1.2 Calendar Operations Test

**List Calendar Events**
```bash
curl -X GET http://localhost:3005/api/calendar/events \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
```json
{
  "events": [
    {
      "id": "event123",
      "title": "Team Meeting",
      "start": "2025-10-28T10:00:00Z",
      "end": "2025-10-28T11:00:00Z"
    }
  ]
}
```

**Create Calendar Event**
```bash
curl -X POST http://localhost:3005/api/calendar/events \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Test Event - Automated",
    "description": "Created by OAuth test suite",
    "startTime": "2025-10-28T14:00:00Z",
    "endTime": "2025-10-28T15:00:00Z",
    "attendees": ["test@example.com"]
  }'
```

**Sync Calendar**
```bash
curl -X POST http://localhost:3005/api/calendar/sync \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### 1.3 Disconnect Test

```bash
curl -X DELETE http://localhost:3005/api/calendar/connect/google \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Validation:**
- ✅ Token deleted from database
- ✅ Subsequent API calls fail with 401
- ✅ User can re-connect successfully

## 2. Microsoft Outlook Testing

### 2.1 OAuth Flow Test

**Step 1: Initiate OAuth**
```bash
curl -X GET http://localhost:3005/api/calendar/connect/outlook \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -v
```

**Expected Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?..."
}
```

**Validation:**
- ✅ Status code: 200
- ✅ `authUrl` contains valid Microsoft OAuth URL
- ✅ URL includes `client_id` parameter
- ✅ URL includes `scope` parameter
- ✅ URL includes `state` parameter

**Step 2: Complete Authorization (Manual)**
1. Copy `authUrl` from response
2. Open in browser
3. Sign in with Microsoft account
4. Click "Accept" to grant permissions
5. You'll be redirected to callback URL

**Step 3: Handle Callback**
```bash
curl -X POST http://localhost:3005/api/calendar/connect/outlook \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
    "state": "{\"email\":\"user@example.com\"}"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Outlook Calendar connected successfully"
}
```

**Validation:**
- ✅ Status code: 200
- ✅ Success message returned
- ✅ Token stored in database (encrypted)
- ✅ `expiresAt` set correctly
- ✅ Account information in metadata

**Step 4: Verify Token Storage**
```bash
npx prisma studio
```

Navigate to `IntegrationToken` table and verify:
- ✅ Record exists with `provider: 'outlook'`
- ✅ `accessToken` is encrypted
- ✅ `refreshToken` is encrypted (if available)
- ✅ `expiresAt` is set
- ✅ `metadata` contains account info

### 2.2 Calendar Operations Test

Same as Google Calendar tests, using Outlook endpoints.

### 2.3 Disconnect Test

```bash
curl -X DELETE http://localhost:3005/api/calendar/connect/outlook \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## 3. Mailchimp Testing

### 3.1 OAuth Flow Test

**Step 1: Initiate OAuth**
```bash
curl -X GET http://localhost:3005/api/mailchimp/oauth \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -v
```

**Expected Response:**
```json
{
  "authUrl": "https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=..."
}
```

**Validation:**
- ✅ Status code: 200
- ✅ `authUrl` contains valid Mailchimp OAuth URL
- ✅ URL includes `client_id` parameter
- ✅ URL includes `redirect_uri` parameter
- ✅ URL includes `state` parameter

**Step 2: Complete Authorization (Manual)**
1. Copy `authUrl` from response
2. Open in browser
3. Sign in with Mailchimp account
4. Click "Allow" to grant permissions
5. You'll be redirected to callback URL

**Step 3: Handle Callback**
```bash
curl -X POST http://localhost:3005/api/mailchimp/oauth \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE_FROM_CALLBACK",
    "state": "BASE64_ENCODED_STATE"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Mailchimp connected successfully",
  "metadata": {
    "dc": "us1",
    "accountId": "username123"
  }
}
```

**Validation:**
- ✅ Status code: 200
- ✅ Success message returned
- ✅ Token stored in database (encrypted)
- ✅ Metadata contains `dc` (data center)
- ✅ Metadata contains `apiEndpoint`

**Step 4: Verify Token Storage**
```bash
npx prisma studio
```

Navigate to `IntegrationToken` table and verify:
- ✅ Record exists with `provider: 'mailchimp'`
- ✅ `accessToken` is encrypted
- ✅ `refreshToken` is null (Mailchimp doesn't use refresh tokens)
- ✅ `expiresAt` is null (tokens don't expire)
- ✅ `metadata` contains `dc` and `apiEndpoint`

### 3.2 Mailchimp Operations Test

**List Audiences**
```bash
curl -X GET http://localhost:3005/api/mailchimp/lists \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Expected Response:**
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

**Sync Audience**
```bash
curl -X POST http://localhost:3005/api/mailchimp/sync \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "listId": "abc123def4"
  }'
```

**Create Campaign**
```bash
curl -X POST http://localhost:3005/api/mailchimp/campaigns \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "regular",
    "listId": "abc123def4",
    "subject": "Test Campaign",
    "fromName": "Test Company",
    "replyTo": "test@example.com"
  }'
```

### 3.3 Disconnect Test

```bash
curl -X DELETE http://localhost:3005/api/mailchimp/oauth \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## 4. Security Testing

### 4.1 Token Encryption Test

**Verify Tokens Are Encrypted**
```bash
npx prisma studio
```

1. Open `IntegrationToken` table
2. Check `accessToken` field
3. Verify it's NOT plain text
4. Should look like: `encrypted:base64encodeddata`

### 4.2 State Parameter Validation

**Test CSRF Protection**
```bash
# Attempt callback with invalid state
curl -X POST http://localhost:3005/api/calendar/connect/google \
  -H "Content-Type: application/json" \
  -d '{
    "code": "valid_code",
    "state": "invalid_state"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid state parameter"
}
```

**Validation:**
- ✅ Status code: 400
- ✅ Error message indicates invalid state
- ✅ No token stored in database

### 4.3 Unauthorized Access Test

**Test Without Session**
```bash
curl -X GET http://localhost:3005/api/calendar/connect/google
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**Validation:**
- ✅ Status code: 401
- ✅ No OAuth flow initiated
- ✅ No sensitive data exposed

### 4.4 Token Refresh Test (Google/Outlook Only)

**Verify Token Refresh Works**
1. Wait for token to expire (or manually set `expiresAt` to past)
2. Make API call that requires token
3. System should automatically refresh token
4. Verify new token stored in database

## 5. Error Handling Tests

### 5.1 Invalid Redirect URI

**Google:**
```bash
# Manually construct OAuth URL with wrong redirect URI
# Should fail at Google's side with error message
```

**Expected:** Google shows error page about redirect_uri_mismatch

### 5.2 Invalid Client Credentials

**Temporarily change client ID in .env.local**
```bash
curl -X GET http://localhost:3005/api/calendar/connect/google
```

**Expected:** Error when trying to exchange code for token

### 5.3 User Denies Permission

1. Go through OAuth flow
2. Click "Deny" or "Cancel"
3. Verify app handles gracefully

**Expected:**
- User redirected back with error
- No token stored
- User can retry

### 5.4 Network Failures

**Simulate timeout:**
```bash
# Add delay to OAuth endpoint
# Verify timeout handling
```

## 6. Performance Testing

### 6.1 OAuth Flow Timing

Measure time for complete OAuth flow:

```bash
time curl -X GET http://localhost:3005/api/calendar/connect/google
```

**Expected:**
- Initial request: < 200ms
- Token exchange: < 2s
- Total flow: < 5s

### 6.2 Concurrent Requests

Test multiple users connecting simultaneously:

```bash
# Use tool like Apache Bench
ab -n 100 -c 10 http://localhost:3005/api/calendar/events
```

**Validation:**
- ✅ No deadlocks
- ✅ All requests handled
- ✅ Tokens isolated per user

## 7. Integration Testing Script

Create automated test script:

```bash
#!/bin/bash
# Save as: test-oauth-integration.sh

echo "Testing OAuth Integrations..."

# Test 1: Google Calendar
echo "1. Testing Google Calendar OAuth..."
GOOGLE_RESPONSE=$(curl -s http://localhost:3005/api/calendar/connect/google)
if echo "$GOOGLE_RESPONSE" | grep -q "authUrl"; then
  echo "✅ Google OAuth initiation successful"
else
  echo "❌ Google OAuth initiation failed"
fi

# Test 2: Microsoft Outlook
echo "2. Testing Microsoft Outlook OAuth..."
OUTLOOK_RESPONSE=$(curl -s http://localhost:3005/api/calendar/connect/outlook)
if echo "$OUTLOOK_RESPONSE" | grep -q "authUrl"; then
  echo "✅ Outlook OAuth initiation successful"
else
  echo "❌ Outlook OAuth initiation failed"
fi

# Test 3: Mailchimp
echo "3. Testing Mailchimp OAuth..."
MAILCHIMP_RESPONSE=$(curl -s http://localhost:3005/api/mailchimp/oauth)
if echo "$MAILCHIMP_RESPONSE" | grep -q "authUrl"; then
  echo "✅ Mailchimp OAuth initiation successful"
else
  echo "❌ Mailchimp OAuth initiation failed"
fi

echo "OAuth integration tests complete!"
```

Make executable:
```bash
chmod +x test-oauth-integration.sh
./test-oauth-integration.sh
```

## 8. Manual Testing Checklist

### Pre-Testing
- [ ] All environment variables set
- [ ] Database running and accessible
- [ ] Development server running
- [ ] Valid test accounts for each service

### Google Calendar
- [ ] OAuth flow completes successfully
- [ ] Token stored and encrypted
- [ ] Can list calendar events
- [ ] Can create calendar events
- [ ] Can sync calendar
- [ ] Can disconnect
- [ ] Token refresh works
- [ ] Error handling works

### Microsoft Outlook
- [ ] OAuth flow completes successfully
- [ ] Token stored and encrypted
- [ ] Can list calendar events
- [ ] Can create calendar events
- [ ] Can sync calendar
- [ ] Can disconnect
- [ ] Token refresh works
- [ ] Error handling works

### Mailchimp
- [ ] OAuth flow completes successfully
- [ ] Token stored and encrypted
- [ ] Can list audiences
- [ ] Can sync audience
- [ ] Can create campaigns
- [ ] Can disconnect
- [ ] Correct data center used
- [ ] Error handling works

### Security
- [ ] Tokens are encrypted in database
- [ ] State parameter validated
- [ ] HTTPS used in production
- [ ] No credentials in logs
- [ ] No credentials in error messages
- [ ] CSRF protection working
- [ ] Session validation working

### Error Cases
- [ ] Invalid redirect URI handled
- [ ] Invalid credentials handled
- [ ] User denial handled
- [ ] Network timeout handled
- [ ] Token expiration handled
- [ ] Missing environment variables handled

## 9. Automated Test Suite

Create test file: `/tests/oauth-integration.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('OAuth Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  describe('Google Calendar', () => {
    it('should initiate OAuth flow', async () => {
      const response = await fetch('http://localhost:3005/api/calendar/connect/google');
      const data = await response.json();
      expect(data).toHaveProperty('authUrl');
      expect(data.authUrl).toContain('accounts.google.com');
    });

    it('should reject unauthorized requests', async () => {
      const response = await fetch('http://localhost:3005/api/calendar/events');
      expect(response.status).toBe(401);
    });
  });

  describe('Microsoft Outlook', () => {
    it('should initiate OAuth flow', async () => {
      const response = await fetch('http://localhost:3005/api/calendar/connect/outlook');
      const data = await response.json();
      expect(data).toHaveProperty('authUrl');
      expect(data.authUrl).toContain('login.microsoftonline.com');
    });
  });

  describe('Mailchimp', () => {
    it('should initiate OAuth flow', async () => {
      const response = await fetch('http://localhost:3005/api/mailchimp/oauth');
      const data = await response.json();
      expect(data).toHaveProperty('authUrl');
      expect(data.authUrl).toContain('login.mailchimp.com');
    });
  });
});
```

Run tests:
```bash
npm test -- oauth-integration.test.ts
```

## 10. Troubleshooting Guide

### Common Issues

**Issue: "redirect_uri_mismatch"**
- Check exact URL in OAuth provider console
- Verify protocol (http vs https)
- Check port number
- Ensure no trailing slashes

**Issue: Token not storing**
- Check database connection
- Verify encryption key set
- Check Prisma schema
- Review error logs

**Issue: "Invalid state parameter"**
- State encoding/decoding mismatch
- Session expired during OAuth
- CSRF attack (intended behavior)

**Issue: 401 Unauthorized**
- Session cookie not set
- User not logged in
- Token expired
- Wrong tenant ID

## Summary

This testing guide covers:
- ✅ Complete OAuth flow testing for all 3 providers
- ✅ Security testing (encryption, CSRF)
- ✅ Error handling verification
- ✅ Performance benchmarks
- ✅ Automated test scripts
- ✅ Manual testing checklist
- ✅ Troubleshooting procedures

Run all tests before deploying to production!
