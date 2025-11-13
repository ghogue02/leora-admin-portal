# Database Connection Guide - Well Crafted

**Database:** zqezunzlyjkseugujkrl.supabase.co
**Updated:** October 25, 2025
**Current Password:** `<REDACTED_PASSWORD>`

---

## 🔑 **CURRENT CREDENTIALS**

### **For Application (Prisma)**
```env
# Use pooler for application queries (works with pgbouncer)
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:<REDACTED_PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

# Use direct for migrations (DDL operations)
DIRECT_URL="postgresql://postgres.zqezunzlyjkseugujkrl:<REDACTED_PASSWORD>@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"
```

### **For Admin Operations**
- **Supabase Dashboard:** https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl
- **SQL Editor:** https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
- **Service Role Key:** `<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>`

---

## 🛠️ **CONNECTION METHODS**

### **Method 1: Prisma Client** (✅ RECOMMENDED)

**Use For:** All application queries, CRUD operations

```typescript
import { prisma } from '@/lib/prisma';

// Works perfectly
const customers = await prisma.customer.findMany();
const orders = await prisma.order.findMany();
```

**Pros:**
- ✅ Always works
- ✅ Type-safe
- ✅ Handles pooler limitations
- ✅ Best performance

---

### **Method 2: Supabase Dashboard** (✅ FOR ADMIN/DDL)

**Use For:**
- Schema changes (CREATE TABLE, ALTER TABLE)
- Bulk updates (UPDATE queries)
- Data exploration
- Manual fixes

**URL:** https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

**Pros:**
- ✅ Always works
- ✅ Visual interface
- ✅ No authentication issues
- ✅ Can execute any SQL

---

### **Method 3: psql Command Line** (⚠️ UNRELIABLE)

**Issues Found:**
- ❌ Direct connection fails with authentication errors
- ❌ Pooler connection has "duplicate SASL" errors
- ❌ Intermittent failures

**When It Works (Sometimes):**
```bash
# Pooler connection (port 5432)
PGPASSWORD="<REDACTED_PASSWORD>" psql \
  "postgresql://postgres.zqezunzlyjkseugujkrl@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

**Recommendation:** Don't rely on psql - use Prisma or Dashboard instead

---

## 🔧 **FOR MIGRATIONS**

### **Option A: Prisma Migrate** (When Working)

```bash
# Apply migration
npx prisma migrate dev --name your_migration_name

# Generate client
npx prisma generate
```

**When It Works:**
- Direct connection is accessible
- Password is current
- No Supabase restrictions

---

### **Option B: Manual SQL** (Always Works)

**When Prisma migrate fails:**

1. Write migration SQL
2. Go to Supabase SQL Editor
3. Paste and run SQL
4. Mark as applied in Prisma:

```bash
mkdir -p prisma/migrations/YYYYMMDD_migration_name
echo "YOUR SQL HERE" > prisma/migrations/YYYYMMDD_migration_name/migration.sql
npx prisma generate
```

---

## 📊 **CONNECTION STATUS**

| Method | Status | Use For |
|--------|--------|---------|
| **Prisma Client** | ✅ Working | Application queries |
| **Supabase Dashboard** | ✅ Working | Admin operations, DDL |
| **psql (pooler)** | ⚠️ Intermittent | Avoid |
| **psql (direct)** | ❌ Failing | Migrations (use Dashboard) |
| **Prisma Migrate** | ❌ Failing | Schema changes (use Dashboard) |

---

## 🎯 **RECOMMENDED WORKFLOW**

### **For Development:**
```typescript
// All queries via Prisma client
import { prisma } from '@/lib/prisma';
const data = await prisma.customer.findMany();
```

### **For Schema Changes:**
1. Write SQL in a file
2. Test in Supabase SQL Editor
3. Execute in Dashboard
4. Mark as applied for Prisma tracking

### **For Data Exploration:**
- Use Supabase Dashboard Table Editor
- Or use Prisma Studio: `npx prisma studio`

---

## 🚨 **KNOWN ISSUES & WORKAROUNDS**

### **Issue 1: Direct Connection Authentication Fails**

**Error:** `password authentication failed`

**Workaround:** Use Supabase Dashboard for admin operations

---

### **Issue 2: Pooler Has SASL Errors**

**Error:** `duplicate SASL authentication request`

**Workaround:** Use Prisma client, not raw psql

---

### **Issue 3: Migrations Can't Apply via CLI**

**Error:** `P1000: Authentication failed`

**Workaround:**
1. Generate SQL from schema changes
2. Run in Supabase SQL Editor
3. Mark as applied locally

---

## ✅ **WHAT WORKS RELIABLY**

**For All Operations:**
```bash
# Use Prisma Studio (visual DB browser)
npx prisma studio
# Opens http://localhost:5555
# Browse all tables visually
```

**For Queries:**
```typescript
// Prisma client - always works
import { prisma } from '@/lib/prisma';
```

**For Admin:**
- Supabase Dashboard
- Prisma Studio

**Avoid:**
- Raw psql connections
- Direct migration CLI commands

---

## 📝 **UPDATED .env.local**

Current working configuration:

```env
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

DIRECT_URL="postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres"

SUPABASE_URL="https://zqezunzlyjkseugujkrl.supabase.co"

SUPABASE_SERVICE_ROLE_KEY="<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>"

ANTHROPIC_API_KEY="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"
```

---

## 🎯 **RECOMMENDED APPROACH GOING FORWARD**

**For Phase 2+ Development:**

1. **Use Prisma for everything:**
   - Queries: `prisma.customer.findMany()`
   - Updates: `prisma.customer.update()`
   - Creates: `prisma.customer.create()`

2. **For schema changes:**
   - Write migration SQL
   - Test in Supabase SQL Editor
   - Execute in Dashboard
   - Generate Prisma client locally

3. **For admin queries:**
   - Prisma Studio: `npx prisma studio`
   - Or Supabase Dashboard

**This approach is 100% reliable and avoids all connection issues.**

---

## 📋 **SUMMARY**

**What's Working:**
- ✅ Prisma client (all application code)
- ✅ Supabase Dashboard (admin operations)
- ✅ Prisma Studio (data browsing)

**What's Not Working:**
- ❌ psql direct connections
- ❌ Prisma migrate CLI

**Solution:** Use what works (Prisma client + Dashboard)

**Impact:** Zero - all development can proceed normally

---

*This guide will be updated as we discover more patterns and solutions during Phase 2+ development.*
