# 🗺️ Mapbox Integration - START HERE

**You are here:** Monday (Day 1) - Mapbox Setup & Customer Geocoding
**Time needed:** 4 hours
**Current status:** 0 of 4,871 customers geocoded

## 🎯 Your Mission Today

Get a Mapbox account, configure it, and geocode all 4,871 customers so they appear on the map.

## 📋 What You'll Accomplish

By the end of today, you'll have:
- ✅ Working Mapbox account with access token
- ✅ 4,871 customers geocoded (addresses → GPS coordinates)
- ✅ Customer map displaying all customers
- ✅ Heat maps showing customer concentration
- ✅ "Who's Closest" feature working
- ✅ Route optimization functional

## 🚀 The 3-Step Process

### STEP 1: Get Your Mapbox Token (10 minutes)

1. **Go to Mapbox:** https://account.mapbox.com/access-tokens/
2. **Sign up/Login:** Create account or use existing
3. **Create Token:**
   - Click "Create a token"
   - Name: "Leora Production"
   - Scopes: Check ALL public scopes
   - Click "Create token"
4. **Copy Token:** It looks like `pk.eyJ1IjoieW91...` (very long)
5. **Save Token:** Store in 1Password/secure location

### STEP 2: Add Token to Environment (2 minutes)

1. **Open file:** `/Users/greghogue/Leora2/web/.env.local`
2. **Add this line at the end:**
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE
   ```
3. **Replace** `pk.YOUR_TOKEN_HERE` with your actual token
4. **Save** the file

### STEP 3: Run the Geocoding (2 hours)

Open terminal in `/Users/greghogue/Leora2/web` and run:

```bash
# First, verify everything is set up correctly
npm run geocode:verify

# You should see all green checkmarks. Then run:
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed
```

**What happens:**
- Script processes 4,871 customers
- Runs in batches of 50
- Shows progress every 50 customers
- Takes about 2 hours
- You'll see: "✅ Success: 47, ❌ Failed: 2, ⏭️ Skipped: 1" for each batch

**While it's running:**
Open another terminal and monitor progress:
```bash
npm run geocode:report
```

## ⏱️ Time Breakdown

| What | How Long | When |
|------|----------|------|
| Get Mapbox account & token | 10 min | Do first |
| Add token to .env.local | 2 min | Right after |
| Verify setup | 1 min | Before geocoding |
| Geocode 4,871 customers | 120 min | Main task |
| Test map features | 60 min | After geocoding |
| Verify & document | 30 min | Final step |
| **TOTAL** | **~4 hours** | **Today** |

## 🧪 After Geocoding: Test Everything

Once geocoding finishes (you'll see "🎉 Geocoding Complete!"):

### 1. Check the Report
```bash
npm run geocode:report
```
Should show: **>95% success rate** (4,627+ of 4,871 customers)

### 2. View the Map
1. Start dev server: `npm run dev`
2. Open: http://localhost:3000/sales/customers/map
3. You should see **4,871 customer pins** on the map!

### 3. Test Features
- **Zoom in/out:** Map should be smooth, customers cluster
- **Click a pin:** Should show customer info
- **Heat Map:** Toggle to see customer concentration
- **Find Nearest:** Enter "New York, NY", radius 25 miles
- **Route:** Select 5 customers, click "Optimize Route"

## 📚 If You Need Help

### Quick Reference
- **Fast overview:** `MAPBOX_QUICKSTART.md`
- **Step-by-step:** `MONDAY_MAPBOX_SETUP.md`
- **Progress tracker:** `MAPBOX_CHECKLIST.md`
- **Technical details:** `MAPBOX_SUMMARY.md`

### Common Issues

**Problem:** Token not working
```bash
# Test it manually:
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token=YOUR_TOKEN"
```
Should return JSON. If error 401, token is invalid.

**Problem:** Geocoding script fails
- Check internet connection
- Verify .env.local has correct token
- Make sure token starts with `pk.` (not `sk.`)
- Restart terminal and try again

**Problem:** Map won't load
- Clear browser cache
- Check browser console (F12) for errors
- Verify token in .env.local
- Make sure dev server is running

## ✅ Success Checklist

Mark each when complete:

- [ ] Mapbox account created
- [ ] Access token copied to secure location
- [ ] Token added to .env.local
- [ ] `npm run geocode:verify` shows all green ✅
- [ ] Geocoding script completed successfully
- [ ] Success rate >95% (4,627+ customers)
- [ ] Map displays all customers
- [ ] Heat maps work
- [ ] "Find Nearest" works
- [ ] Route optimization works
- [ ] All features tested and documented

## 🎯 What Success Looks Like

When you're done:
1. ✅ Terminal shows: "🎉 Geocoding Complete! Success rate: 95.2%"
2. ✅ Map shows 4,871+ customer pins across the US
3. ✅ Heat map shows customer concentration
4. ✅ "Find Nearest" returns customers within specified radius
5. ✅ Route optimization draws a route through selected customers

## 📊 The Numbers

- **Customers to geocode:** 4,871
- **Success rate target:** >95% (4,627+ customers)
- **Time per customer:** ~1.5 seconds (with rate limiting)
- **API calls needed:** ~4,871
- **Mapbox free tier:** 100,000/month (plenty of room!)
- **Cost:** $0 (free tier)

## 🚀 Ready to Start?

1. **Get token** from Mapbox (10 min)
2. **Add to .env.local** (2 min)
3. **Run geocoding** (2 hours)
4. **Test features** (1 hour)
5. **Document results** (30 min)

**Total time:** ~4 hours

## 📞 Need More Detail?

- **Quick start:** See `MAPBOX_QUICKSTART.md`
- **Full guide:** See `MONDAY_MAPBOX_SETUP.md`
- **Checklist:** See `MAPBOX_CHECKLIST.md`
- **API docs:** See `/docs/MAPS_API_SETUP.md`

---

## 🎬 Let's Begin!

**Your first command:**
```bash
cd /Users/greghogue/Leora2/web
npm run geocode:verify
```

If you see errors, you need to:
1. Get Mapbox token from https://account.mapbox.com/access-tokens/
2. Add to .env.local: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token`
3. Run `npm run geocode:verify` again

**Once all checks pass:**
```bash
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed
```

**Then grab coffee ☕ and wait ~2 hours while it processes!**

---

**Good luck! You've got this! 🚀**
