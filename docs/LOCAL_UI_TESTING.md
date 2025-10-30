# 🎨 Local UI Testing with Enriched Products

**You can now view the enriched UI locally!**

---

## ✅ What's Been Set Up

1. **Local SQLite Database** - Created at `/web/dev.db`
2. **10 Enriched Products** - Professional sommelier data
3. **Full UI Integration** - Catalog grid + drilldown modal
4. **No AWS Dependency** - Works completely offline

---

## 🚀 Start the Local Dev Server

### Option 1: Use the Startup Script
```bash
cd /Users/greghogue/Leora2/web
./start-local.sh
```

### Option 2: Manual Command
```bash
cd /Users/greghogue/Leora2/web
DATABASE_URL="file:./dev.db" npm run dev
```

---

## 🌐 Access the Application

Once the server starts, open your browser to:

```
http://localhost:3000
```

**Navigate to:**
- Sales Catalog: `http://localhost:3000/sales/catalog`
- Or wherever your catalog page is located

---

## 🍷 What You'll See

### Catalog Grid View
Each enriched product will display:
- ✅ Product name and brand
- ✅ **🍷 Tasting note preview** (e.g., "Dark cherry, vanilla, oak...")
- ✅ **📖 "View tasting notes" badge**
- ✅ Price and availability

**Example:**
```
┌──────────────────────────────────────┐
│ Château Margaux 2015                 │
│ Château Margaux • Red Wine           │
│ 🍷 Ripe fruit, subtle oak...         │  ← Preview!
│ [📖 View tasting notes]              │  ← Badge!
│ $45.00 • 5 available                 │
│ [Add to Cart]                        │
└──────────────────────────────────────┘
```

### Product Drilldown Modal
Click any enriched product to see:

1. **📖 Product Details Tab** (new!)
   - Professional description
   - **Tasting Notes** in 3 colored cards:
     - 🍷 Aroma (purple)
     - 👅 Palate (red)
     - ✨ Finish (amber)
   - **Food Pairings** (5 specific pairings as badges)
   - **Serving Guide** (temperature, decanting, glassware)
   - **Wine Details** (region, grapes, style, ageability)

2. **Existing Tabs** (unchanged)
   - 📦 Inventory
   - 💰 Pricing
   - 📈 Sales History

---

## 📊 Available Enriched Products

All 10 products in your local database are enriched:

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

---

## 🧪 Testing Checklist

### Catalog Grid
- [ ] See all 10 products listed
- [ ] Tasting note previews visible
- [ ] "📖 View tasting notes" badge appears
- [ ] Cards are responsive (try mobile view)

### Product Drilldown
- [ ] Click product opens modal
- [ ] See new "📖 Product Details" tab
- [ ] Tasting notes display in colored cards
- [ ] Food pairings show as green badges
- [ ] Serving info displays correctly
- [ ] Wine details section populated
- [ ] Existing tabs (Inventory, Pricing, Sales) still work

### Mobile Responsiveness
- [ ] Catalog grid adapts to mobile
- [ ] Modal is scrollable on mobile
- [ ] Tasting cards stack vertically on small screens
- [ ] All text is readable

---

## 🔧 Troubleshooting

### Products Don't Show
**Check:**
1. Database file exists: `ls -lh /Users/greghogue/Leora2/web/dev.db`
2. Products were seeded: See 10 ✅ messages above
3. Using correct DATABASE_URL: `file:./dev.db`

### Enrichment Data Missing
**Verify:**
```bash
# Check database contents
cd /Users/greghogue/Leora2/web
sqlite3 dev.db "SELECT name, enrichedBy FROM Product;"
```

**Should show:**
```
Château Margaux 2015|claude-code
Domaine Leroy Chardonnay|claude-code
...
```

### Details Tab Not Appearing
**Check:**
1. Product has `enrichedAt` timestamp
2. `tastingNotes` field is not null
3. Browser console for errors
4. Refresh page (Ctrl+R or Cmd+R)

---

## 🎯 Next Steps After Testing

Once you've verified the UI looks great:

1. **Approve Design** ✅ "Looks good, proceed with full enrichment"

2. **Wait for AWS** ⏳ When Supabase comes back online

3. **Upload to Production** (3 minutes)
   ```bash
   tsx scripts/check-aws-status.ts
   tsx scripts/upload-enrichment.ts
   ```

4. **Enrich All 1,285 Products** (~90 min)
   ```bash
   tsx scripts/generate-enrichment-local.ts --all
   tsx scripts/upload-enrichment.ts
   ```

---

## 💡 Local vs Production

| Aspect | Local (SQLite) | Production (Supabase) |
|--------|---------------|----------------------|
| Database | dev.db (SQLite) | PostgreSQL |
| Products | 10 enriched | 1,285 (will enrich) |
| Purpose | UI testing | Live sales portal |
| Data | Sample wines | Real inventory |
| Access | localhost:3000 | Your domain |

---

## 📝 Database Files

**Location:** `/Users/greghogue/Leora2/web/`

```
dev.db                      # SQLite database
dev.db-shm                  # Shared memory (auto-created)
dev.db-wal                  # Write-ahead log (auto-created)
```

**Size:** ~100 KB (10 products with full enrichment)

---

## 🗑️ Clean Up (When Done Testing)

To remove the local database and start fresh:

```bash
cd /Users/greghogue/Leora2/web
rm -f dev.db dev.db-shm dev.db-wal
```

Then re-run setup if needed:
```bash
tsx scripts/setup-local-db.ts
DATABASE_URL="file:./dev.db" tsx scripts/seed-local-db.ts
```

---

## ✅ Success Criteria

You should be able to:
- ✅ See 10 enriched products in catalog
- ✅ View tasting note previews on cards
- ✅ Click product and see Details tab
- ✅ Read professional descriptions
- ✅ See color-coded tasting notes
- ✅ View food pairings as badges
- ✅ Check serving recommendations
- ✅ Confirm mobile responsiveness

---

**Everything is ready! Just run `./start-local.sh` and browse to the catalog.** 🍷

Test it out and let me know if the UI looks good before we enrich all 1,285 products!
