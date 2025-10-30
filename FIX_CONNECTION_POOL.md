# 🔧 Fix Connection Pool Exhaustion - ACTION REQUIRED

**Issue:** Max clients reached in Session mode
**Impact:** LeorAI page failing, API routes timing out
**Root Cause:** Too many connections to pooler (port 5432)
**Solution:** Switch to Transaction mode OR wait for timeout

---

## 🚨 THE PROBLEM

Supabase has TWO connection modes:

### Session Mode (port 5432) - CURRENT
- **Max connections:** ~15-20
- **Used for:** Long-running queries, prepared statements
- **Problem:** We exhausted the pool with enrichment scripts

### Transaction Mode (port 6543) - RECOMMENDED
- **Max connections:** ~200
- **Used for:** Web apps, short queries
- **Benefit:** 10x more connections available

**You're using Session mode but need Transaction mode for web apps!**

---

## ✅ SOLUTION 1: Switch to Transaction Mode (2 minutes) ⭐ RECOMMENDED

### Step 1: Get Your Transaction URL from Supabase

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to: **Project Settings** → **Database**
4. Look for **Connection String** section
5. Select **Transaction** mode
6. Copy the connection string (it will have port **6543**)

### Step 2: Update .env.local

Replace your current DATABASE_URL with the Transaction mode URL:

**BEFORE (Session mode - port 5432):**
```
DATABASE_URL="postgresql://user:pass@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

**AFTER (Transaction mode - port 6543):**
```
DATABASE_URL="postgresql://user:pass@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**Key changes:**
- Port: `5432` → `6543`
- Add parameter: `?pgbouncer=true`

### Step 3: Restart Everything
```bash
# Kill all processes
pkill -f tsx
pkill -f node

# Wait for cleanup
sleep 5

# Start fresh
cd /Users/greghogue/Leora2/web
npm run dev
```

### Step 4: Test
Visit: http://localhost:3000/sales/leora

Should see: ✅ Auto-Insights loads successfully!

---

## ⏳ SOLUTION 2: Wait for Timeout (10-15 minutes)

If you don't want to change the connection string:

1. **Wait 10-15 minutes** for all connections to timeout
2. Don't run any database scripts during this time
3. Then restart your dev server
4. Connections will be freed automatically

**Status check:**
```bash
# Run this every few minutes to check
npx dotenv-cli -e .env.local -- bash -c 'psql "$DATABASE_URL" -c "SELECT 1;" 2>&1'
```

When you see:
```
 ?column?
----------
        1
```
Instead of "max clients" error, you're good to go!

---

## 🔍 SOLUTION 3: Check Supabase Dashboard

Sometimes you can force-close connections:

1. Go to Supabase Dashboard
2. Database → Connection Pooling
3. Look for option to restart pooler or close idle connections
4. This might free up connections immediately

---

## 📊 Current Status

### What's Working ✅
- Database is online
- 1,879 products have enrichment data (verified via direct psql earlier)
- Direct SQL queries work
- Your enriched data is safe

### What's Not Working ❌
- Prisma connections (pool exhausted)
- API routes requiring database
- LeorAI insights page
- Sales portal features

### Why This Happened
- Enrichment scripts created too many connections
- Session mode has very low limit
- Connections didn't close properly
- Pool got exhausted

---

## 💡 BEST PRACTICE GOING FORWARD

### For Web Apps (Next.js)
**Always use Transaction mode (port 6543)**
- Handles 200+ concurrent connections
- Perfect for web apps with many API routes
- Much more stable under load

### For Scripts
**Use Session mode (port 5432)** OR separate connection
- Better for long-running operations
- Supports prepared statements
- But limit concurrent scripts

### For Both
**Implement singleton Prisma client:**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 🎯 RECOMMENDATION

**Switch to Transaction mode NOW:**
1. Takes 2 minutes
2. Fixes the issue permanently
3. Prevents future problems
4. Industry best practice for web apps

**OR**

**Wait 15 minutes:**
1. No code changes needed
2. Connections will timeout
3. But problem might recur

---

## ✅ After Fix - Verification

Once fixed, test these:

```bash
# 1. Database connects
npx dotenv-cli -e .env.local -- bash -c 'psql "$DATABASE_URL" -c "SELECT 1;"'

# 2. Prisma works
npx dotenv-cli -e .env.local -- npx prisma db execute --schema prisma/schema.prisma --stdin <<< "SELECT 1;"

# 3. Start dev server
npm run dev

# 4. Test LeorAI page
# Visit: http://localhost:3000/sales/leora
# Should load without errors!
```

---

## 📝 Summary

**The Issue:** Connection pool exhaustion
**The Fix:** Switch to Transaction mode (port 6543)
**The Time:** 2 minutes to fix
**The Alternative:** Wait 10-15 minutes

**Your enrichment data is SAFE and COMPLETE!** This is just a connection pool configuration issue.

---

**I recommend switching to Transaction mode right now - it's the proper setup for web applications and will prevent this issue permanently.** 🚀

Let me know if you need help getting the Transaction mode connection string from Supabase!
