# Security Documentation - Leora CRM

## Overview

This document outlines the security measures implemented in Leora CRM, with a focus on protecting sensitive data such as OAuth tokens, credentials, and user information.

## Table of Contents

1. [Token Encryption](#token-encryption)
2. [Environment Variables](#environment-variables)
3. [Key Management](#key-management)
4. [Database Security](#database-security)
5. [API Security](#api-security)
6. [Migration Guide](#migration-guide)

---

## Token Encryption

### AES-256-GCM Encryption

All OAuth tokens (access tokens and refresh tokens) are encrypted using **AES-256-GCM** authenticated encryption before being stored in the database.

#### Algorithm Details

- **Cipher**: AES-256-GCM (Advanced Encryption Standard, 256-bit key, Galois/Counter Mode)
- **Key Derivation**: scrypt with N=16384, r=8, p=1
- **IV Length**: 16 bytes (128 bits), randomly generated per encryption
- **Salt Length**: 64 bytes (512 bits), randomly generated per encryption
- **Authentication Tag**: 16 bytes (128 bits), for integrity verification

#### Security Features

1. **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity
2. **Unique Encryption**: Each token encryption uses unique salt and IV
3. **Tampering Detection**: Authentication tag ensures data hasn't been modified
4. **Key Stretching**: scrypt makes brute-force attacks computationally expensive
5. **Domain Separation**: Salt-based key derivation isolates encrypted data

### Implementation

The encryption library is located at `/web/src/lib/token-encryption.ts` and provides:

```typescript
// Encrypt a token
const encrypted = await encryptToken('my-oauth-token');

// Decrypt a token
const plaintext = await decryptToken(encrypted);

// Check if a value is encrypted
if (isEncrypted(value)) {
  const decrypted = await decryptToken(value);
}

// Validate encryption key configuration
validateEncryptionKey();

// Generate a new encryption key (development only)
const key = generateEncryptionKey();
```

### Encrypted Data Format

Encrypted tokens are stored as base64-encoded packages:

```
Base64( salt || iv || authTag || ciphertext )
```

- **salt**: 64 bytes - Random salt for key derivation
- **iv**: 16 bytes - Initialization vector for AES-GCM
- **authTag**: 16 bytes - Authentication tag for integrity
- **ciphertext**: Variable - Encrypted token data

---

## Environment Variables

### Required Variables

#### ENCRYPTION_KEY (REQUIRED for production)

The master encryption key for token encryption. Must be:

- Valid hexadecimal string
- At least 32 bytes (64 hex characters)
- Randomly generated and unique per environment
- Kept secure and never committed to version control

**Generate a key:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using the library (development)
node -e "const {generateEncryptionKey} = require('./web/src/lib/token-encryption'); console.log(generateEncryptionKey())"
```

**Configure in `.env`:**

```bash
ENCRYPTION_KEY=a1b2c3d4e5f6... # 64 hex characters
```

### Security Best Practices

1. **Never commit** `.env` files to version control
2. **Use different keys** for each environment (dev, staging, production)
3. **Rotate keys** periodically (see Key Rotation below)
4. **Store keys securely** in:
   - Production: AWS Secrets Manager, HashiCorp Vault, or similar
   - Development: Local `.env` file (gitignored)
5. **Restrict access** to encryption keys using IAM/RBAC
6. **Audit access** to keys and encrypted data

---

## Key Management

### Key Storage

#### Development

- Store in `.env` file (ensure `.env` is in `.gitignore`)
- Use separate keys for each developer environment
- Never share development keys in chat/email

#### Production

Use a dedicated secrets management service:

**AWS Secrets Manager:**
```bash
# Store key
aws secretsmanager create-secret \
  --name leora/encryption-key \
  --secret-string "your-hex-key"

# Retrieve in application
const key = await secretsManager.getSecretValue({
  SecretId: 'leora/encryption-key'
}).promise();
```

**HashiCorp Vault:**
```bash
# Store key
vault kv put secret/leora encryption_key="your-hex-key"

# Retrieve in application
const secret = await vault.read('secret/leora');
process.env.ENCRYPTION_KEY = secret.data.encryption_key;
```

### Key Rotation

When rotating encryption keys:

1. **Keep old key** temporarily for decryption
2. **Add new key** to environment
3. **Re-encrypt data** with new key
4. **Remove old key** after migration

**Migration script example:**

```typescript
import { encryptToken, decryptToken } from '@/lib/token-encryption';
import prisma from '@/lib/prisma';

async function rotateEncryptionKey() {
  const OLD_KEY = process.env.OLD_ENCRYPTION_KEY;
  const NEW_KEY = process.env.ENCRYPTION_KEY;

  // Get all tokens
  const tokens = await prisma.integrationToken.findMany();

  for (const token of tokens) {
    // Decrypt with old key
    process.env.ENCRYPTION_KEY = OLD_KEY;
    const plainAccessToken = await decryptToken(token.accessToken);
    const plainRefreshToken = token.refreshToken
      ? await decryptToken(token.refreshToken)
      : null;

    // Re-encrypt with new key
    process.env.ENCRYPTION_KEY = NEW_KEY;
    const newAccessToken = await encryptToken(plainAccessToken);
    const newRefreshToken = plainRefreshToken
      ? await encryptToken(plainRefreshToken)
      : null;

    // Update database
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  }

  console.log(`Rotated encryption for ${tokens.length} tokens`);
}
```

---

## Database Security

### Encrypted Fields

The following fields are encrypted at rest in the database:

**IntegrationToken model:**
- `accessToken` - OAuth access token (encrypted)
- `refreshToken` - OAuth refresh token (encrypted)

### Unencrypted Metadata

The following fields are **NOT** encrypted (safe metadata):
- `tenantId` - Foreign key
- `provider` - 'google' or 'outlook'
- `expiresAt` - Token expiration timestamp
- `metadata` - JSON with non-sensitive info (scopes, token type)
- `createdAt`, `updatedAt` - Timestamps

### Database Access Control

1. **Principle of Least Privilege**: Grant minimal permissions
2. **Connection Encryption**: Always use SSL/TLS for database connections
3. **Audit Logging**: Enable PostgreSQL audit logs
4. **Row-Level Security**: Consider RLS policies for multi-tenant isolation

**Supabase RLS Example:**

```sql
-- Enable RLS on IntegrationToken table
ALTER TABLE "IntegrationToken" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's tokens
CREATE POLICY tenant_isolation ON "IntegrationToken"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant')::uuid);
```

---

## API Security

### OAuth Integration Endpoints

#### Google Calendar

- `GET /api/calendar/connect/google` - Initiate OAuth flow
- `POST /api/calendar/connect/google` - Handle callback, encrypt & store tokens
- `DELETE /api/calendar/connect/google` - Disconnect integration

#### Outlook Calendar

- `GET /api/calendar/connect/outlook` - Initiate OAuth flow
- `POST /api/calendar/connect/outlook` - Handle callback, encrypt & store tokens
- `DELETE /api/calendar/connect/outlook` - Disconnect integration

### Security Measures

1. **Authentication**: All endpoints require valid session
2. **Authorization**: Users can only access their own tenant's data
3. **HTTPS Only**: Enforce TLS for all API communication
4. **Token Encryption**: All tokens encrypted before database storage
5. **State Validation**: OAuth state parameter validated on callback
6. **Error Handling**: Generic error messages to prevent information leakage

### Rate Limiting

Consider implementing rate limiting for OAuth endpoints:

```typescript
import rateLimit from 'express-rate-limit';

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many OAuth requests, please try again later',
});

// Apply to OAuth routes
app.use('/api/calendar/connect', oauthLimiter);
```

---

## Migration Guide

### Migrating from Plaintext to Encrypted Tokens

If you have existing plaintext tokens in the database, use this migration process:

#### Step 1: Deploy Encryption Code

1. Deploy the token encryption library
2. Configure `ENCRYPTION_KEY` in environment
3. Deploy updated OAuth handlers that encrypt new tokens

#### Step 2: Update Existing Tokens

Run migration script to encrypt existing tokens:

```typescript
// scripts/encrypt-existing-tokens.ts
import { encryptToken, isEncrypted } from '@/lib/token-encryption';
import prisma from '@/lib/prisma';

async function migrateTokens() {
  const tokens = await prisma.integrationToken.findMany();

  let migrated = 0;
  let skipped = 0;

  for (const token of tokens) {
    try {
      // Skip if already encrypted
      if (isEncrypted(token.accessToken)) {
        skipped++;
        continue;
      }

      // Encrypt tokens
      const encryptedAccess = await encryptToken(token.accessToken);
      const encryptedRefresh = token.refreshToken
        ? await encryptToken(token.refreshToken)
        : null;

      // Update database
      await prisma.integrationToken.update({
        where: { id: token.id },
        data: {
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
        },
      });

      migrated++;
    } catch (error) {
      console.error(`Failed to migrate token ${token.id}:`, error);
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
}

migrateTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run the migration:

```bash
# Set ENCRYPTION_KEY in environment
export ENCRYPTION_KEY="your-key-here"

# Run migration
npm run ts-node scripts/encrypt-existing-tokens.ts
```

#### Step 3: Verify Migration

```typescript
// scripts/verify-encryption.ts
import { isEncrypted } from '@/lib/token-encryption';
import prisma from '@/lib/prisma';

async function verifyEncryption() {
  const tokens = await prisma.integrationToken.findMany();

  const unencrypted = tokens.filter(
    (t) => !isEncrypted(t.accessToken) ||
           (t.refreshToken && !isEncrypted(t.refreshToken))
  );

  if (unencrypted.length === 0) {
    console.log('✅ All tokens are encrypted');
  } else {
    console.warn(`⚠️  ${unencrypted.length} tokens are not encrypted`);
    console.warn('Token IDs:', unencrypted.map(t => t.id));
  }
}
```

### Backward Compatibility

The encryption library includes backward compatibility for gradual migration:

```typescript
// Handles both encrypted and plaintext tokens
const token = await prisma.integrationToken.findUnique(...);

const accessToken = isEncrypted(token.accessToken)
  ? await decryptToken(token.accessToken)  // New: encrypted
  : token.accessToken;                     // Old: plaintext

// Use accessToken safely
```

This allows the application to work during the migration period when some tokens are encrypted and others are not.

---

## Security Checklist

### Pre-Production

- [ ] `ENCRYPTION_KEY` configured in production environment
- [ ] Encryption key stored in secrets manager (not plaintext)
- [ ] All OAuth tokens encrypted in database
- [ ] `.env` files excluded from version control
- [ ] Database connections use SSL/TLS
- [ ] HTTPS enforced for all API endpoints
- [ ] Rate limiting configured for OAuth endpoints
- [ ] Security headers configured (HSTS, CSP, etc.)

### Production Monitoring

- [ ] Monitor for decryption failures (indicates tampering or key issues)
- [ ] Track encryption/decryption performance
- [ ] Audit access to encryption keys
- [ ] Regular security scans for vulnerabilities
- [ ] Incident response plan documented

### Regular Maintenance

- [ ] Review and rotate encryption keys quarterly
- [ ] Update dependencies for security patches
- [ ] Audit database access logs
- [ ] Review and update security documentation
- [ ] Test backup and recovery procedures

---

## Incident Response

### Suspected Key Compromise

If you suspect the encryption key has been compromised:

1. **Immediately rotate** the encryption key
2. **Revoke all OAuth tokens** and require re-authentication
3. **Audit access logs** to determine scope of compromise
4. **Notify affected users** per your security policy
5. **Document the incident** for post-mortem analysis

### Data Breach

If encrypted token data is exposed:

1. **Assess impact**: Determine what data was accessed
2. **Rotate keys**: Generate new encryption key immediately
3. **Invalidate tokens**: Revoke all OAuth tokens at provider level
4. **Force re-authentication**: Require all users to reconnect integrations
5. **Notify stakeholders**: Follow breach notification procedures
6. **Implement fixes**: Address vulnerability that led to breach

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/publications)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

## Contact

For security concerns or to report vulnerabilities, contact your security team immediately.

**Last Updated**: 2025-01-XX
**Version**: 1.0
**Maintainer**: Security Team
