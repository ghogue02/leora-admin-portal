# Phase 2 Finalization - Critical Issues

**Date:** October 25, 2025
**Status:** 🔴 BLOCKING DEPLOYMENT

---

## 🚨 URGENT: Must Fix Before Deployment

### 1. Prisma Schema Validation Errors (6 Errors)

**Impact:** CRITICAL - Cannot generate Prisma client or run migrations

**Errors:**
```
❌ CallPlanAccount.tenant → Missing opposite field on Tenant
❌ CallPlanAccount.calendarEvents → Missing opposite field on CalendarEvent
❌ CallPlanActivity.tenant → Missing opposite field on Tenant
❌ CallPlanActivity.activityType → Missing opposite field on ActivityType
❌ CalendarSync.tenant → Missing opposite field on Tenant
❌ CalendarSync.user → Missing opposite field on User
```

**Fix Required:**

Edit `/web/prisma/schema.prisma`:

```prisma
model Tenant {
  // ... existing fields ...

  // ADD THESE:
  callPlanAccounts   CallPlanAccount[]
  callPlanActivities CallPlanActivity[]
  calendarSyncs      CalendarSync[]
}

model User {
  // ... existing fields ...

  // ADD THIS:
  calendarSyncs CalendarSync[]
}

model CalendarEvent {
  // ... existing fields ...

  // ADD THESE:
  callPlanAccount   CallPlanAccount? @relation(fields: [callPlanAccountId], references: [id])
  callPlanAccountId String?          @db.Uuid
}

model ActivityType {
  // ... existing fields ...

  // ADD THIS:
  callPlanActivities CallPlanActivity[]
}
```

**Verification:**
```bash
npx prisma validate
npx prisma generate
```

**Estimated Time:** 30 minutes

---

### 2. Missing Encryption Key Configuration

**Impact:** HIGH - Token encryption will fail at runtime

**Problem:** `ENCRYPTION_KEY` environment variable not set

**Fix Required:**

```bash
# Generate secure 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env (DO NOT commit to git)
echo "ENCRYPTION_KEY=<generated-key-here>" >> web/.env

# Verify it's in .gitignore
echo ".env" >> .gitignore
```

**Security Notes:**
- ✅ Use unique key per environment (dev/staging/prod)
- ✅ Store production key in secure vault (e.g., AWS Secrets Manager)
- ❌ NEVER commit encryption keys to git
- ❌ NEVER share keys via email/Slack

**Estimated Time:** 5 minutes

---

### 3. Test Database Configuration Mismatch

**Impact:** HIGH - All database-dependent tests fail (91 tests)

**Problem:**
```
.env:          DATABASE_URL="postgresql://..."  ← Production DB
.env.test:     DATABASE_URL="file:./test.db"   ← SQLite
schema.prisma: provider = "postgresql"         ← PostgreSQL only
```

**Options:**

**Option A: Test Database (Recommended)**
```bash
# Create test project on Supabase
# Add to .env.test:
DATABASE_URL="postgresql://test-db.supabase.com:6543/postgres"
```

**Option B: Mock Prisma (Faster)**
```typescript
// vitest.setup.ts
import { mockDeep } from 'vitest-mock-extended';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockDeep<PrismaClient>()),
}));
```

**Option C: Testcontainers (Best for CI)**
```typescript
import { PostgreSqlContainer } from 'testcontainers';

beforeAll(async () => {
  const container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
});
```

**Estimated Time:** 1-2 hours

---

## 📊 Test Results Summary

| Category | Status | Details |
|----------|--------|---------|
| **Unit Tests** | ⚠️ Partial | 18/109 passed (database issues) |
| **Integration Tests** | ❌ Blocked | Cannot connect to database |
| **Prisma Schema** | ❌ Failed | 6 validation errors |
| **ESLint** | ⚠️ Issues | 20+ violations (mostly scripts) |
| **Security Audit** | ✅ Passed | Strong encryption implementation |
| **Phase 2 Features** | ✅ Implemented | Token encryption & warehouse ready |

---

## ✅ What's Working Well

### Token Encryption Implementation
- ✅ AES-256-GCM encryption
- ✅ 60+ comprehensive unit tests
- ✅ Tamper detection
- ✅ Unique IV/salt per encryption
- ✅ No hardcoded secrets

### Warehouse Management
- ✅ Location parsing (multiple formats)
- ✅ Pick order calculation
- ✅ 40+ unit tests
- ✅ Natural sorting algorithm

### Calendar Sync
- ✅ Microsoft Graph integration
- ✅ Delta query support
- ✅ OAuth token management

---

## 🎯 Deployment Checklist

### Before Production Deploy:

- [ ] Fix Prisma schema validation errors
- [ ] Generate encryption key and add to .env
- [ ] Fix test database configuration
- [ ] Run all tests successfully
- [ ] Verify test coverage >80%
- [ ] Fix critical ESLint issues
- [ ] Database migration plan
- [ ] Backup production database
- [ ] Rollback plan documented

### Before Staging Deploy:

- [ ] Fix Prisma schema (URGENT)
- [ ] Configure encryption key (URGENT)
- [ ] Run passing tests (HIGH)
- [ ] Document known issues

---

## 🔧 Quick Fix Guide

### 1. Prisma Schema (30 min)
```bash
cd web
# Edit prisma/schema.prisma (see fixes above)
npx prisma validate
npx prisma generate
npx prisma migrate dev --name fix-relations
```

### 2. Encryption Key (5 min)
```bash
cd web
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "ENCRYPTION_KEY=$KEY" >> .env
echo "✅ Encryption key configured"
```

### 3. Test Database (15 min - Option B)
```bash
cd web
npm install -D vitest-mock-extended
# Edit vitest.setup.ts to mock Prisma
npm test
```

### Verify Fixes
```bash
# All should pass:
npx prisma validate        # ✅ No errors
npm test                   # ✅ Tests pass
node -e "console.log(process.env.ENCRYPTION_KEY)" # ✅ Key exists
```

---

## 📞 Support

**Questions?** Review the full test report:
- `/docs/PHASE2_TEST_REPORT.md` - Comprehensive analysis
- `/web/src/lib/__tests__/` - Test implementations

**Need Help?** Check:
1. Prisma docs: https://www.prisma.io/docs/concepts/components/prisma-schema/relations
2. Node crypto: https://nodejs.org/api/crypto.html
3. Vitest mocking: https://vitest.dev/guide/mocking.html

---

**Generated:** October 25, 2025
**Priority:** URGENT
**Blocking:** Production Deployment
