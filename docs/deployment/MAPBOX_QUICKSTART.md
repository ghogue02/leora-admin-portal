# Mapbox Integration - Quick Start Guide

**For:** Monday (Day 1) - Mapbox Setup & Geocoding
**Time Required:** 4 hours
**Current Status:** 4,871 customers need geocoding (0% complete)

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Your Mapbox Token

1. Go to: https://account.mapbox.com/access-tokens/
2. Click "Create a token"
3. **Name:** Leora Production
4. **Scopes:** Select all public scopes
5. Copy the token (starts with `pk.`)

### Step 2: Add to Environment

Edit `/Users/greghogue/Leora2/web/.env.local`:

```bash
# Add this line:
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE
```

### Step 3: Verify Setup

```bash
npm run geocode:verify
```

Expected output:
```
✅ Public Token Format - Valid pk. token format
✅ Geocoding API - Successfully geocoded test address
✅ Database Connection - Successfully connected to database
✅ ALL CHECKS PASSED - Ready to geocode customers!
```

## 🗺️ Geocode All Customers (2 Hours)

### Single Command

```bash
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed
```

This will:
- Process 4,871 customers in batches of 50
- Take ~2 hours (rate limited to 50/minute)
- Show progress every 50 customers
- Handle errors gracefully
- Pause 2 seconds between batches

### Monitor Progress

In another terminal:
```bash
npm run geocode:report -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed
```

Output shows:
- Current completion percentage
- Breakdown by state
- Recently geocoded customers
- Sample of failed addresses

## ✅ Verify Results

After geocoding completes:

```bash
npm run geocode:report
```

**Success Criteria:**
- ✅ >95% success rate (4,627+ of 4,871)
- ✅ All states represented
- ✅ Recent geocoding timestamps
- ✅ Minimal failures

## 🧪 Test Map Features

### 1. View Customer Map

Navigate to: http://localhost:3000/sales/customers/map

**Check:**
- Map loads with all customers
- Pins cluster at high zoom
- Click pin shows customer info

### 2. Test Heat Maps

Toggle "Heat Map" view:
- Revenue heat map
- Orders heat map
- Growth heat map

### 3. Test "Who's Closest"

1. Click "Find Nearest"
2. Enter: "New York, NY"
3. Radius: 25 miles
4. Verify distance calculations

### 4. Test Route Optimization

1. Select 5 customers (Ctrl+Click)
2. Click "Optimize Route"
3. Enter start location
4. Verify route is calculated

## 📊 Check Mapbox Usage

Go to: https://account.mapbox.com/statistics

**Verify:**
- Geocoding requests: ~4,871
- Map tile requests: Multiple from testing
- Still within free tier (100,000/month)
- No rate limit violations

## 🐛 Troubleshooting

### Token Not Working

```bash
# Test token manually
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token=YOUR_TOKEN"
```

**If error 401:** Token is invalid
**If error 403:** Token doesn't have required scopes

### Geocoding Slow/Failing

- Check internet connection
- Verify Mapbox API status
- Review error messages in script output
- Check rate limits in Mapbox dashboard

### Map Not Loading

1. Open browser console (F12)
2. Check for errors
3. Verify token in .env.local
4. Clear cache and reload
5. Check token starts with `pk.` (not `sk.`)

## 📝 Next Steps

After geocoding is complete:

**Tuesday:**
- Territory assignment
- Route planning setup

**Wednesday:**
- Sales analytics dashboard
- Performance optimization

**Thursday:**
- Testing and validation
- Production configuration

**Friday:**
- Final deployment
- Documentation updates

## 📄 Documentation

Full documentation:
- `/docs/deployment/MONDAY_MAPBOX_SETUP.md` - Detailed setup guide
- `/docs/MAPS_API_SETUP.md` - API reference
- `/docs/maps-quick-start.md` - User guide

## 💾 Memory Storage

Track progress in Claude Flow:
```bash
npx claude-flow@alpha hooks memory-write \
  --key "leora/deployment/monday/mapbox/status" \
  --value "geocoding-complete" \
  --tags "mapbox,deployment,monday"
```

## ⏱️ Time Breakdown

| Task | Time | Status |
|------|------|--------|
| Account setup | 30 min | ⏳ Pending |
| Environment config | 15 min | ⏳ Pending |
| Geocoding 4,871 customers | 120 min | ⏳ Pending |
| Test features | 60 min | ⏳ Pending |
| Verification | 30 min | ⏳ Pending |
| **TOTAL** | **255 min** | **~4.25 hours** |

## 🎯 Success Metrics

**Required:**
- ✅ 4,871 customers geocoded (>95% = 4,627+)
- ✅ Map displays all customers
- ✅ No console errors
- ✅ Within API limits

**Optional:**
- Heat maps working
- Route optimization tested
- Performance benchmarks recorded
- Production config documented

---

**Questions?** See full guide at `/docs/deployment/MONDAY_MAPBOX_SETUP.md`
