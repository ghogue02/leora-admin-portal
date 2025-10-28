# OAuth Integration Setup - Complete Guide

## Overview

This directory contains comprehensive documentation for setting up and managing OAuth integrations in Leora2. The application supports three OAuth providers:

1. **Google Calendar** - Calendar event synchronization
2. **Microsoft Outlook Calendar** - Calendar event synchronization
3. **Mailchimp** - Email marketing and audience management

## Quick Start

### For Development (Getting Started Today)

1. **Read Setup Guides** (1.5 hours each):
   - [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md)
   - [Microsoft Outlook Setup](./MICROSOFT_OUTLOOK_SETUP.md)
   - [Mailchimp Setup](./MAILCHIMP_SETUP.md)

2. **Configure OAuth Apps** (3 hours total):
   - Create OAuth apps in each provider's console
   - Save Client IDs and Client Secrets
   - Configure redirect URIs

3. **Update Environment Variables** (30 minutes):
   - Copy `.env.local.example` to `.env.local`
   - Add all OAuth credentials
   - Verify encryption key is set

4. **Test Integrations** (1 hour):
   - Follow [OAuth Testing Guide](./OAUTH_TESTING_GUIDE.md)
   - Verify all three OAuth flows work
   - Test calendar and Mailchimp operations

**Total Time: ~4 hours**

### For Production Deployment

1. **Complete Development Setup** (above)

2. **Review Security** (1 hour):
   - Read [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
   - Implement all security requirements
   - Run security audit

3. **Production Configuration** (2 hours):
   - Create production OAuth apps
   - Configure production redirect URIs
   - Set production environment variables

4. **Deploy to Production** (varies):
   - Follow [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT.md)
   - Complete all checklist items
   - Monitor post-deployment

**Total Time: ~3-5 hours (excluding deployment time)**

## Documentation Structure

### Setup Guides (How to Configure)

| Document | Purpose | Time Required | When to Use |
|----------|---------|---------------|-------------|
| [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md) | Configure Google OAuth app | 1.5 hours | Before first Google Calendar integration |
| [Microsoft Outlook Setup](./MICROSOFT_OUTLOOK_SETUP.md) | Configure Microsoft OAuth app | 1.5 hours | Before first Outlook Calendar integration |
| [Mailchimp Setup](./MAILCHIMP_SETUP.md) | Configure Mailchimp OAuth app | 1 hour | Before first Mailchimp integration |

### Operational Guides (How to Test & Deploy)

| Document | Purpose | Time Required | When to Use |
|----------|---------|---------------|-------------|
| [OAuth Testing Guide](./OAUTH_TESTING_GUIDE.md) | Test all OAuth integrations | 1-2 hours | After setup, before deployment |
| [Production Deployment](./PRODUCTION_DEPLOYMENT.md) | Deploy to production safely | 3-5 hours | Before production launch |
| [Security Best Practices](./SECURITY_BEST_PRACTICES.md) | Implement security measures | Ongoing | Throughout development and operations |

### Summary Document

| Document | Purpose | Time Required | When to Use |
|----------|---------|---------------|-------------|
| **This README** | Overview and navigation | 10 minutes | Start here! |

## Architecture Overview

### OAuth Flow Architecture

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Click "Connect Calendar"
       ↓
┌─────────────────────┐
│  Leora2 Frontend    │
│  (Next.js)          │
└──────┬──────────────┘
       │
       │ 2. Request OAuth URL
       ↓
┌──────────────────────────────────────────┐
│  Leora2 Backend API                      │
│  /api/calendar/connect/google (GET)      │
│  /api/calendar/connect/outlook (GET)     │
│  /api/mailchimp/oauth (GET)              │
└──────┬───────────────────────────────────┘
       │
       │ 3. Generate OAuth URL with state
       ↓
┌─────────────────────────────────┐
│  OAuth Provider                 │
│  (Google/Microsoft/Mailchimp)   │
│  - User authenticates           │
│  - User grants permissions      │
│  - Redirect with auth code      │
└──────┬──────────────────────────┘
       │
       │ 4. Callback with code & state
       ↓
┌──────────────────────────────────────────┐
│  Leora2 Backend API                      │
│  /api/calendar/connect/google (POST)     │
│  /api/calendar/connect/outlook (POST)    │
│  /api/mailchimp/oauth (POST)             │
│  - Validate state (CSRF protection)      │
│  - Exchange code for tokens              │
│  - Encrypt tokens                        │
│  - Store in database                     │
└──────┬───────────────────────────────────┘
       │
       │ 5. Return success
       ↓
┌─────────────┐
│   User      │
│ (Connected) │
└─────────────┘
```

### Token Storage Architecture

```
┌────────────────────────────────────────┐
│  IntegrationToken Table (Database)     │
├────────────────────────────────────────┤
│  id                  (UUID)            │
│  tenantId            (UUID)            │
│  provider            (String)          │
│  accessToken         (Encrypted Text)  │ ← Encrypted with ENCRYPTION_KEY
│  refreshToken        (Encrypted Text)  │ ← Encrypted with ENCRYPTION_KEY
│  expiresAt           (DateTime)        │
│  metadata            (JSON)            │
│  createdAt           (DateTime)        │
│  updatedAt           (DateTime)        │
└────────────────────────────────────────┘

Encryption:
┌───────────────┐
│  Plain Token  │
└───────┬───────┘
        │
        ↓ encryptToken()
┌────────────────────────────┐
│  Encrypted Token           │
│  (AES-256-GCM)             │
│  Format: "encrypted:..."   │
└────────────────────────────┘
```

### API Endpoint Architecture

#### Calendar Endpoints

**Google Calendar:**
- `GET /api/calendar/connect/google` - Initiate OAuth
- `POST /api/calendar/connect/google` - Handle callback
- `DELETE /api/calendar/connect/google` - Disconnect

**Microsoft Outlook:**
- `GET /api/calendar/connect/outlook` - Initiate OAuth
- `POST /api/calendar/connect/outlook` - Handle callback
- `DELETE /api/calendar/connect/outlook` - Disconnect

**Shared Calendar Endpoints:**
- `GET /api/calendar/events` - List events (all connected calendars)
- `POST /api/calendar/events` - Create event
- `GET /api/calendar/events/[id]` - Get event details
- `PUT /api/calendar/events/[id]` - Update event
- `DELETE /api/calendar/events/[id]` - Delete event
- `POST /api/calendar/sync` - Sync all calendars

#### Mailchimp Endpoints

- `GET /api/mailchimp/oauth` - Initiate OAuth
- `POST /api/mailchimp/oauth` - Handle callback
- `DELETE /api/mailchimp/oauth` - Disconnect
- `GET /api/mailchimp/lists` - List audiences
- `POST /api/mailchimp/sync` - Sync audience to Leora2
- `GET /api/mailchimp/campaigns` - List campaigns
- `POST /api/mailchimp/campaigns` - Create campaign
- `POST /api/mailchimp/campaigns/[id]/send` - Send campaign
- `GET /api/mailchimp/segments` - List segments
- `POST /api/mailchimp/webhooks` - Webhook endpoint

## Environment Variables Reference

### Required Variables

```env
# Database (Required)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Google Calendar OAuth (Required for Google Calendar)
GOOGLE_CLIENT_ID="your-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"
GOOGLE_REDIRECT_URI="http://localhost:3005/api/calendar/connect/google/callback"

# Microsoft Outlook OAuth (Required for Outlook Calendar)
MICROSOFT_CLIENT_ID="12345678-1234-1234-1234-123456789abc"
MICROSOFT_TENANT_ID="common"
MICROSOFT_CLIENT_SECRET="your-secret"
MICROSOFT_REDIRECT_URI="http://localhost:3005/api/calendar/connect/outlook/callback"

# Mailchimp OAuth (Required for Mailchimp)
MAILCHIMP_CLIENT_ID="123456789"
MAILCHIMP_CLIENT_SECRET="your-secret"
MAILCHIMP_REDIRECT_URI="http://localhost:3005/api/mailchimp/oauth/callback"

# Token Encryption (Required)
ENCRYPTION_KEY="randomly-generated-min-32-chars"
```

### Development vs Production

| Variable | Development | Production |
|----------|-------------|------------|
| Redirect URIs | `http://localhost:3005/...` | `https://yourdomain.com/...` |
| Client IDs | Development OAuth app | Production OAuth app |
| Client Secrets | Development secret | Production secret |
| HTTPS Required | No (HTTP ok) | Yes (HTTPS only) |
| Encryption Key | Dev key | Production key (different) |

## Common Tasks

### Adding a New OAuth Integration

1. **Create OAuth App** in provider console
2. **Add Environment Variables** to `.env.local`
3. **Create API Routes**:
   - `GET /api/[provider]/oauth` - Initiate
   - `POST /api/[provider]/oauth` - Callback
   - `DELETE /api/[provider]/oauth` - Disconnect
4. **Implement Token Encryption** using `encryptToken()`
5. **Add Tests** in testing guide
6. **Update Documentation**

### Testing OAuth Locally

```bash
# 1. Start development server
npm run dev

# 2. Test OAuth initiation
curl http://localhost:3005/api/calendar/connect/google

# 3. Open authUrl in browser
# 4. Complete OAuth flow
# 5. Verify token stored

# 6. Check database
npx prisma studio
```

### Debugging OAuth Issues

1. **Check Environment Variables**:
   ```bash
   # Verify variables loaded
   node -e "console.log(process.env.GOOGLE_CLIENT_ID)"
   ```

2. **Check Redirect URIs**:
   - Must match EXACTLY in OAuth provider console
   - Check protocol (http vs https)
   - Check port number
   - No trailing slashes

3. **Check Error Logs**:
   ```bash
   # Development
   npm run dev
   # Watch console for errors

   # Production
   # Check application logs in hosting platform
   ```

4. **Verify Token Encryption**:
   ```bash
   # Check database
   npx prisma studio
   # Token should start with "encrypted:"
   ```

### Rotating OAuth Credentials

```bash
# 1. Generate new credentials in provider console
# 2. Update .env.local (or production env vars)
# 3. Restart application
# 4. Test OAuth flow
# 5. Revoke old credentials (after grace period)
# 6. Document rotation in security log
```

## Security Considerations

### Critical Security Requirements

1. **Never Commit Secrets**
   - ✅ Use `.env.local` (in `.gitignore`)
   - ✅ Use environment variable services
   - ❌ Never hardcode credentials
   - ❌ Never commit `.env.local`

2. **Encrypt Tokens**
   - ✅ Always use `encryptToken()` before storing
   - ✅ Strong encryption key (min 32 chars)
   - ✅ Different key per environment
   - ❌ Never store plaintext tokens

3. **HTTPS in Production**
   - ✅ Force HTTPS for all OAuth flows
   - ✅ HSTS header configured
   - ✅ Valid SSL certificate
   - ❌ Never use HTTP in production

4. **Validate Everything**
   - ✅ Validate state parameter (CSRF protection)
   - ✅ Validate redirect URIs strictly
   - ✅ Sanitize all inputs
   - ✅ Generic error messages (no sensitive details)

5. **Monitor and Audit**
   - ✅ Log all OAuth events
   - ✅ Monitor for suspicious activity
   - ✅ Set up alerts
   - ✅ Regular security audits

See [Security Best Practices](./SECURITY_BEST_PRACTICES.md) for comprehensive security guidelines.

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "redirect_uri_mismatch" | Redirect URI doesn't match config | Check exact URL in OAuth console |
| "Invalid client" | Client ID/secret incorrect | Verify environment variables |
| "Invalid state" | State parameter mismatch | Check state generation/validation |
| Token not storing | Database or encryption issue | Check database connection and encryption key |
| 401 Unauthorized | Session or token issue | Verify user logged in, token not expired |

See individual setup guides for provider-specific troubleshooting.

## API Quotas and Limits

### Google Calendar API

- **Queries per day**: 1,000,000
- **Queries per user per second**: 10
- **Queries per second**: 500

**Best Practices:**
- Implement exponential backoff
- Cache calendar data when appropriate
- Batch operations when possible

### Microsoft Graph API

- **Per-user limit**: ~4,000 requests per 20 minutes
- **Per-app limit**: ~50,000 requests per 20 minutes

**Best Practices:**
- Respect `Retry-After` header
- Implement throttling
- Use delta queries for efficient sync

### Mailchimp API

- **Rate limit**: 10 requests/second per account
- **Daily limits**: Vary by plan

**Best Practices:**
- Implement rate limiting
- Use webhooks for real-time updates
- Cache audience data

## Support and Resources

### Official Documentation

- **Google Calendar API**: https://developers.google.com/calendar/api
- **Microsoft Graph Calendar**: https://docs.microsoft.com/en-us/graph/api/resources/calendar
- **Mailchimp API**: https://mailchimp.com/developer/marketing/

### OAuth Specifications

- **OAuth 2.0 RFC**: https://datatracker.ietf.org/doc/html/rfc6749
- **OAuth 2.0 Security**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics
- **PKCE RFC**: https://datatracker.ietf.org/doc/html/rfc7636

### Testing Tools

- **OAuth Playground (Google)**: https://developers.google.com/oauthplayground/
- **Graph Explorer (Microsoft)**: https://developer.microsoft.com/en-us/graph/graph-explorer
- **Mailchimp API Playground**: https://mailchimp.com/developer/tools/api-playground/

### Security Tools

- **SSL Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **Git Secret Scanning**: https://github.com/awslabs/git-secrets

## Development Workflow

### Day 1: Setup (Monday - 4 hours)

**Morning (2 hours):**
- [ ] Create Google OAuth app (1 hour)
- [ ] Create Microsoft OAuth app (1 hour)

**Afternoon (2 hours):**
- [ ] Create Mailchimp OAuth app (1 hour)
- [ ] Configure environment variables (30 min)
- [ ] Test all OAuth flows (30 min)

### Day 2: Testing & Documentation (Tuesday - 2 hours)

**Morning (1 hour):**
- [ ] Run comprehensive tests
- [ ] Fix any issues found
- [ ] Verify token encryption

**Afternoon (1 hour):**
- [ ] Document any custom configurations
- [ ] Create team training materials
- [ ] Review security checklist

### Week 2: Production Preparation (Wednesday - 4 hours)

**Tasks:**
- [ ] Create production OAuth apps
- [ ] Configure production environment
- [ ] Run security audit
- [ ] Complete deployment checklist

### Week 2: Production Launch (Thursday/Friday - varies)

**Tasks:**
- [ ] Deploy to production
- [ ] Monitor closely
- [ ] Address issues immediately
- [ ] Document lessons learned

## Team Collaboration

### For Developers

**What you need:**
1. Access to OAuth provider consoles (Google Cloud, Azure, Mailchimp)
2. Development environment set up
3. Understanding of OAuth 2.0 flow
4. Access to this documentation

**Your responsibilities:**
1. Implement OAuth endpoints correctly
2. Follow security best practices
3. Write comprehensive tests
4. Document code thoroughly

### For DevOps/SRE

**What you need:**
1. Access to production environment variables
2. SSL certificate management access
3. Monitoring and alerting setup access
4. Incident response plan access

**Your responsibilities:**
1. Secure credential management
2. Monitor OAuth metrics
3. Rotate credentials regularly
4. Respond to security incidents

### For Product/Business

**What you need:**
1. Understanding of OAuth user experience
2. Privacy policy and terms of service
3. Compliance requirements (GDPR, CCPA)
4. User support procedures

**Your responsibilities:**
1. Ensure clear user communication
2. Maintain privacy policy
3. Handle user data requests
4. Support escalation

## Next Steps

### Just Getting Started?

1. **Read this README** (you're here! ✓)
2. **Choose your first integration**:
   - Google Calendar? → [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md)
   - Outlook Calendar? → [Microsoft Outlook Setup](./MICROSOFT_OUTLOOK_SETUP.md)
   - Mailchimp? → [Mailchimp Setup](./MAILCHIMP_SETUP.md)
3. **Follow the setup guide** step-by-step
4. **Test your integration** using [OAuth Testing Guide](./OAUTH_TESTING_GUIDE.md)

### Ready for Production?

1. **Complete all development setup** (above)
2. **Review security** → [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
3. **Follow deployment checklist** → [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
4. **Launch and monitor**

### Need Help?

1. **Check troubleshooting sections** in each guide
2. **Review error logs** in application
3. **Consult official documentation** (links in each guide)
4. **Create detailed issue report** with:
   - What you tried
   - What happened
   - Error messages
   - Environment (dev/staging/prod)

## Changelog

### Version 1.0.0 (2025-10-27)

**Initial Documentation Release:**
- ✅ Google Calendar OAuth setup guide
- ✅ Microsoft Outlook OAuth setup guide
- ✅ Mailchimp OAuth setup guide
- ✅ OAuth testing guide
- ✅ Production deployment checklist
- ✅ Security best practices
- ✅ Complete README with architecture

**Future Enhancements:**
- Video tutorials for OAuth setup
- Automated testing scripts
- CI/CD integration guides
- Advanced security features
- Performance optimization guides

## Contributing

### Updating Documentation

When you make changes to OAuth implementation:

1. **Update relevant guide**:
   - Setup guides for configuration changes
   - Testing guide for new test cases
   - Security guide for new security measures

2. **Test all changes**:
   - Verify all steps still work
   - Update screenshots if UI changed
   - Test in both dev and production

3. **Update this README**:
   - Update architecture diagrams if needed
   - Update common tasks if new workflows
   - Update changelog with changes

### Documentation Standards

- **Be specific**: Exact commands, exact URLs
- **Include examples**: Real-world scenarios
- **Show both ✅ and ❌**: What to do and what NOT to do
- **Update regularly**: Keep in sync with code changes
- **Test everything**: Verify all steps work

## License

This documentation is part of the Leora2 project. See project LICENSE for details.

## Acknowledgments

- OAuth 2.0 specification authors
- Google, Microsoft, and Mailchimp developer documentation teams
- OWASP for security guidelines
- Community contributors

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
**Maintainer**: Leora2 Team

**Questions or Issues?** Open an issue in the project repository or contact the development team.
