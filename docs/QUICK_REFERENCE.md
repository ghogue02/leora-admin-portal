# Quick Reference - Leora CRM

**Last Updated:** October 25, 2025
**Version:** 2.0.0

Your go-to cheat sheet for common commands, endpoints, and workflows.

---

## 🚀 Common CLI Commands

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Run all checks
npm run validate
```

### Database

```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npm run db:seed

# Create migration
npx prisma migrate dev --name migration_name

# Reset database (⚠️ DESTRUCTIVE)
npx prisma migrate reset
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/file.test.ts
```

---

## 🔑 Environment Variables

### Required

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
DIRECT_URL="postgresql://user:pass@host:5432/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"  # openssl rand -base64 32

# Encryption
ENCRYPTION_KEY="your-key"  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Optional (Calendar Sync)

```bash
# Google Calendar
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/calendar/connect/google/callback"

# Microsoft Outlook
OUTLOOK_CLIENT_ID="your-client-id"
OUTLOOK_CLIENT_SECRET="your-secret"
OUTLOOK_TENANT_ID="common"
OUTLOOK_REDIRECT_URI="http://localhost:3000/api/calendar/connect/outlook/callback"
```

### Generate Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🌐 API Endpoints

### Admin - Job Monitoring

```bash
# List jobs
GET /api/admin/jobs?status=FAILED&limit=10

# Get job details
GET /api/admin/jobs/:jobId

# Retry job
POST /api/admin/jobs/:jobId/retry

# Cancel job
POST /api/admin/jobs/:jobId/cancel

# Delete job
DELETE /api/admin/jobs/:jobId

# Job queue health
GET /api/admin/jobs/health
```

### Calendar Sync

```bash
# Connect Google Calendar
GET /api/calendar/connect/google

# Connect Outlook
GET /api/calendar/connect/outlook

# Trigger sync
POST /api/calendar/sync
{
  "userId": "user_123",
  "provider": "google",
  "fullSync": false
}

# Get sync status
GET /api/calendar/sync/:syncId

# Refresh token
POST /api/calendar/refresh-token
{
  "userId": "user_123",
  "provider": "google"
}

# Calendar status
GET /api/calendar/status?userId=user_123

# Calendar health
GET /api/calendar/health
```

### Warehouse & Inventory

```bash
# Get inventory
GET /api/warehouse/inventory?lowStock=true&limit=20

# Update pick order
PATCH /api/warehouse/inventory/:skuId/pick-order
{
  "pickOrder": 5,
  "reason": "Moved to new bin"
}

# Adjust inventory
POST /api/warehouse/inventory/:skuId/adjust
{
  "quantity": -3,
  "reason": "DAMAGE",
  "notes": "Broken bottles"
}

# List transactions
GET /api/warehouse/inventory/:skuId/transactions?limit=100

# Reconcile inventory
POST /api/warehouse/inventory/:skuId/reconcile
```

---

## 🗄️ Database Queries

### Common Queries

```sql
-- Find users with calendar sync errors
SELECT u.email, ca.provider, ca."lastSyncError"
FROM "CalendarAuth" ca
JOIN "User" u ON ca."userId" = u.id
WHERE ca."lastSyncError" IS NOT NULL;

-- Find low stock items
SELECT sku, "quantityAvailable", "reorderPoint"
FROM "SKU"
WHERE "quantityAvailable" < "reorderPoint"
ORDER BY "quantityAvailable" ASC;

-- Count failed jobs
SELECT type, COUNT(*) as failed_count
FROM "Job"
WHERE status = 'FAILED'
GROUP BY type
ORDER BY failed_count DESC;

-- Find stuck reservations
SELECT o.id, o.status, oi."skuId", oi.quantity
FROM "Order" o
JOIN "OrderItem" oi ON o.id = oi."orderId"
WHERE o.status = 'CANCELLED'
  AND NOT EXISTS (
    SELECT 1 FROM "InventoryTransaction" it
    WHERE it."orderId" = o.id AND it.type = 'RELEASE'
  );

-- Calendar sync status
SELECT
  u.email,
  ca.provider,
  ca."lastSyncedAt",
  NOW() - ca."lastSyncedAt" as time_since_sync
FROM "CalendarAuth" ca
JOIN "User" u ON ca."userId" = u.id
ORDER BY ca."lastSyncedAt" ASC;
```

---

## 📁 File Locations

### Configuration

```
.env.local                    # Environment variables
tsconfig.json                 # TypeScript config
tailwind.config.ts            # Tailwind config
next.config.js                # Next.js config
prisma/schema.prisma          # Database schema
```

### Source Code

```
src/app/                      # Next.js pages & routes
  ├── api/                    # API endpoints
  ├── admin/                  # Admin pages
  ├── sales/                  # Sales pages
  └── portal/                 # Customer portal
src/components/               # Reusable components
src/lib/                      # Utility functions
  ├── prisma.ts               # Prisma client
  ├── calendar-sync.ts        # Calendar service
  └── auth.ts                 # Auth config
src/types/                    # TypeScript types
```

### Documentation

```
docs/
  ├── SECURITY.md             # Security guide
  ├── INVENTORY_ERROR_RECOVERY.md  # Inventory troubleshooting
  ├── ADMIN_TOOLS.md          # Admin tools guide
  ├── CALENDAR_SYNC_TROUBLESHOOTING.md  # Calendar debugging
  ├── API_REFERENCE.md        # API documentation
  ├── DEVELOPER_ONBOARDING.md # Setup guide
  ├── DEPLOYMENT.md           # Production guide
  ├── CHANGELOG.md            # Version history
  └── QUICK_REFERENCE.md      # This file
```

---

## 🔧 Troubleshooting

### Database Connection Failed

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npx prisma db push

# Regenerate Prisma Client
npx prisma generate
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Environment Variables Not Loading

```bash
# Ensure file is named .env.local
ls -la | grep .env

# Restart dev server
npm run dev
```

### Clear Next.js Cache

```bash
rm -rf .next
npm run dev
```

### TypeScript Errors After Schema Change

```bash
# Regenerate Prisma types
npx prisma generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 🚨 Emergency Procedures

### Release Stuck Inventory

```sql
-- Find stuck reservations
SELECT o.id, oi."skuId", oi.quantity
FROM "Order" o
JOIN "OrderItem" oi ON o.id = oi."orderId"
WHERE o.status = 'CANCELLED'
  AND NOT EXISTS (
    SELECT 1 FROM "InventoryTransaction" it
    WHERE it."orderId" = o.id AND it.type = 'RELEASE'
  );

-- Release manually (replace values)
UPDATE "SKU"
SET "quantityReserved" = "quantityReserved" - [quantity],
    "quantityAvailable" = "quantityAvailable" + [quantity]
WHERE id = '[sku-id]';
```

### Reset Calendar Sync

```bash
# Delete stale auth
curl -X DELETE http://localhost:3000/api/calendar/disconnect \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","provider":"google"}'

# User re-authenticates
curl http://localhost:3000/api/calendar/connect/google
```

### Retry All Failed Jobs

```bash
# Via API
curl -X POST http://localhost:3000/api/admin/jobs/retry-all \
  -H "Content-Type: application/json" \
  -d '{"status":"FAILED","type":"CalendarSync"}'
```

---

## 📊 Health Checks

### System Health

```bash
# Job queue
curl http://localhost:3000/api/admin/jobs/health

# Calendar sync
curl http://localhost:3000/api/calendar/health

# Database connection
npx prisma db execute --stdin <<< "SELECT 1"

# Application
curl http://localhost:3000/api/health
```

---

## 🔐 Security

### Generate Keys

```bash
# Encryption key (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT secret (base64)
openssl rand -base64 32

# Random UUID
node -e "console.log(require('crypto').randomUUID())"
```

### Check Token Expiry

```sql
SELECT
  provider,
  "tokenExpiry",
  "tokenExpiry" < NOW() as is_expired,
  NOW() - "tokenExpiry" as expired_for
FROM "CalendarAuth"
WHERE "userId" = '[user-id]';
```

---

## 📖 Quick Links

### Documentation

- [Security Guide](/docs/SECURITY.md)
- [Inventory Recovery](/docs/INVENTORY_ERROR_RECOVERY.md)
- [Admin Tools](/docs/ADMIN_TOOLS.md)
- [Calendar Troubleshooting](/docs/CALENDAR_SYNC_TROUBLESHOOTING.md)
- [API Reference](/docs/API_REFERENCE.md)
- [Developer Onboarding](/docs/DEVELOPER_ONBOARDING.md)
- [Deployment Guide](/docs/DEPLOYMENT.md)

### Admin Interfaces

- Job Monitoring: http://localhost:3000/admin/jobs
- Prisma Studio: http://localhost:5555 (after `npx prisma studio`)
- Calendar Settings: http://localhost:3000/settings/calendar

### External Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)

---

## 💡 Pro Tips

1. **Use Prisma Studio** for quick database inspection: `npx prisma studio`
2. **Enable debug logging** for calendar sync: `DEBUG=calendar:* npm run dev`
3. **Use ESLint auto-fix** before committing: `npm run lint:fix`
4. **Commit with conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`
5. **Test API routes with curl** before writing frontend code
6. **Use TypeScript strict mode** to catch errors early
7. **Clear .next cache** if you see weird build errors
8. **Check job queue** if background tasks aren't working

---

## 🆘 Support

- **Slack:** #engineering-support
- **Email:** dev-support@leoracrm.com
- **Docs:** `/docs` directory
- **GitHub Issues:** [github.com/yourcompany/leora-crm/issues](https://github.com)
