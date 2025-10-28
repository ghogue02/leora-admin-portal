# Maps & Territory System - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get Mapbox Token (2 minutes)

1. Visit https://account.mapbox.com/
2. Sign up or log in
3. Go to **Tokens** page
4. Click **Create a token**
5. Name it "Leora2 Maps"
6. Enable these scopes:
   - ✅ `styles:read`
   - ✅ `fonts:read`
   - ✅ `geocoding:read`
7. Click **Create token**
8. Copy the token

### Step 2: Configure Environment (1 minute)

Add to `/web/.env.local`:

```bash
# Mapbox Token (from Step 1)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0...

# Optional: Secret token for geocoding (use same token)
MAPBOX_SECRET_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0...

# Your tenant ID
NEXT_PUBLIC_TENANT_ID=your-tenant-uuid-here
```

### Step 3: Geocode Your Customers (2 minutes)

Run the geocoding script:

```bash
# Navigate to web directory
cd web

# Geocode all customers (dry run first to preview)
npm run geocode:customers -- --tenant-id=YOUR_TENANT_ID --dry-run

# If looks good, run for real
npm run geocode:customers -- --tenant-id=YOUR_TENANT_ID
```

**Expected output:**
```
🗺️  Customer Geocoding Script
============================

📍 Tenant: abc-123-def-456
🔍 Finding customers without coordinates...
Found 1247 customers needing geocoding
  1247 with partial/complete address
  0 without address (will be skipped)

🚀 Starting geocoding in 25 batch(es) of 50...
⏱️  This may take several minutes...

📦 Processing batch 1/25 (50 customers)...
  ✅ Success: 48
  ❌ Failed: 2
  ⏭️  Skipped: 0
...
```

### Step 4: Access the Map

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3000/sales/map
3. You should see your customers on the map!

## ✨ Key Features to Try

### 1. Find Nearby Customers

1. Click **Navigation icon** (4th tab) in sidebar
2. Click **"Use My Location"** button
3. Select radius: 25 miles
4. Click **"Find Nearby Customers"**
5. See customers sorted by distance!

### 2. Plan an Optimized Route

1. Click **Route icon** (5th tab) in sidebar
2. Select customers from map or from "Closest" search
3. Click **"Use My Location"** for start point
4. Click **"Optimize Route"**
5. View turn-by-turn directions
6. Click **"Open in Google Maps"**

### 3. View Heat Map

1. Click **Layers icon** (1st tab)
2. Toggle **"Heat Map"** switch ON
3. Zoom in/out to see revenue density
4. Red = high revenue areas, Blue = low revenue

## 🎯 Common Use Cases

### Morning Route Planning

```bash
1. Open "Who's Closest"
2. Use current location
3. Set radius to 25 miles
4. Select 5-8 customers to visit
5. Switch to "Route" tab
6. Optimize route
7. Export to Google Maps
8. Start driving!
```

### Territory Analysis

```bash
1. Enable Heat Map layer
2. Filter by territory
3. Identify high/low revenue areas
4. Click areas to see customer list
5. Adjust territory boundaries accordingly
```

### Customer Prospecting

```bash
1. Filter to show only "PROSPECT" accounts
2. Find clusters (use heat map)
3. Select cluster with Box Selection tool
4. Create focused call plan
5. Optimize visit route
```

## 📊 Sample Data

If you want to test with sample data first:

```sql
-- Add sample coordinates to a few customers
UPDATE customers
SET
  latitude = 37.7749 + (RANDOM() - 0.5) * 0.1,
  longitude = -122.4194 + (RANDOM() - 0.5) * 0.1,
  geocoded_at = NOW()
WHERE latitude IS NULL
LIMIT 50;
```

## 🐛 Troubleshooting

### Map shows "Mapbox Token Missing"
- **Fix:** Check `.env.local` has `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- **Restart:** Dev server after adding env variable

### No customers on map
- **Check:** Run geocoding script (Step 3)
- **Verify:** Database query: `SELECT COUNT(*) FROM customers WHERE latitude IS NOT NULL`

### Geocoding fails
- **Check:** Token has `geocoding:read` scope
- **Try:** Different address format
- **Verify:** Mapbox dashboard shows API calls

### Route optimization slow
- **Reduce:** Number of stops (try < 15 for 2-opt)
- **Use:** Nearest-neighbor for quick routes

## 💡 Pro Tips

1. **Batch Operations:** Geocode during off-peak hours
2. **Filtering:** Use filters to reduce map clutter
3. **Mobile:** Works on phone! Use geolocation feature
4. **Export:** Save routes as JSON for record keeping
5. **Caching:** Geocoding results are cached automatically

## 📚 Next Steps

- Read full documentation: `/docs/maps-territory-system.md`
- Explore API endpoints: `/docs/api/maps.md`
- Try advanced features:
  - Custom territory drawing
  - Multi-day route planning
  - Territory performance comparison

## 🆘 Need Help?

- **Documentation:** `/docs/maps-territory-system.md`
- **API Docs:** Check `/app/api/maps/` endpoints
- **Mapbox Docs:** https://docs.mapbox.com/
- **Support:** Create GitHub issue

---

**Happy Mapping! 🗺️**
