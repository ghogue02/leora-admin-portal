# Production Deployment Guide - Leora CRM

**Last Updated:** October 25, 2025
**Version:** 2.0.0

---

## Overview

This guide covers deploying Leora CRM to production environments, including infrastructure setup, security configuration, and operational procedures.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Application Deployment](#application-deployment)
5. [Secret Management](#secret-management)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Health Checks](#health-checks)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Infrastructure Requirements

| Component | Specification | Notes |
|-----------|---------------|-------|
| **Compute** | 2 CPU, 4GB RAM minimum | Scale based on load |
| **Database** | PostgreSQL 15+ | Managed service recommended |
| **Storage** | 50GB minimum | For logs, uploads, backups |
| **CDN** | CloudFlare/CloudFront | For static assets |
| **DNS** | Custom domain | SSL/TLS required |
| **Secrets** | Vault/AWS Secrets Manager | For sensitive credentials |

### Platform Options

**Recommended Platforms:**

1. **Vercel** (Easiest)
   - Automatic Next.js optimization
   - Serverless deployment
   - Built-in CDN
   - Zero-config SSL

2. **AWS** (Most Control)
   - EC2/ECS for compute
   - RDS for database
   - S3 for storage
   - CloudFront for CDN

3. **Docker** (Self-Hosted)
   - Full control
   - Any cloud or on-premise
   - Requires DevOps expertise

---

## Environment Setup

### Production Environment Variables

Create `.env.production`:

```bash
# ===============================
# APPLICATION
# ===============================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# ===============================
# DATABASE
# ===============================
DATABASE_URL="postgresql://prod_user:SECURE_PASSWORD@prod-db.example.com:5432/leora_prod?sslmode=require"
DIRECT_URL="postgresql://prod_user:SECURE_PASSWORD@prod-db.example.com:5432/leora_prod?sslmode=require"

# Connection pooling (recommended)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_TIMEOUT=30000

# ===============================
# AUTHENTICATION
# ===============================
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET="GENERATE_NEW_SECRET_FOR_PROD"  # openssl rand -base64 64

# Session configuration
SESSION_MAX_AGE=2592000  # 30 days in seconds
SESSION_UPDATE_AGE=86400  # 24 hours

# ===============================
# ENCRYPTION
# ===============================
ENCRYPTION_KEY="GENERATE_NEW_KEY_FOR_PROD"  # 64-char hex string

# ===============================
# CALENDAR SYNC
# ===============================
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/google/callback

OUTLOOK_CLIENT_ID=your_production_client_id
OUTLOOK_CLIENT_SECRET=your_production_client_secret
OUTLOOK_TENANT_ID=your_tenant_id
OUTLOOK_REDIRECT_URI=https://yourdomain.com/api/calendar/connect/outlook/callback

# ===============================
# EMAIL (SendGrid/Postmark/etc)
# ===============================
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key

# ===============================
# MONITORING
# ===============================
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true

# ===============================
# RATE LIMITING (Upstash Redis)
# ===============================
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your_token

# ===============================
# STORAGE (AWS S3 or similar)
# ===============================
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=leora-production
AWS_REGION=us-east-1

# ===============================
# FEATURE FLAGS
# ===============================
ENABLE_CALENDAR_SYNC=true
ENABLE_VOICE_LOGGING=true
ENABLE_PWA=true
ENABLE_ANALYTICS=true
```

### Generate Production Secrets

```bash
# NEXTAUTH_SECRET (extra long for production)
openssl rand -base64 64

# ENCRYPTION_KEY (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Random API key
openssl rand -hex 32
```

**⚠️ NEVER commit production secrets to version control!**

---

## Database Migration

### Pre-Migration Checklist

- [ ] Backup current production database
- [ ] Test migration on staging environment
- [ ] Review migration SQL for breaking changes
- [ ] Schedule maintenance window
- [ ] Notify users of downtime (if applicable)
- [ ] Have rollback plan ready

### Migration Strategy

**Zero-Downtime Migration (Recommended):**

1. **Deploy backward-compatible schema changes**
2. **Deploy new application code**
3. **Run data migrations**
4. **Deploy cleanup migrations** (remove old columns)

**With Downtime (Simpler):**

1. **Enable maintenance mode**
2. **Run all migrations**
3. **Deploy new code**
4. **Disable maintenance mode**

### Running Migrations

**Option 1: Prisma Migrate (Recommended)**

```bash
# 1. Generate migration SQL
npx prisma migrate deploy --preview-feature

# 2. Review migration
cat prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql

# 3. Backup database
pg_dump -h prod-db.example.com -U prod_user leora_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Apply migration
npx prisma migrate deploy

# 5. Verify migration
npx prisma migrate status
```

**Option 2: Manual SQL (Advanced)**

```bash
# 1. Backup
pg_dump -h prod-db.example.com -U prod_user leora_prod > backup.sql

# 2. Apply SQL
psql -h prod-db.example.com -U prod_user leora_prod < migration.sql

# 3. Verify
psql -h prod-db.example.com -U prod_user leora_prod -c "SELECT COUNT(*) FROM \"User\";"
```

### Post-Migration Verification

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check row counts
SELECT
  'User' as table_name, COUNT(*) as row_count FROM "User"
UNION ALL
SELECT 'Customer', COUNT(*) FROM "Customer"
UNION ALL
SELECT 'Order', COUNT(*) FROM "Order";

-- Check indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## Application Deployment

### Deployment Options

#### Option 1: Vercel (Recommended for Next.js)

**Initial Setup:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Add environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add ENCRYPTION_KEY
# ... (add all production env vars)

# Deploy to production
vercel --prod
```

**Subsequent Deployments:**

```bash
# Deploy latest changes
git push origin main

# Vercel auto-deploys on push to main
# Or manually:
vercel --prod
```

**Vercel Configuration:**

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],  // US East
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

#### Option 2: Docker

**Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV production

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=leora_prod
      - POSTGRES_USER=leora
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

**Deployment:**

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f app

# Check health
curl http://localhost:3000/api/health
```

#### Option 3: AWS (EC2 + RDS)

**Infrastructure Setup:**

1. **RDS PostgreSQL:**
   - Instance: db.t3.medium
   - Storage: 100GB SSD
   - Multi-AZ: Enabled
   - Automated backups: 30 days

2. **EC2 Instance:**
   - Instance: t3.medium
   - OS: Amazon Linux 2
   - Auto Scaling Group
   - Application Load Balancer

3. **S3 Bucket:**
   - For static assets
   - CloudFront distribution

**Deployment Script:**

```bash
#!/bin/bash
# deploy.sh

set -e  # Exit on error

echo "🚀 Deploying Leora CRM to AWS..."

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci

# 3. Build application
npm run build

# 4. Run database migrations
npx prisma migrate deploy

# 5. Restart application (PM2)
pm2 restart leora-crm

# 6. Health check
sleep 5
curl -f http://localhost:3000/api/health || exit 1

echo "✅ Deployment complete!"
```

---

## Secret Management

### Using AWS Secrets Manager

**Store Secrets:**

```bash
# Create secret
aws secretsmanager create-secret \
  --name leora/production/database-url \
  --secret-string "postgresql://..."

aws secretsmanager create-secret \
  --name leora/production/nextauth-secret \
  --secret-string "your-secret"

aws secretsmanager create-secret \
  --name leora/production/encryption-key \
  --secret-string "your-key"
```

**Retrieve in Application:**

```typescript
// lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

export async function getSecret(secretName: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString || '';
}

// Usage
const databaseUrl = await getSecret('leora/production/database-url');
```

### Using HashiCorp Vault

```bash
# Store secrets
vault kv put secret/leora/production \
  database_url="postgresql://..." \
  nextauth_secret="..." \
  encryption_key="..."

# Retrieve secrets
vault kv get -field=database_url secret/leora/production
```

---

## Monitoring & Logging

### Sentry Integration

**Setup:**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration:**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
```

### Application Logs

**Structured Logging:**

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('User logged in', { userId: 'user_123' });
logger.error('Database connection failed', { error: err.message });
```

### Performance Monitoring

**Next.js Analytics:**

```typescript
// next.config.js
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
  // Vercel Analytics
  analytics: {
    id: process.env.VERCEL_ANALYTICS_ID,
  },
};
```

---

## Backup & Recovery

### Database Backups

**Automated Backups (AWS RDS):**

```bash
# RDS automatically backs up daily
# Retention: 30 days
# Point-in-time recovery: Enabled
```

**Manual Backups:**

```bash
# Full database backup
pg_dump -h prod-db.example.com \
  -U prod_user \
  -Fc \
  leora_prod > backup_$(date +%Y%m%d_%H%M%S).dump

# Compressed SQL backup
pg_dump -h prod-db.example.com \
  -U prod_user \
  leora_prod | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d_%H%M%S).dump \
  s3://leora-backups/database/
```

**Backup Schedule:**

- **Daily:** Full database backup (retained 30 days)
- **Weekly:** Archive to S3 (retained 1 year)
- **Monthly:** Long-term archive (retained 7 years)

### Recovery Procedures

**Restore from Backup:**

```bash
# Download from S3
aws s3 cp s3://leora-backups/database/backup_20251025_100000.dump ./

# Restore
pg_restore -h prod-db.example.com \
  -U prod_user \
  -d leora_prod \
  --clean \
  backup_20251025_100000.dump

# Verify
psql -h prod-db.example.com -U prod_user leora_prod \
  -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Health Checks

### Application Health Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';
  } catch (error) {
    checks.checks.database = 'unhealthy';
    checks.status = 'degraded';
  }

  try {
    // Redis check (if using)
    // await redis.ping();
    checks.checks.redis = 'healthy';
  } catch (error) {
    checks.checks.redis = 'unhealthy';
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

### Monitoring Setup

**Health Check Monitors:**

```bash
# UptimeRobot / Pingdom
curl -f https://yourdomain.com/api/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

## Rollback Procedures

### Application Rollback

**Vercel:**

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

**Docker:**

```bash
# Rollback to previous image
docker-compose down
docker-compose up -d --build [previous-tag]
```

### Database Rollback

**⚠️ CAUTION: Data loss possible!**

```bash
# 1. Backup current state
pg_dump -h prod-db.example.com -U prod_user leora_prod > pre_rollback_backup.sql

# 2. Restore from backup
pg_restore -h prod-db.example.com -U prod_user -d leora_prod backup.dump

# 3. Verify
psql -h prod-db.example.com -U prod_user leora_prod -c "SELECT COUNT(*) FROM \"User\";"
```

---

## Production Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Secrets stored in secret manager
- [ ] Database migration tested on staging
- [ ] Backup created
- [ ] SSL/TLS certificates valid
- [ ] DNS records configured
- [ ] OAuth redirect URIs updated for production domain
- [ ] Error monitoring (Sentry) configured
- [ ] Performance monitoring enabled
- [ ] Health checks configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented

### Post-Deployment

- [ ] Health check passing
- [ ] Database migration successful
- [ ] Application accessible via domain
- [ ] SSL/TLS working (HTTPS)
- [ ] OAuth flows working (Google/Outlook)
- [ ] Calendar sync functional
- [ ] Job queue processing
- [ ] Error tracking active (Sentry)
- [ ] Performance metrics collecting
- [ ] Backups running automatically
- [ ] Team notified of deployment

---

## Support

For deployment issues:
- **Slack:** #devops
- **Email:** devops@leoracrm.com
- **On-Call:** See PagerDuty rotation
- **Runbooks:** `/docs/runbooks/`
