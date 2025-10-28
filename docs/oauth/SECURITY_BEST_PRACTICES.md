# OAuth Security Best Practices

## Overview
This document outlines critical security practices for implementing and maintaining OAuth integrations in Leora2. Following these practices ensures secure handling of user credentials, tokens, and sensitive data.

## Table of Contents
1. [Credential Management](#credential-management)
2. [Token Security](#token-security)
3. [OAuth Flow Security](#oauth-flow-security)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Network Security](#network-security)
7. [Monitoring and Auditing](#monitoring-and-auditing)
8. [Incident Response](#incident-response)
9. [Compliance](#compliance)
10. [Security Checklist](#security-checklist)

## 1. Credential Management

### Client ID and Client Secret Protection

#### ✅ DO:
- **Store in environment variables only**
  ```env
  # .env.local (NEVER commit)
  GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
  ```

- **Use different credentials per environment**
  - Development: `dev-client-id`
  - Staging: `staging-client-id`
  - Production: `prod-client-id`

- **Use secrets management services**
  - AWS Secrets Manager
  - Azure Key Vault
  - HashiCorp Vault
  - Vercel Environment Variables

- **Rotate credentials regularly**
  - Production: Every 90 days minimum
  - After team member leaves
  - After suspected compromise
  - Set calendar reminders

#### ❌ DON'T:
- Never commit credentials to git
- Never hardcode in application code
- Never share credentials between environments
- Never email or message credentials
- Never store in plaintext files
- Never expose in client-side code
- Never log credentials

### .gitignore Configuration

Ensure comprehensive .gitignore:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.development
.env.staging

# Secrets and keys
*.key
*.pem
secrets/
credentials.json

# Backup files
*.backup
*.bak
```

### Credential Rotation Procedure

1. **Generate new credentials** in OAuth provider console
2. **Update staging environment** with new credentials
3. **Test thoroughly** in staging
4. **Update production environment** with new credentials
5. **Verify production** is working
6. **Revoke old credentials** after grace period (24-48 hours)
7. **Document rotation** in security log

## 2. Token Security

### Token Storage

#### Encryption at Rest

**Always encrypt tokens before storing:**

```typescript
// ✅ CORRECT: Encrypt before storing
import { encryptToken } from '@/lib/token-encryption';

const encryptedToken = await encryptToken(accessToken);

await prisma.integrationToken.create({
  data: {
    accessToken: encryptedToken,
    // ...
  }
});
```

```typescript
// ❌ WRONG: Never store plaintext tokens
await prisma.integrationToken.create({
  data: {
    accessToken: plainTextToken, // NEVER DO THIS
  }
});
```

#### Encryption Key Management

**Strong encryption key:**
```env
# Minimum 32 characters, random
ENCRYPTION_KEY="randomly-generated-min-32-character-key-here"
```

**Best practices:**
- Use cryptographically random keys
- Minimum 32 characters (256-bit)
- Different key per environment
- Store in secrets manager
- Rotate annually
- Never commit to git

**Generate secure key:**
```bash
# Generate 32-byte random key
openssl rand -base64 32
```

### Token Transmission

#### In Transit Protection

- **Always use HTTPS** for token transmission
- Never send tokens via HTTP
- Never send tokens in URL parameters
- Use request body or headers only
- Enable HTTP Strict Transport Security (HSTS)

```typescript
// ✅ CORRECT: HTTPS with headers
const response = await fetch('https://api.example.com/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});
```

```typescript
// ❌ WRONG: HTTP or URL parameters
const response = await fetch(`http://api.example.com/endpoint?token=${token}`);
```

### Token Expiration

#### Implement Token Refresh

```typescript
// ✅ CORRECT: Check expiration and refresh
async function getValidToken(tokenData) {
  if (tokenData.expiresAt < new Date()) {
    // Token expired, refresh it
    return await refreshToken(tokenData.refreshToken);
  }
  return tokenData.accessToken;
}
```

#### Set Appropriate Lifetimes

- **Access tokens**: Short-lived (1 hour typical)
- **Refresh tokens**: Longer-lived (7-90 days)
- **Mailchimp tokens**: No expiration (monitor usage)

### Token Revocation

#### User-Initiated Disconnect

```typescript
// ✅ CORRECT: Complete token cleanup
async function disconnectIntegration(tenantId: string, provider: string) {
  // 1. Revoke token with provider (if supported)
  await revokeTokenWithProvider(token);

  // 2. Delete from database
  await prisma.integrationToken.delete({
    where: { tenantId_provider: { tenantId, provider } }
  });

  // 3. Clear any cached tokens
  await clearTokenCache(tenantId, provider);

  // 4. Log the disconnection
  await logSecurityEvent('token_revoked', { tenantId, provider });
}
```

#### Automatic Cleanup

- Delete expired tokens after grace period
- Remove orphaned tokens (no associated user)
- Clean up on user account deletion

## 3. OAuth Flow Security

### CSRF Protection with State Parameter

#### Generate Secure State

```typescript
// ✅ CORRECT: Cryptographically secure state
import crypto from 'crypto';

function generateState(userEmail: string) {
  const stateData = {
    email: userEmail,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  return Buffer.from(JSON.stringify(stateData)).toString('base64');
}
```

#### Validate State

```typescript
// ✅ CORRECT: Comprehensive state validation
function validateState(receivedState: string, expectedEmail: string) {
  try {
    const stateData = JSON.parse(
      Buffer.from(receivedState, 'base64').toString()
    );

    // Check email matches
    if (stateData.email !== expectedEmail) {
      throw new Error('Email mismatch');
    }

    // Check timestamp (prevent replay attacks)
    const maxAge = 10 * 60 * 1000; // 10 minutes
    if (Date.now() - stateData.timestamp > maxAge) {
      throw new Error('State expired');
    }

    return true;
  } catch (error) {
    return false;
  }
}
```

### Redirect URI Validation

#### Strict Matching

- **Must be exact match** (including protocol, port, path)
- No wildcards in production
- Register all legitimate URIs with provider
- Validate on server side

```typescript
// ✅ CORRECT: Strict validation
const ALLOWED_REDIRECT_URIS = [
  'https://app.example.com/oauth/callback',
  'http://localhost:3005/oauth/callback', // dev only
];

function validateRedirectUri(uri: string) {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}
```

### Authorization Code Handling

#### Single-Use Codes

- Use authorization code immediately
- Codes expire quickly (typically 10 minutes)
- Never reuse codes
- Prevent code interception attacks

```typescript
// ✅ CORRECT: Immediate exchange and validate
async function handleCallback(code: string, state: string) {
  // Validate state first
  if (!validateState(state)) {
    throw new Error('Invalid state');
  }

  // Exchange code immediately (within seconds)
  const tokens = await exchangeCodeForTokens(code);

  // Mark code as used (prevent replay)
  await markCodeAsUsed(code);

  return tokens;
}
```

## 4. API Security

### Rate Limiting

#### Implement Rate Limits

```typescript
// ✅ CORRECT: Rate limiting middleware
import rateLimit from 'express-rate-limit';

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many OAuth attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to OAuth endpoints
app.use('/api/calendar/connect', oauthLimiter);
app.use('/api/mailchimp/oauth', oauthLimiter);
```

#### Provider Rate Limits

Respect provider limits:

**Google Calendar API:**
- 10 requests per second per user
- 500 requests per second total

**Microsoft Graph API:**
- ~4,000 requests per 20 minutes per user

**Mailchimp API:**
- 10 requests per second per account

### Input Validation

#### Sanitize All Inputs

```typescript
// ✅ CORRECT: Validate and sanitize
import { z } from 'zod';

const oauthCallbackSchema = z.object({
  code: z.string().min(1).max(1000),
  state: z.string().min(1).max(1000),
  error: z.string().optional(),
});

async function handleCallback(request: Request) {
  const parsed = oauthCallbackSchema.safeParse(request.body);

  if (!parsed.success) {
    throw new Error('Invalid callback parameters');
  }

  // Use validated data
  const { code, state } = parsed.data;
  // ...
}
```

### Error Handling

#### Secure Error Messages

```typescript
// ✅ CORRECT: Generic user messages, detailed logs
try {
  await exchangeCodeForTokens(code);
} catch (error) {
  // Log detailed error server-side
  logger.error('Token exchange failed', {
    error: error.message,
    code: code.substring(0, 10) + '...', // Partial code only
  });

  // Return generic message to user
  return res.status(500).json({
    error: 'Failed to complete authentication'
  });
}
```

```typescript
// ❌ WRONG: Exposing sensitive details
catch (error) {
  return res.status(500).json({
    error: error.message, // May expose secrets or internal details
    stack: error.stack,   // NEVER expose stack traces
  });
}
```

## 5. Database Security

### Connection Security

#### Secure Connections

```env
# ✅ CORRECT: SSL/TLS enabled
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

#### Access Control

- Principle of least privilege
- Separate read/write permissions
- Application-specific database users
- No shared credentials

### Data Protection

#### Sensitive Data Handling

```typescript
// ✅ CORRECT: Only store necessary data
interface IntegrationToken {
  accessToken: string;      // Encrypted
  refreshToken: string;     // Encrypted
  expiresAt: Date;         // Not sensitive
  metadata: {
    scope: string[];       // Not sensitive
    // DON'T store: passwords, credit cards, SSN, etc.
  };
}
```

### Backup Security

- Encrypt database backups
- Secure backup storage
- Regular backup testing
- Access logs for backups

## 6. Network Security

### HTTPS/TLS

#### Enforce HTTPS

```typescript
// ✅ CORRECT: Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' &&
      process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});
```

#### Security Headers

```typescript
// ✅ CORRECT: Set security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Firewall Configuration

- Allow only necessary ports
- Restrict database access
- Use security groups
- Regular security audits

## 7. Monitoring and Auditing

### Security Event Logging

#### Log Critical Events

```typescript
// ✅ CORRECT: Comprehensive security logging
async function logSecurityEvent(
  eventType: string,
  details: Record<string, any>
) {
  await logger.security({
    timestamp: new Date(),
    eventType,
    userId: details.userId,
    tenantId: details.tenantId,
    provider: details.provider,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    success: details.success,
    // Never log: tokens, secrets, passwords
  });
}

// Log these events:
// - OAuth initiation
// - OAuth success/failure
// - Token refresh
// - Token revocation
// - Permission changes
// - Failed authentication
// - Suspicious activity
```

### Monitoring Alerts

#### Set Up Alerts

Alert on:
- Unusual number of failed OAuth attempts
- Token refresh failures
- Unexpected API errors
- Rate limit violations
- Security policy violations
- Suspicious IP addresses

### Regular Audits

#### Security Audit Schedule

**Weekly:**
- Review failed authentication logs
- Check for suspicious patterns
- Verify rate limits effective

**Monthly:**
- Review access permissions
- Audit token storage
- Check encryption status
- Update dependencies

**Quarterly:**
- Comprehensive security review
- Penetration testing
- Code security audit
- Credential rotation

## 8. Incident Response

### Incident Types

#### Token Compromise

**Immediate Actions:**
1. Revoke compromised token
2. Force user re-authentication
3. Audit for unauthorized access
4. Investigate breach source
5. Notify affected users (if required by law)

#### Credential Leak

**Immediate Actions:**
1. Rotate all credentials immediately
2. Revoke old credentials
3. Deploy new credentials
4. Audit for unauthorized usage
5. Review source code/logs
6. Improve secret detection

#### Data Breach

**Immediate Actions:**
1. Contain the breach
2. Assess scope and impact
3. Preserve evidence
4. Notify stakeholders
5. Comply with legal requirements (GDPR, CCPA, etc.)
6. Implement fixes
7. Post-mortem analysis

### Incident Response Plan

**Preparation:**
- Document procedures
- Assign roles and responsibilities
- Contact information ready
- Communication templates prepared

**Detection:**
- Automated monitoring
- User reports
- Security scans
- Third-party notifications

**Response:**
- Follow documented procedures
- Escalate appropriately
- Communicate clearly
- Document everything

**Recovery:**
- Restore normal operations
- Verify security
- Monitor closely
- Update procedures

**Post-Incident:**
- Root cause analysis
- Lessons learned
- Update documentation
- Improve defenses

## 9. Compliance

### Data Privacy Regulations

#### GDPR (Europe)

**Requirements:**
- User consent for data processing
- Right to access data
- Right to be forgotten
- Data portability
- Privacy by design
- Data protection officer (if applicable)

**Implementation:**
```typescript
// ✅ CORRECT: GDPR-compliant token deletion
async function handleUserDeletion(userId: string) {
  // Delete all tokens
  await prisma.integrationToken.deleteMany({
    where: { tenant: { users: { some: { id: userId } } } }
  });

  // Delete all related data
  await prisma.calendarEvent.deleteMany({
    where: { userId }
  });

  // Log deletion (for compliance)
  await logGDPREvent('user_data_deleted', { userId });
}
```

#### CCPA (California)

**Requirements:**
- Disclosure of data collection
- Right to know what data is collected
- Right to delete data
- Right to opt-out
- No discrimination for opting out

### Industry Standards

#### OAuth 2.0 Security Best Practices

Follow RFC 6749 and RFC 8252:
- Use authorization code flow
- Implement PKCE for mobile/SPA
- Validate redirect URIs strictly
- Use state parameter
- Short-lived tokens

#### OWASP Top 10

Protect against:
1. Injection attacks
2. Broken authentication
3. Sensitive data exposure
4. XML external entities
5. Broken access control
6. Security misconfiguration
7. Cross-site scripting
8. Insecure deserialization
9. Using components with known vulnerabilities
10. Insufficient logging and monitoring

## 10. Security Checklist

### Pre-Production

- [ ] All credentials in environment variables (never hardcoded)
- [ ] Different credentials for dev/staging/prod
- [ ] `.env*` files in `.gitignore`
- [ ] No secrets committed to git (verify with scanner)
- [ ] Strong encryption key generated (min 32 chars)
- [ ] Tokens encrypted at rest
- [ ] HTTPS enforced (production)
- [ ] HSTS header configured
- [ ] Secure cookies enabled
- [ ] State parameter validation implemented
- [ ] Redirect URI strict validation
- [ ] Rate limiting on OAuth endpoints
- [ ] Input validation on all endpoints
- [ ] Generic error messages (no sensitive details)
- [ ] Security logging configured
- [ ] Monitoring and alerts set up
- [ ] Incident response plan documented
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR/CCPA compliance reviewed
- [ ] Security audit completed

### Production

- [ ] SSL certificate valid and not expired
- [ ] Database connections encrypted
- [ ] Firewall configured correctly
- [ ] Security headers set
- [ ] Token refresh working
- [ ] Token revocation tested
- [ ] Failed auth attempts logged
- [ ] Suspicious activity monitoring active
- [ ] Backup and recovery tested
- [ ] Access controls verified
- [ ] Dependency vulnerabilities patched
- [ ] Regular security audits scheduled

### Ongoing Maintenance

- [ ] Credential rotation scheduled (quarterly)
- [ ] Encryption key rotation scheduled (annually)
- [ ] Security log review (weekly)
- [ ] Dependency updates (monthly)
- [ ] Penetration testing (annually)
- [ ] Team security training (quarterly)
- [ ] Incident response drills (bi-annually)
- [ ] Privacy policy review (annually)

## Resources

### Security Tools

- **Secret Scanning**: `trufflehog`, `git-secrets`, `detect-secrets`
- **Dependency Scanning**: `npm audit`, `snyk`, `dependabot`
- **SAST**: `SonarQube`, `Checkmarx`, `Veracode`
- **DAST**: `OWASP ZAP`, `Burp Suite`
- **Monitoring**: `Sentry`, `Datadog`, `New Relic`

### Further Reading

- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Microsoft Identity Platform Best Practices](https://docs.microsoft.com/en-us/azure/active-directory/develop/identity-platform-integration-checklist)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

## Conclusion

Security is not a one-time task but an ongoing process. Regular reviews, updates, and vigilance are essential to maintain a secure OAuth implementation.

**Key Takeaways:**
1. **Never commit secrets** - Use environment variables and secrets management
2. **Encrypt everything** - Tokens at rest, data in transit
3. **Validate strictly** - State parameters, redirect URIs, inputs
4. **Monitor continuously** - Logs, metrics, alerts
5. **Respond quickly** - Have incident response plan ready
6. **Stay compliant** - GDPR, CCPA, industry standards
7. **Update regularly** - Credentials, dependencies, documentation

Security is everyone's responsibility. Follow these practices to protect your users and your application.
