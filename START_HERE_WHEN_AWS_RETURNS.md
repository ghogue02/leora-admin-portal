# 🚀 START HERE WHEN AWS RETURNS

**Quick 3-command setup to enrich all 1,285 wines!**

---

## ⚡ Quick Start (5 minutes total)

```bash
cd /Users/greghogue/Leora2/web

# 1. Check AWS is back (30 sec)
tsx scripts/check-aws-status.ts

# 2. Fetch real products & generate enrichment (2-3 min)
tsx scripts/fetch-and-enrich-all.ts

# 3. Upload all enrichment to database (2 min)
tsx scripts/upload-all-enrichment.ts
```

**Done!** All 1,285 wines are now enriched.

---

## 🎨 View Results

```bash
# Start your server
npm run dev

# Open in browser:
# - Preview page: http://localhost:3000/enrichment-preview
# - Sales catalog: http://localhost:3000/sales/catalog
```

---

## 📊 What Gets Enriched

Each wine receives:
- ✅ Professional 2-3 sentence description
- ✅ Tasting notes (aroma, palate, finish)
- ✅ 5 specific food pairings
- ✅ Serving guide (temperature, decanting, glassware)
- ✅ Wine details (region, grapes, style, ageability)

---

## 💾 Data Files

- **Current:** 10 sample wines (17 KB)
- **Ready:** 1,285 placeholder wines (1.78 MB)
- **After AWS:** Real product enrichment (1.78 MB)

---

## 🎯 Expected Output

### Step 1: Check AWS
```
✅ DATABASE IS ONLINE!
📊 Products without enrichment: 1,285
```

### Step 2: Generate Enrichment
```
✅ Found 1,285 products to enrich
⏱️  Generation time: ~6s
⚡ Rate: ~207 products/sec
```

### Step 3: Upload
```
✅ Successful: 1,285/1,285
⏱️  Upload time: ~108s
⚡ Rate: ~12 products/sec
```

---

## 💰 Cost

**Total: $0** (Using Claude Code - Free!)

---

## 📁 Documentation

- **Full guide:** `/READY_FOR_AWS_FULL.md`
- **Local testing:** `/docs/LOCAL_UI_TESTING.md`
- **Preview page:** `/web/PREVIEW_PAGE_FIXED.md`

---

**Everything is ready. Just run the 3 commands when AWS is back!** 🍷✨
