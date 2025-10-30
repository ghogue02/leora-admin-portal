# 🚀 Deploy Phases 3-7 NOW
## Simple 3-Step Deployment

**Time:** 15 minutes total

---

## **STEP 1: Apply Database Schema** (5 minutes)

### **Copy the SQL:**

Open this file:
```
/Users/greghogue/Leora2/web/prisma/migrations/deploy-all-phases.sql
```

### **Paste into Supabase:**

1. Open: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
2. Copy **entire contents** of `deploy-all-phases.sql`
3. Paste into SQL Editor
4. Click **RUN** button
5. Wait for completion (~30 seconds)

**This creates 14 new tables for Phases 3, 5, 6, and 7!**

---

## **STEP 2: Update Prisma Client** (2 minutes)

```bash
cd /Users/greghogue/Leora2/web

# Sync schema from database
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

---

## **STEP 3: Seed Default Data** (5 minutes)

```bash
# Phase 3: Sample feedback templates
npx tsx scripts/seed-sample-feedback.ts

# Phase 3: Default triggers
npx tsx scripts/seed-default-triggers.ts 58b8126a-2d2f-4f55-bc98-5b6784800bed

# Phase 5: Warehouse configuration
npx tsx scripts/seed-warehouse-config.ts 58b8126a-2d2f-4f55-bc98-5b6784800bed
```

---

## **DONE!** ✅

All Phases 3-7 are now deployed!

**Restart your server:**
```bash
# Kill current server (Ctrl+C if running)
# Then restart:
npm run dev
```

---

## 🧪 **TEST THE NEW FEATURES**

**Phase 3:** http://localhost:3000/sales/analytics/samples
**Phase 5:** http://localhost:3000/sales/warehouse
**Phase 6:** http://localhost:3000/sales/map
**Phase 7:** http://localhost:3000/sales/customers/new/scan

**Login:** test@wellcrafted.com / test123

---

## 📋 **OPTIONAL: Install Extra Dependencies**

Already installed:
- ✅ @anthropic-ai/sdk
- ✅ recharts

If you want Phase 6 maps now:
```bash
npm install mapbox-gl react-map-gl @turf/turf
```

**Note:** Maps won't fully work without Mapbox token, but UI will load

---

**That's it! 3 simple steps and all phases are deployed!** 🎉
