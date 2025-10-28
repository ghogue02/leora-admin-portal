# Encryption Key Setup

## Overview
The ENCRYPTION_KEY is used for AES-256-GCM encryption of sensitive OAuth tokens in the application.

## Local Development

### Initial Setup
The encryption key has been generated automatically during setup and stored in `.env` (git-ignored).

**Generated Key Details:**
- **Format:** 64 hexadecimal characters (32 bytes / 256 bits)
- **Algorithm:** AES-256-GCM
- **Generated:** 2025-10-25
- **Key Verification:** `18035e78...be6c74de6` (first 8 + last 8 chars)

### Key Rotation Schedule
- **Local Development:** Rotate monthly for security best practices
- **Production:** Rotate quarterly (see Production Deployment below)

### Regenerating Local Key
If you need to generate a new key:

```bash
cd /Users/greghogue/Leora2/web
./scripts/generate-encryption-key.js
```

Then manually update the `ENCRYPTION_KEY` value in `.env`.

## Production Deployment

### ⚠️ CRITICAL SECURITY RULES
1. **NEVER commit the encryption key to git**
2. **NEVER share the key in plaintext communications**
3. **ALWAYS use environment variables from your hosting platform**
4. **OR use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)**

### Setting Up Production Key

**Option 1: Environment Variables (Recommended for most platforms)**
```bash
# Vercel
vercel env add ENCRYPTION_KEY

# Netlify
netlify env:set ENCRYPTION_KEY "your-64-char-hex-key"

# Railway
railway variables set ENCRYPTION_KEY="your-64-char-hex-key"

# Heroku
heroku config:set ENCRYPTION_KEY="your-64-char-hex-key"
```

**Option 2: Secrets Manager (Recommended for AWS/enterprise)**
```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name production/encryption-key \
  --secret-string "your-64-char-hex-key"

# Then reference in your application
ENCRYPTION_KEY=$(aws secretsmanager get-secret-value \
  --secret-id production/encryption-key \
  --query SecretString --output text)
```

### Production Key Rotation Procedure

**Quarterly Rotation (Every 3 months):**

1. **Generate new key**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Store old key temporarily**
   ```bash
   OLD_ENCRYPTION_KEY="current-key-here"
   NEW_ENCRYPTION_KEY="new-key-here"
   ```

3. **Migration strategy (choose one):**

   **Strategy A: Force re-authentication (Simplest)**
   - Update `ENCRYPTION_KEY` to new value
   - Restart application
   - All users re-authenticate with OAuth providers
   - Old tokens become invalid (acceptable for most applications)

   **Strategy B: Gradual migration (Zero downtime)**
   - Add `ENCRYPTION_KEY_OLD` environment variable with current key
   - Update `ENCRYPTION_KEY` to new value
   - Modify token decryption to try new key first, fallback to old key
   - After 30 days (all tokens refreshed), remove `ENCRYPTION_KEY_OLD`
   - Restart application

4. **Update environment variable in production**
5. **Restart application**
6. **Monitor logs for decryption errors**
7. **Remove old key after migration complete**

## Emergency Key Reset

If the encryption key is compromised:

### Immediate Actions (Within 1 hour)
1. **Generate new key immediately**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update production environment variable**
   ```bash
   # Example for Vercel
   vercel env rm ENCRYPTION_KEY production
   vercel env add ENCRYPTION_KEY production
   ```

3. **Restart application immediately**

4. **Invalidate all existing sessions**
   - All users will need to re-authenticate with OAuth providers
   - This is the safest approach to ensure no compromised tokens remain

### Post-Incident (Within 24 hours)
5. **Monitor for suspicious activity**
   - Check application logs for unusual OAuth token usage
   - Review recent user login patterns
   - Alert security team if anomalies detected

6. **Update incident log**
   ```markdown
   # Incident: Encryption Key Compromise
   - Date: [timestamp]
   - Action: Emergency key rotation
   - Impact: All users required to re-authenticate
   - Status: Resolved
   ```

7. **Review access controls**
   - Audit who has access to environment variables
   - Review secrets manager permissions
   - Update security policies if needed

## Key Management Best Practices

### Storage
- ✅ **DO** use environment variables in production
- ✅ **DO** use secrets managers for enterprise deployments
- ✅ **DO** keep encrypted backups of production keys (in secrets manager)
- ❌ **DON'T** commit keys to version control
- ❌ **DON'T** store keys in configuration files
- ❌ **DON'T** share keys via email/Slack/chat

### Access Control
- ✅ **DO** limit who can view production secrets
- ✅ **DO** use role-based access control (RBAC)
- ✅ **DO** audit access logs regularly
- ❌ **DON'T** share production access with developers unnecessarily
- ❌ **DON'T** use same key across environments (dev/staging/prod)

### Rotation
- ✅ **DO** rotate quarterly in production
- ✅ **DO** rotate immediately if compromised
- ✅ **DO** document rotation procedures
- ✅ **DO** test rotation in staging first
- ❌ **DON'T** skip rotation schedule
- ❌ **DON'T** reuse old keys

## Validation

### Testing Key Format
Run this command to verify your key is valid:

```bash
cd /Users/greghogue/Leora2/web
node -e "
const crypto = require('crypto');
const key = process.env.ENCRYPTION_KEY;
if (!key) {
  console.error('❌ ERROR: ENCRYPTION_KEY not set');
  process.exit(1);
}
if (key.length !== 64) {
  console.error('❌ ERROR: ENCRYPTION_KEY must be 64 characters (got ' + key.length + ')');
  process.exit(1);
}
if (!/^[0-9a-f]{64}$/i.test(key)) {
  console.error('❌ ERROR: ENCRYPTION_KEY must be hexadecimal');
  process.exit(1);
}
console.log('✅ ENCRYPTION_KEY is valid (64 hex characters)');
console.log('✅ Key prefix: ' + key.substring(0, 8) + '...');
console.log('✅ Key suffix: ...' + key.substring(56));
"
```

### Expected Output
```
✅ ENCRYPTION_KEY is valid (64 hex characters)
✅ Key prefix: 18035e78...
✅ Key suffix: ...be6c74de6
```

## Troubleshooting

### Error: "ENCRYPTION_KEY is not set"
**Solution:** Add the environment variable to your `.env` file or production environment.

### Error: "Invalid key length"
**Solution:** The key must be exactly 64 hexadecimal characters. Generate a new one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Error: "Failed to decrypt token"
**Possible Causes:**
1. Encryption key was rotated without migrating existing tokens
2. Token was encrypted with different key
3. Token data is corrupted

**Solution:** Force user to re-authenticate with OAuth provider.

## References

- **Implementation:** `/web/src/lib/token-encryption.ts`
- **Key Generator:** `/web/scripts/generate-encryption-key.js`
- **Environment Template:** `/web/.env.example`
- **Algorithm:** [AES-256-GCM (NIST)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)

## Support

For questions or issues:
1. Check implementation in `/web/src/lib/token-encryption.ts`
2. Review environment configuration in `.env`
3. Test key validation script above
4. Check application logs for encryption errors

---

**Last Updated:** 2025-10-25
**Version:** 1.0
**Maintainer:** Development Team
