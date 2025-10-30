# 🚀 Quick Start: When AWS Comes Back Online

**Ready to go in 3 commands!**

---

## ✅ Everything is Prepared

- ✅ Database migration applied (6 enrichment fields)
- ✅ UI components complete (Details tab + catalog previews)
- ✅ API routes updated
- ✅ 10 sample products enriched locally (17 KB JSON file)
- ✅ Upload scripts ready

---

## 🎯 Execute This When AWS is Back

### 1. Check AWS Status (30 seconds)
```bash
cd /Users/greghogue/Leora2/web
tsx scripts/check-aws-status.ts
```

**Wait for:**
```
✅ DATABASE IS ONLINE!
   Connection time: 45ms
   Status: Ready for enrichment upload
```

---

### 2. Upload Sample Enrichment (1 minute)
```bash
tsx scripts/upload-enrichment.ts
```

**You'll see:**
```
✅ Database connection successful!
📊 Loaded 10 enriched products from file

[1/10] ✅ Uploaded: Château Margaux 2015
[2/10] ✅ Uploaded: Domaine Leroy Chardonnay
...
[10/10] ✅ Uploaded: Miraval Rosé

✅ Successful: 10/10
```

---

### 3. Verify UI (2 minutes)
```bash
npm run dev
```

**Check:**
- Navigate to sales catalog
- Look for 🍷 tasting note previews on cards
- Click product to see 📖 Product Details tab
- Verify tasting notes, food pairings, serving info display

---

## 🎉 That's It!

Your 10 products are now enriched and displaying beautifully.

---

## 📊 What's Enriched

10 sample products with professional sommelier data:

1. **Château Margaux 2015** (Red Wine)
2. **Domaine Leroy Chardonnay** (White Wine)
3. **Moët & Chandon Champagne** (Sparkling)
4. **Whispering Angel Rosé** (Rosé)
5. **Caymus Cabernet Sauvignon** (Red)
6. **Cloudy Bay Sauvignon Blanc** (White)
7. **Veuve Clicquot Brut** (Sparkling)
8. **La Rioja Alta Gran Reserva** (Red)
9. **Kim Crawford Pinot Grigio** (White)
10. **Miraval Rosé** (Rosé)

**Each has:**
- Professional description
- Tasting notes (aroma, palate, finish)
- 5 food pairings
- Serving information
- Wine details (region, grapes, style, ageability)

---

## 🔄 Next: Enrich All 1,285 Products

After verifying the 10 samples work:

```bash
# Generate enrichment for all products locally
tsx scripts/generate-enrichment-local.ts --all

# Upload when ready
tsx scripts/upload-enrichment.ts
```

**Time:** ~90 minutes for full enrichment
**Cost:** $0 (using Claude Code)

---

## 📁 Files Location

**Data:**
- `/web/data/enriched-products.json` - 10 products (17 KB)

**Scripts:**
- `/web/scripts/check-aws-status.ts` - Check database
- `/web/scripts/upload-enrichment.ts` - Upload enrichment
- `/web/scripts/generate-enrichment-local.ts` - Generate more

**Docs:**
- `/docs/READY_FOR_AWS.md` - Detailed guide
- `/docs/LOCAL_ENRICHMENT_SETUP.md` - Workflow docs
- `/QUICK_START_WHEN_AWS_RETURNS.md` - This file

---

## 💡 Tips

- Run `check-aws-status.ts` periodically to see when AWS is back
- The upload is idempotent (safe to run multiple times)
- All enrichment data is in JSON - easy to review/modify
- UI automatically shows enrichment when data exists

---

**Total time from AWS coming back to live enrichment: ~3 minutes** ⚡

Just bookmark this file and run the 3 commands when AWS is back!
