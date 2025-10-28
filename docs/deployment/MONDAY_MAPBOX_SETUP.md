# Monday: Mapbox Integration & Customer Geocoding

**Status:** In Progress
**Date:** 2025-10-27
**Timeline:** 4 hours
**Priority:** CRITICAL - Required for map features

## Current Status

- **Total Customers:** 4,871
- **With Coordinates:** 0 (0.0%)
- **Need Geocoding:** 4,871 (100.0%)
- **Tenant ID:** 58b8126a-2d2f-4f55-bc98-5b6784800bed

## Task 1: Mapbox Account Setup (30 min)

### Step 1.1: Create Mapbox Account

1. Visit https://account.mapbox.com/
2. Sign up with email (or use existing account)
3. Verify email address
4. Complete account setup

### Step 1.2: Generate Access Token

1. Go to https://account.mapbox.com/access-tokens/
2. Click "Create a token"
3. **Token Configuration:**
   - **Name:** Leora Production
   - **Scopes:** Select ALL public scopes:
     - `styles:tiles` - Required for map rendering
     - `styles:read` - Required for map styles
     - `fonts:read` - Required for text on maps
     - `datasets:read` - For dataset features
     - `vision:read` - For ML features
   - **URL Restrictions:** Leave empty for now (add later for production)

4. Click "Create token"
5. **COPY THE TOKEN IMMEDIATELY** - You won't see it again!

### Step 1.3: Document Token Securely

**Token Format:** `pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6IkNsXXXXXXXX...`

**CRITICAL SECURITY:**
- Store token in 1Password/LastPass/secure password manager
- Never commit token to git
- Never share token publicly
- Rotate token if compromised

## Task 2: Environment Configuration (15 min)

### Step 2.1: Add to .env.local

Open `/Users/greghogue/Leora2/web/.env.local` and add:

```bash
# Mapbox Configuration - Added 2025-10-27
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE
MAPBOX_SECRET_TOKEN=sk.YOUR_SECRET_TOKEN_HERE  # Optional: for server-side
```

**Note:** Use `NEXT_PUBLIC_` prefix so the token is accessible in browser for map rendering.

### Step 2.2: Verify Token Format

Run this verification script:

```bash
npx tsx -e "
const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
console.log('Token configured:', !!token);
console.log('Token starts with pk.:', token?.startsWith('pk.'));
console.log('Token length:', token?.length || 0);
console.log('Valid format:', token?.match(/^pk\\.eyJ[A-Za-z0-9_-]+/) ? 'YES' : 'NO');
"
```

Expected output:
```
Token configured: true
Token starts with pk.: true
Token length: 200+ characters
Valid format: YES
```

### Step 2.3: Test Token in Browser

1. Start dev server: `npm run dev`
2. Open browser console (F12)
3. Navigate to: http://localhost:3000/sales/map
4. Check console for:
   - ✅ Map loads successfully
   - ✅ No "Invalid token" errors
   - ❌ Any 401/403 errors

## Task 3: Geocode All Customers (2 hours)

### Step 3.1: Pre-Flight Check

```bash
# Verify database connection
npx prisma db pull

# Check customer count
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const count = await prisma.customer.count({
  where: { tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed' }
});
console.log('Customers to geocode:', count);
await prisma.\$disconnect();
"
```

### Step 3.2: Run Geocoding Script

**Command:**
```bash
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed --batch-size=50
```

**What This Does:**
1. Fetches all 4,871 customers without coordinates
2. Processes in batches of 50 customers
3. Rate-limited to ~50 geocodes/minute (well within Mapbox 600/min limit)
4. Saves coordinates back to database
5. Pauses 2 seconds between batches

**Expected Output:**
```
🗺️  Customer Geocoding Script
============================

📍 Tenant: 58b8126a-2d2f-4f55-bc98-5b6784800bed

🔍 Finding customers without coordinates...
Found 4871 customers needing geocoding
  4650 with partial/complete address
  221 without address (will be skipped)

🚀 Starting geocoding in 98 batch(es) of 50...
⏱️  This may take several minutes depending on the number of customers.

📦 Processing batch 1/98 (50 customers)...
  ✅ Success: 47
  ❌ Failed: 2
  ⏭️  Skipped: 1

⏸️  Pausing 2 seconds before next batch...

[... continues for all 98 batches ...]

🎉 Geocoding Complete!
======================
Total processed: 4871
✅ Successfully geocoded: 4420
❌ Failed: 230
⏭️  Skipped: 221

📊 Success rate: 90.7%
```

### Step 3.3: Monitor Progress

**In another terminal, run:**
```bash
watch -n 5 'npx tsx -e "
import { PrismaClient } from '\''@prisma/client'\'';
const prisma = new PrismaClient();
const total = await prisma.customer.count({
  where: { tenantId: '\''58b8126a-2d2f-4f55-bc98-5b6784800bed'\'' }
});
const geocoded = await prisma.customer.count({
  where: {
    tenantId: '\''58b8126a-2d2f-4f55-bc98-5b6784800bed'\'',
    latitude: { not: null },
    longitude: { not: null }
  }
});
console.log(\`Progress: \${geocoded}/\${total} (\${(geocoded/total*100).toFixed(1)}%)\`);
await prisma.\$disconnect();
"'
```

### Step 3.4: Handle Failed Addresses

**Check failed addresses:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const failed = await prisma.customer.findMany({
  where: {
    tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed',
    latitude: null
  },
  select: {
    id: true,
    name: true,
    street1: true,
    city: true,
    state: true,
    postalCode: true
  },
  take: 10
});

console.log('Sample Failed Addresses:');
failed.forEach(c => {
  const addr = [c.street1, c.city, c.state, c.postalCode].filter(Boolean).join(', ');
  console.log(\`- \${c.name}: \${addr || '(no address)'}\`);
});

await prisma.\$disconnect();
"
```

**Common failure reasons:**
1. Missing/incomplete address
2. Invalid address format
3. PO Box only (Mapbox can't geocode)
4. International address with wrong format
5. API rate limit hit (retry later)

**Retry failed addresses:**
```bash
# Re-run with smaller batch size
npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed --batch-size=10
```

## Task 4: Test Map Features (1 hour)

### Step 4.1: Customer Map View

1. Navigate to: http://localhost:3000/sales/customers/map
2. **Verify:**
   - ✅ Map loads and shows all customer pins
   - ✅ Pins cluster at high zoom levels
   - ✅ Click pin shows customer popup
   - ✅ Customer count matches geocoded count
   - ✅ No console errors

### Step 4.2: Heat Map Visualization

1. Click "Heat Map" toggle
2. **Test different metrics:**
   - Revenue (shows customer value concentration)
   - Orders (shows order frequency)
   - Growth (shows expanding markets)
3. **Verify:**
   - ✅ Heat map renders smoothly
   - ✅ Color intensity matches data
   - ✅ Zoom changes affect heat map radius
   - ✅ Metric switching works instantly

### Step 4.3: "Who's Closest" Feature

1. Click "Find Nearest" button
2. Enter test address: "123 Main St, New York, NY 10001"
3. Select radius: 25 miles
4. **Verify:**
   - ✅ Address geocodes successfully
   - ✅ Customers within radius are highlighted
   - ✅ Distance calculations are accurate
   - ✅ Results sorted by distance
   - ✅ Can click customer to view details

**Test locations:**
- New York, NY (should find many customers)
- Rural address (should find fewer)
- International address (should handle gracefully)

### Step 4.4: Route Optimization

1. Select 5 customers from map (Ctrl+Click)
2. Click "Optimize Route" button
3. Enter starting point: "Current Location" or address
4. **Verify:**
   - ✅ Route is calculated using nearest-neighbor algorithm
   - ✅ Route line shows on map
   - ✅ Distance and duration estimates shown
   - ✅ Waypoints numbered in order
   - ✅ Can export route to Google Maps

### Step 4.5: Map Performance Testing

**Test scenarios:**
1. **Zoom performance:**
   - Zoom from world view to street level
   - Should be smooth, no stuttering
   - Clustering should update dynamically

2. **Panning:**
   - Pan across entire US
   - Pins should load/unload smoothly
   - No memory leaks

3. **Filtering:**
   - Filter by account type (Active, Inactive)
   - Filter by territory
   - Filter by revenue tier
   - Filters should update map instantly

4. **Large dataset:**
   - All 4,871 customers should render
   - Clustering keeps performance smooth
   - Click individual clusters to expand

## Task 5: Verify Integration (30 min)

### Step 5.1: Check Mapbox API Usage

1. Go to: https://account.mapbox.com/
2. Click "Statistics"
3. **Verify:**
   - Geocoding API calls: ~4,871 (one per customer)
   - Map loads: Multiple (from testing)
   - Still within free tier (100,000/month)
   - No rate limit violations

### Step 5.2: Database Verification

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const stats = await prisma.customer.groupBy({
  by: ['tenantId'],
  where: { tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed' },
  _count: true,
  _avg: { latitude: true, longitude: true }
});

const withCoords = await prisma.customer.count({
  where: {
    tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed',
    latitude: { not: null },
    longitude: { not: null }
  }
});

console.log('Database Verification:');
console.log('=====================');
console.log('Total customers:', stats[0]._count);
console.log('With coordinates:', withCoords);
console.log('Success rate:', ((withCoords / stats[0]._count) * 100).toFixed(1) + '%');
console.log('Avg latitude:', stats[0]._avg.latitude);
console.log('Avg longitude:', stats[0]._avg.longitude);

await prisma.\$disconnect();
"
```

### Step 5.3: Test Different Zoom Levels

1. **World view** (zoom 2-4): Should see country-level clusters
2. **State view** (zoom 5-8): Should see state-level clusters
3. **City view** (zoom 9-12): Should see city-level clusters
4. **Street view** (zoom 13+): Should see individual pins

### Step 5.4: Test Filtering

**By Territory:**
```sql
SELECT territory, COUNT(*)
FROM Customer
WHERE tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND latitude IS NOT NULL
GROUP BY territory;
```

**By Account Status:**
```sql
SELECT accountType, COUNT(*)
FROM Customer
WHERE tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND latitude IS NOT NULL
GROUP BY accountType;
```

## Success Criteria

- ✅ Mapbox token obtained and configured
- ✅ All 4,871 customers geocoded (>95% success rate = 4,627+)
- ✅ Map displays all customers correctly
- ✅ Heat maps generate properly
- ✅ "Who's Closest" calculates distances accurately
- ✅ Route optimization works with 5+ customers
- ✅ Map performance smooth with full dataset
- ✅ No console errors or warnings
- ✅ Within Mapbox API limits (well below 100k/month)

## Deliverables

1. **Mapbox Token Documentation** - Token stored securely, documented
2. **Geocoding Report** - CSV with success/failure breakdown
3. **Test Results** - Screenshots and metrics from each test
4. **Configuration Guide** - Production-ready .env template
5. **Troubleshooting Doc** - Common issues and fixes

## Time Estimates

| Task | Estimated | Notes |
|------|-----------|-------|
| Account setup | 30 min | Includes token generation |
| Environment config | 15 min | Add to .env.local, verify |
| Geocoding 4,871 customers | 120 min | ~50/min, with error handling |
| Test map features | 60 min | All features thoroughly tested |
| Verification | 30 min | Stats, performance, docs |
| **TOTAL** | **255 min** | **~4.25 hours** |

## Production Configuration

For production deployment, add to `.env.production`:

```bash
# Mapbox - Production
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_production_token
MAPBOX_SECRET_TOKEN=sk.your_secret_token

# Rate Limiting
GEOCODING_RATE_LIMIT=600  # Free tier: 600/min

# Caching
GEOCODING_CACHE_TTL=2592000  # 30 days
```

**Production Checklist:**
- [ ] Create separate production Mapbox token
- [ ] Add URL restrictions to token (your-domain.com only)
- [ ] Set up monitoring/alerts for API usage
- [ ] Enable geocoding cache in production DB
- [ ] Document token rotation procedure
- [ ] Test with production data volume

## Troubleshooting

### Token Not Working
```bash
# Test token validity
curl "https://api.mapbox.com/geocoding/v5/mapbox.places/Los%20Angeles.json?access_token=YOUR_TOKEN"
```

Expected: JSON response with features
Error: 401 = invalid token, 403 = wrong scopes

### Geocoding Failures
- Check address format (street, city, state, zip)
- Verify Mapbox API is accessible (not blocked)
- Check rate limits in Mapbox dashboard
- Review failed addresses for patterns

### Map Not Loading
- Check browser console for errors
- Verify token starts with `pk.` (public token)
- Test token in Mapbox Playground
- Clear browser cache and reload

### Performance Issues
- Enable clustering for large datasets
- Use viewport bounds to limit results
- Optimize database indexes on lat/lng
- Consider CDN for static map tiles

## Next Steps (Tuesday+)

After geocoding is complete:
1. **Tuesday:** Territory assignment and optimization
2. **Wednesday:** Route planning and scheduling
3. **Thursday:** Sales analytics dashboard
4. **Friday:** Final testing and deployment

## Memory Keys

Store progress in Claude Flow memory:
- `leora/deployment/monday/mapbox/token-configured`
- `leora/deployment/monday/mapbox/geocoding-start`
- `leora/deployment/monday/mapbox/geocoding-complete`
- `leora/deployment/monday/mapbox/test-results`
- `leora/deployment/monday/mapbox/success-rate`
