# OAuth Production Deployment Checklist

## Overview
This comprehensive checklist ensures secure and successful OAuth integration deployment to production for Google Calendar, Microsoft Outlook, and Mailchimp.

## Pre-Deployment Checklist

### Environment Preparation
- [ ] Production domain registered and verified
- [ ] SSL/TLS certificate installed (HTTPS enabled)
- [ ] Production database provisioned and secured
- [ ] Environment variable management system configured
- [ ] Logging and monitoring systems configured
- [ ] Error tracking service configured (e.g., Sentry)
- [ ] Backup and disaster recovery plan in place

### Code Preparation
- [ ] All OAuth code reviewed and tested
- [ ] Security audit completed
- [ ] Token encryption verified
- [ ] Error handling comprehensive
- [ ] Rate limiting implemented
- [ ] Logging configured (no sensitive data logged)
- [ ] Tests passing (unit, integration, e2e)

## 1. Google Calendar Production Setup

### OAuth App Configuration

- [ ] **Create Production OAuth App**
  - Go to https://console.cloud.google.com/
  - Create new project or use existing production project
  - Enable Google Calendar API
  - Configure OAuth consent screen

- [ ] **OAuth Consent Screen**
  - App name: Production name (e.g., "Leora2")
  - User support email: Production support email
  - App logo: Upload official logo (120x120px minimum)
  - Application home page: `https://yourdomain.com`
  - Privacy policy URL: `https://yourdomain.com/privacy` (REQUIRED)
  - Terms of service URL: `https://yourdomain.com/terms` (RECOMMENDED)
  - Developer contact: Production contact email

- [ ] **Publishing Status**
  - For external apps: Submit for verification
  - Verification process: 3-5 business days
  - Required for >100 users
  - Alternative: Keep in testing mode (max 100 test users)

- [ ] **Production Redirect URI**
  ```
  https://yourdomain.com/api/calendar/connect/google/callback
  ```
  - Must use HTTPS (not HTTP)
  - Exact match required
  - No trailing slashes

- [ ] **Save Production Credentials**
  ```env
  GOOGLE_CLIENT_ID=production-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-production-secret
  GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/google/callback
  ```

### Security Configuration

- [ ] **Separate Dev/Prod Apps**
  - Use different OAuth app for production
  - Never share credentials between environments
  - Rotate secrets independently

- [ ] **API Restrictions**
  - Set API key restrictions (if using API keys)
  - Limit to production domains
  - Enable only required APIs

- [ ] **Monitoring**
  - Enable Google Cloud Console monitoring
  - Set up quota alerts
  - Monitor OAuth success/failure rates
  - Track API usage against quotas

## 2. Microsoft Outlook Production Setup

### Azure AD Configuration

- [ ] **Create Production App Registration**
  - Go to https://portal.azure.com/
  - Navigate to Azure Active Directory → App registrations
  - Click "New registration"
  - Name: "Leora2 Production"
  - Supported account types: Choose appropriate option
  - Production redirect URI: `https://yourdomain.com/api/calendar/connect/outlook/callback`

- [ ] **Configure Authentication**
  - Platform: Web
  - Redirect URI: `https://yourdomain.com/api/calendar/connect/outlook/callback`
  - Implicit grant: Leave unchecked
  - Advanced settings: Configure as needed

- [ ] **API Permissions**
  - Add Microsoft Graph permissions:
    - `Calendars.Read`
    - `Calendars.ReadWrite`
    - `offline_access`
  - Grant admin consent (if applicable)
  - Verify permissions are consented

- [ ] **Client Secret**
  - Create new client secret
  - Description: "Production Secret - Expires [DATE]"
  - Expires: 24 months (maximum)
  - **SET CALENDAR REMINDER** for rotation 1 month before expiry
  - Save secret value immediately (shown only once)

- [ ] **Save Production Credentials**
  ```env
  MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
  MICROSOFT_TENANT_ID=common
  MICROSOFT_CLIENT_SECRET=abc123~production-secret
  MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback

  # Alternative naming
  OUTLOOK_CLIENT_ID=12345678-1234-1234-1234-123456789abc
  OUTLOOK_TENANT_ID=common
  OUTLOOK_CLIENT_SECRET=abc123~production-secret
  OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback
  ```

### Security Configuration

- [ ] **Certificate-Based Authentication** (Optional, Advanced)
  - More secure than client secrets
  - Recommended for enterprise deployments
  - Requires certificate management

- [ ] **Conditional Access Policies**
  - Configure if using Azure AD Premium
  - MFA requirements
  - Trusted location policies
  - Device compliance

- [ ] **Monitoring**
  - Enable Azure AD sign-in logs
  - Set up alerts for failed authentications
  - Monitor API usage in Azure Portal
  - Track token refresh patterns

## 3. Mailchimp Production Setup

### Mailchimp App Configuration

- [ ] **Create Production App**
  - Go to https://admin.mailchimp.com/account/oauth2/
  - Click "Register An App"
  - App Name: "Leora2 Production"
  - Description: Production description
  - Company/Organization: Official company name
  - App Website: `https://yourdomain.com`

- [ ] **OAuth Configuration**
  - Redirect URI: `https://yourdomain.com/api/mailchimp/oauth/callback`
  - Must use HTTPS
  - Exact match required
  - **NOTE**: Can only have ONE redirect URI per app
  - Create separate app if need multiple environments

- [ ] **Save Production Credentials**
  ```env
  MAILCHIMP_CLIENT_ID=123456789
  MAILCHIMP_CLIENT_SECRET=production-secret-abc123
  MAILCHIMP_REDIRECT_URI=https://yourdomain.com/api/mailchimp/oauth/callback
  ```

### Security Configuration

- [ ] **Separate Apps for Environments**
  - Development app: `Leora2 Development`
  - Staging app: `Leora2 Staging`
  - Production app: `Leora2 Production`

- [ ] **API Key Management**
  - Keep credentials secure
  - Never commit to version control
  - Rotate periodically (quarterly recommended)

- [ ] **Monitoring**
  - Track API rate limits
  - Monitor webhook deliveries (if using)
  - Set up alerts for failures
  - Track campaign performance

## 4. Environment Variables Management

### Production Environment File

Create `.env.production` (NEVER commit to git):

```env
# Database
DATABASE_URL="postgresql://user:password@production-db:5432/leora_prod"
DIRECT_URL="postgresql://user:password@production-db:5432/leora_prod"

# Supabase
SUPABASE_URL="https://production.supabase.co"
SUPABASE_ANON_KEY="production-anon-key"
SUPABASE_SERVICE_ROLE_KEY="production-service-key"

# Google Calendar OAuth
GOOGLE_CLIENT_ID=production-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-production-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/google/callback

# Microsoft Outlook OAuth
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_TENANT_ID=common
MICROSOFT_CLIENT_SECRET=abc123~production-secret
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback

# Alternative Outlook naming
OUTLOOK_CLIENT_ID=12345678-1234-1234-1234-123456789abc
OUTLOOK_TENANT_ID=common
OUTLOOK_CLIENT_SECRET=abc123~production-secret
OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback

# Mailchimp OAuth
MAILCHIMP_CLIENT_ID=123456789
MAILCHIMP_CLIENT_SECRET=production-secret-abc123
MAILCHIMP_REDIRECT_URI=https://yourdomain.com/api/mailchimp/oauth/callback

# Encryption (generate new key for production)
ENCRYPTION_KEY="production-encryption-key-min-32-chars"

# Next.js
NEXTAUTH_SECRET="production-nextauth-secret"
NEXTAUTH_URL="https://yourdomain.com"

# API Keys
OPENAI_API_KEY="sk-prod-..."
ANTHROPIC_API_KEY="sk-ant-prod-..."

# Feature flags
NODE_ENV="production"
```

### Secure Credential Management

#### Option 1: Environment Variable Service (Recommended)
- [ ] Use Vercel Environment Variables
- [ ] Or use AWS Secrets Manager
- [ ] Or use Azure Key Vault
- [ ] Or use HashiCorp Vault

#### Option 2: CI/CD Secrets
- [ ] GitHub Actions Secrets
- [ ] GitLab CI/CD Variables
- [ ] CircleCI Environment Variables

#### Option 3: Container Secrets
- [ ] Docker Secrets
- [ ] Kubernetes Secrets
- [ ] AWS ECS Secrets

### Credential Security Checklist

- [ ] **Never Commit Secrets**
  - Add `.env*` to `.gitignore` (except `.env.example`)
  - Scan repository for exposed secrets
  - Use tools like `git-secrets` or `trufflehog`

- [ ] **Encryption at Rest**
  - Verify encryption key is strong (min 32 characters)
  - Use different encryption key for each environment
  - Rotate encryption keys annually

- [ ] **Access Control**
  - Limit who can access production credentials
  - Use principle of least privilege
  - Audit access logs regularly

- [ ] **Secret Rotation**
  - Google: Rotate client secret quarterly
  - Microsoft: Rotate before expiration (set reminders)
  - Mailchimp: Rotate quarterly
  - Document rotation procedures

## 5. SSL/TLS Configuration

- [ ] **SSL Certificate**
  - Valid SSL certificate installed
  - Certificate authority trusted
  - Certificate not expired
  - Certificate covers domain and subdomains (if needed)

- [ ] **HTTPS Enforcement**
  - Redirect HTTP to HTTPS
  - HSTS header configured
  - Secure cookies enabled

- [ ] **Test SSL Configuration**
  - Run SSL Labs test: https://www.ssllabs.com/ssltest/
  - Aim for A+ rating
  - Fix any vulnerabilities

## 6. Database Security

- [ ] **Connection Security**
  - Use SSL/TLS for database connections
  - Restrict database access by IP
  - Use strong database passwords
  - Regular security updates

- [ ] **Token Storage**
  - Verify tokens encrypted at rest
  - Test encryption/decryption
  - Backup encryption keys securely
  - Document key recovery process

- [ ] **Access Control**
  - Principle of least privilege
  - Separate read/write permissions
  - Audit database access logs

## 7. Monitoring and Logging

### Application Monitoring

- [ ] **Error Tracking**
  - Set up Sentry or similar
  - Configure error alerts
  - Filter sensitive data from logs
  - Set up PagerDuty or similar for critical errors

- [ ] **Performance Monitoring**
  - Track OAuth flow duration
  - Monitor API response times
  - Set up APM (Application Performance Monitoring)

- [ ] **Usage Metrics**
  - Track OAuth success/failure rates
  - Monitor API quota usage
  - Track token refresh patterns
  - User connection/disconnection metrics

### Logging Configuration

- [ ] **Structured Logging**
  - Use JSON format
  - Include correlation IDs
  - Filter sensitive data (tokens, secrets)
  - Set appropriate log levels

- [ ] **Log Retention**
  - Define retention policy (e.g., 90 days)
  - Archive important logs
  - Comply with data regulations

- [ ] **Security Logs**
  - Log all OAuth events
  - Failed authentication attempts
  - Token refresh events
  - Permission changes

## 8. Testing in Production-Like Environment

### Staging Environment

- [ ] **Setup Staging**
  - Mirror production configuration
  - Use separate OAuth apps
  - Use separate database
  - Use production-like data (anonymized)

- [ ] **End-to-End Testing**
  - Complete OAuth flows for all providers
  - Test token refresh
  - Test error handling
  - Load testing
  - Security testing

- [ ] **User Acceptance Testing**
  - Internal team testing
  - Beta user testing
  - Collect feedback
  - Fix issues before production launch

## 9. Deployment Steps

### Pre-Deployment

- [ ] **Code Review**
  - Security review completed
  - All tests passing
  - No TODOs or FIXMEs
  - Documentation updated

- [ ] **Database Migrations**
  - Test migrations in staging
  - Backup production database
  - Plan rollback strategy
  - Schedule during low-traffic period

- [ ] **Dependency Updates**
  - All dependencies up to date
  - Security vulnerabilities patched
  - Test after updates

### Deployment

- [ ] **Deploy Application**
  - Follow deployment procedure
  - Monitor deployment process
  - Verify health checks pass

- [ ] **Verify Environment Variables**
  - All variables set correctly
  - No development credentials
  - Test can read variables

- [ ] **Database Migrations**
  - Run migrations
  - Verify schema changes
  - Test application functionality

- [ ] **Smoke Testing**
  - Test critical paths
  - Verify OAuth flows work
  - Check error handling
  - Verify monitoring active

### Post-Deployment

- [ ] **Monitoring**
  - Watch error rates
  - Monitor performance metrics
  - Check logs for issues
  - Verify alerts working

- [ ] **User Testing**
  - Have team test all OAuth flows
  - Verify calendar operations
  - Test Mailchimp integration
  - Collect feedback

- [ ] **Documentation**
  - Update deployment docs
  - Document any issues encountered
  - Update runbooks
  - Update incident response procedures

## 10. Security Hardening

### Application Security

- [ ] **Rate Limiting**
  - Implement rate limiting on OAuth endpoints
  - Prevent brute force attacks
  - Configure appropriate limits

- [ ] **CSRF Protection**
  - Verify state parameter validation
  - Use secure session tokens
  - Implement CSRF tokens

- [ ] **Input Validation**
  - Validate all OAuth callback parameters
  - Sanitize user inputs
  - Prevent injection attacks

- [ ] **Error Messages**
  - Don't expose sensitive information
  - Generic error messages to users
  - Detailed logs server-side only

### Infrastructure Security

- [ ] **Firewall Configuration**
  - Restrict inbound traffic
  - Allow only necessary ports
  - Configure security groups

- [ ] **DDoS Protection**
  - Use CDN (Cloudflare, CloudFront)
  - Configure rate limiting
  - Have incident response plan

- [ ] **Regular Updates**
  - OS security patches
  - Application dependencies
  - Security scanning tools

## 11. Compliance and Privacy

### Data Protection

- [ ] **Privacy Policy**
  - Document OAuth data collection
  - Explain how tokens are stored
  - User rights and data deletion
  - Required for production

- [ ] **Terms of Service**
  - OAuth usage terms
  - User responsibilities
  - Service limitations

- [ ] **Data Retention**
  - Define retention policy
  - Automatic token cleanup
  - User data deletion on request

### Compliance

- [ ] **GDPR Compliance** (if applicable)
  - Right to be forgotten
  - Data portability
  - Consent management
  - Data processing agreements

- [ ] **CCPA Compliance** (if applicable)
  - California privacy rights
  - Data disclosure
  - Opt-out mechanisms

- [ ] **Industry-Specific**
  - HIPAA (if health data)
  - PCI DSS (if payment data)
  - SOC 2 (for enterprise)

## 12. Incident Response

### Preparation

- [ ] **Incident Response Plan**
  - Define security incidents
  - Escalation procedures
  - Communication plan
  - Roles and responsibilities

- [ ] **Contact Information**
  - Security team contacts
  - OAuth provider support
  - Infrastructure provider support

- [ ] **Playbooks**
  - Token compromise response
  - Data breach response
  - Service outage response

### Common Incidents

#### Token Compromise
1. Identify affected tokens
2. Revoke tokens in database
3. Force user re-authentication
4. Investigate breach source
5. Notify affected users (if required)
6. Document incident

#### OAuth Provider Outage
1. Monitor provider status pages
2. Implement graceful degradation
3. Queue failed requests
4. Communicate to users
5. Retry when service restored

#### Credential Leak
1. Immediately rotate credentials
2. Revoke compromised credentials
3. Update all deployments
4. Audit for unauthorized access
5. Document and review security

## 13. Maintenance Schedule

### Daily
- Monitor error rates
- Check system health
- Review critical alerts

### Weekly
- Review OAuth success/failure metrics
- Check API quota usage
- Review security logs
- Update dependencies (if needed)

### Monthly
- Security patch updates
- Review access logs
- Test backup restoration
- Review and update documentation

### Quarterly
- Rotate OAuth client secrets
- Security audit
- Load testing
- Review and update runbooks
- Team security training

### Annually
- Comprehensive security audit
- Disaster recovery drill
- Review compliance requirements
- Update privacy policy/terms
- Encryption key rotation

## 14. Rollback Plan

### Preparation

- [ ] **Version Control**
  - Tag production releases
  - Maintain rollback scripts
  - Document rollback procedures

- [ ] **Database Backups**
  - Automated daily backups
  - Test restoration regularly
  - Keep minimum 30 days of backups

- [ ] **Rollback Triggers**
  - Error rate thresholds
  - Performance degradation
  - Security incidents
  - Critical bugs

### Rollback Procedure

1. **Assess Situation**
   - Severity of issue
   - Impact on users
   - Data integrity concerns

2. **Execute Rollback**
   - Revert application code
   - Rollback database (if needed)
   - Verify health checks

3. **Communicate**
   - Notify team
   - Update status page
   - Notify affected users (if needed)

4. **Post-Mortem**
   - Document what went wrong
   - Identify root cause
   - Create action items
   - Update procedures

## 15. Launch Checklist

### Pre-Launch (1 Week Before)

- [ ] All OAuth apps configured for production
- [ ] All redirect URIs point to production domain
- [ ] SSL certificate installed and verified
- [ ] Environment variables set in production
- [ ] Monitoring and alerting configured
- [ ] Staging environment fully tested
- [ ] Security audit completed
- [ ] Privacy policy and terms published
- [ ] Support documentation ready
- [ ] Rollback plan documented
- [ ] Team trained on procedures

### Launch Day

- [ ] Deploy application to production
- [ ] Run database migrations
- [ ] Verify all environment variables loaded
- [ ] Smoke test all OAuth flows
- [ ] Monitor error rates
- [ ] Test from different networks
- [ ] Verify monitoring systems active
- [ ] Team on standby for issues

### Post-Launch (First Week)

- [ ] Monitor OAuth success rates daily
- [ ] Review error logs daily
- [ ] Collect user feedback
- [ ] Address any issues promptly
- [ ] Document lessons learned
- [ ] Optimize based on real usage
- [ ] Schedule post-launch review meeting

## 16. Success Metrics

Track these metrics post-launch:

### Technical Metrics
- OAuth success rate (target: >99%)
- Token refresh success rate (target: >99%)
- API response time (target: <500ms)
- Error rate (target: <0.1%)
- Uptime (target: 99.9%)

### User Metrics
- Connection success rate
- Time to complete OAuth flow
- User disconnection rate
- Support tickets related to OAuth

### Security Metrics
- Failed authentication attempts
- Token encryption success rate
- Security incident count (target: 0)
- Audit log completeness

## 17. Support and Documentation

### User Documentation

- [ ] **Setup Guides**
  - How to connect Google Calendar
  - How to connect Outlook Calendar
  - How to connect Mailchimp
  - Troubleshooting common issues

- [ ] **FAQ**
  - Why do we need calendar access?
  - What data do we access?
  - How to disconnect integration?
  - Privacy and security questions

### Technical Documentation

- [ ] **Deployment Guide**
  - This document
  - Environment setup
  - Rollback procedures

- [ ] **Runbooks**
  - Common incidents and solutions
  - Escalation procedures
  - Monitoring dashboards

- [ ] **API Documentation**
  - OAuth endpoint documentation
  - Integration guide for developers
  - Code examples

## Conclusion

This checklist ensures:
- ✅ Secure OAuth implementation
- ✅ Production-ready configuration
- ✅ Comprehensive monitoring
- ✅ Incident response preparation
- ✅ Compliance with regulations
- ✅ Documented procedures

Review and update this checklist regularly as requirements evolve.

**Before going live, verify EVERY checkbox is completed!**
