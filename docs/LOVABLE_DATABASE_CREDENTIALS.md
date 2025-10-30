# Lovable Database Credentials
## Production Supabase Database Connection

**Created:** 2025-10-22
**Purpose:** Lovable Cloud Backend - Production Database
**Status:** ✅ ACTIVE

---

## 🔑 Database Credentials

### Supabase Project Details

**Project URL:** `https://wlwqkblueezqydturcpv.supabase.co`

**Project ID:** `wlwqkblueezqydturcpv`

**Region:** AWS (auto-selected by Supabase)

### API Keys

**Anon/Publishable Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjQxMTIsImV4cCI6MjA3NjY0MDExMn0.sNKEfoiYtbsrnDFK_Iy1aFfetqJ0KNJgE5rxrbzW3b4
```

**Service Role Key (PRIVATE - Server-side only):**
```
<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>
```

---

## 🔌 Connection Strings

### PostgreSQL Connection (Direct)

**Format:** `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres`

**Connection String Pattern:**
```bash
# Direct connection (for migrations, admin tasks)
postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Pooled connection (for application)
postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Note:** You need to get the database password from Lovable Supabase dashboard.

### How to Get Database Password

1. Go to: `https://supabase.com/dashboard/project/wlwqkblueezqydturcpv`
2. Navigate to: **Settings** → **Database**
3. Under **Connection String**, click **Reveal** to see password
4. Copy the connection string

---

## 📁 Environment Variables

### For `.env.local` (Lovable Database)

```env
# Lovable Database - Production
DATABASE_URL="postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
SHADOW_DATABASE_URL="postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres_shadow"

# Supabase API
SUPABASE_URL="https://wlwqkblueezqydturcpv.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjQxMTIsImV4cCI6MjA3NjY0MDExMn0.sNKEfoiYtbsrnDFK_Iy1aFfetqJ0KNJgE5rxrbzW3b4"
SUPABASE_SERVICE_ROLE_KEY="<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>"

# Public (Client-side)
NEXT_PUBLIC_SUPABASE_URL="https://wlwqkblueezqydturcpv.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjQxMTIsImV4cCI6MjA3NjY0MDExMn0.sNKEfoiYtbsrnDFK_Iy1aFfetqJ0KNJgE5rxrbzW3b4"
```

**IMPORTANT:** Replace `[PASSWORD]` with actual password from Supabase dashboard

---

## 🔄 Two Databases in Use

### Well Crafted Database (Source)
- **URL:** `https://zqezunzlyjkseugujkrl.supabase.co`
- **Purpose:** Original/source database
- **Status:** ✅ Has all migrated data
- **Location:** `.env.local` (current)

### Lovable Database (Target)
- **URL:** `https://wlwqkblueezqydturcpv.supabase.co`
- **Purpose:** Lovable production database
- **Status:** ⚠️ Needs data migrated TO it
- **Location:** Need to configure

---

## 🚨 Important Discovery

**All migration work was done on the Well Crafted database (`zqezunzlyjkseugujkrl`), NOT the Lovable database (`wlwqkblueezqydturcpv`)!**

### What Was Done (Wrong Database):
- ✅ Reclassified supplier invoices
- ✅ Created 1,322 SKUs
- ✅ Created 1,261 Products
- ✅ Created 7,774 OrderLines

### What Still Needs To Be Done:
- ⏭️ Apply ALL this work to the Lovable database
- ⏭️ Migrate data from Well Crafted → Lovable

---

## 🎯 Next Steps

### Option 1: Data Migration (RECOMMENDED)
Copy all data from Well Crafted database to Lovable database:
1. Export data from Well Crafted Supabase
2. Import into Lovable Supabase
3. Includes all SKUs, Products, OrderLines created

### Option 2: Re-run All Scripts
Point scripts to Lovable database and re-run:
1. Update .env.local to use Lovable connection
2. Re-run all migration scripts
3. Takes longer but ensures clean state

---

## 📋 Database Comparison

| Database | Project ID | Purpose | Current State |
|----------|-----------|---------|---------------|
| **Well Crafted** | zqezunzlyjkseugujkrl | Source/Original | ✅ Fully migrated with all fixes |
| **Lovable** | wlwqkblueezqydturcpv | Target/Production | ❓ Unknown state |

---

## 🔧 How to Get Lovable Password

1. Visit: https://supabase.com/dashboard/project/wlwqkblueezqydturcpv/settings/database
2. Scroll to **Connection String** section
3. Select **URI** tab
4. Click **Reveal** to see full connection string
5. Copy the password portion

Or use the Service Role Key for admin access via Supabase client.

---

## 📞 Quick Access

**Lovable Supabase Dashboard:**
https://supabase.com/dashboard/project/wlwqkblueezqydturcpv

**Well Crafted Supabase Dashboard:**
https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl

---

## 🔐 Security Notes

- ⚠️ **NEVER commit Service Role Key** to git
- ✅ Store in `.env.local` (gitignored)
- ✅ Use Anon Key for client-side only
- ✅ Use Service Role Key for server-side/admin only

---

**Document saved:** `/docs/LOVABLE_DATABASE_CREDENTIALS.md`
**Status:** Credentials documented, password needed from Supabase dashboard
