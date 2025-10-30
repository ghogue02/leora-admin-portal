# Customer Map Setup Guide

## Issue: Blank Map Page

The customer map shows a blank white screen because it requires two things:

### 1. Mapbox API Token (Required)

**Get a free Mapbox token:**

1. Go to https://www.mapbox.com
2. Sign up for a free account
3. Navigate to your Account → Tokens
4. Copy your "Default public token" OR create a new one
5. Add to `/web/.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHgifQ.xxxxxxxxxxxxx
```

6. Restart your dev server:
```bash
cd web
npm run dev
```

**Note**: Mapbox free tier includes 50,000 free map loads per month, which is plenty for most use cases.

---

### 2. Geocoded Customer Addresses (Required)

Customers need latitude/longitude coordinates to appear on the map.

**Check if customers have coordinates:**

```sql
SELECT
  COUNT(*) as total_customers,
  COUNT(latitude) as geocoded_customers,
  COUNT(*) - COUNT(latitude) as missing_coordinates
FROM "Customer"
WHERE "tenantId" = 'your-tenant-id'
  AND "isPermanentlyClosed" = false;
```

**If customers are missing coordinates, you have 3 options:**

#### Option A: Use Geocoding API (Recommended)

Create a script to geocode all customer addresses:

```typescript
// web/scripts/geocode-customers.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

async function geocodeAddress(address: string, city: string, state: string) {
  const query = encodeURIComponent(`${address}, ${city}, ${state}`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.features && data.features.length > 0) {
    const [longitude, latitude] = data.features[0].center;
    return { latitude, longitude };
  }
  return null;
}

async function geocodeAllCustomers() {
  const customers = await prisma.customer.findMany({
    where: {
      latitude: null,
      street1: { not: null },
      city: { not: null },
      state: { not: null },
    },
  });

  console.log(`Found ${customers.length} customers to geocode`);

  for (const customer of customers) {
    const coords = await geocodeAddress(
      customer.street1!,
      customer.city!,
      customer.state!
    );

    if (coords) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          geocodedAt: new Date(),
        },
      });
      console.log(`✓ Geocoded: ${customer.name}`);
    } else {
      console.log(`✗ Failed: ${customer.name}`);
    }

    // Rate limiting: wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

geocodeAllCustomers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run it:
```bash
npx tsx web/scripts/geocode-customers.ts
```

#### Option B: Manual Entry

For a few customers, you can manually add coordinates:

```sql
UPDATE "Customer"
SET
  latitude = 37.7749,
  longitude = -122.4194,
  "geocodedAt" = NOW()
WHERE id = 'customer-id-here';
```

Use Google Maps to find coordinates:
1. Right-click location on Google Maps
2. Click coordinates to copy (e.g., "37.7749, -122.4194")
3. First number is latitude, second is longitude

#### Option C: Bulk Import with CSV

If you have a CSV with addresses, geocode them in bulk:
1. Use https://www.geocod.io (free tier: 2,500 lookups/day)
2. Upload your CSV with addresses
3. Download results with latitude/longitude
4. Import back to database

---

## Testing the Map

Once configured, the map will:

✅ Show all customers with geocoded locations
✅ Color-code by health status (green, yellow, red)
✅ Show popup on click with customer details
✅ Support filtering by risk status
✅ Calculate routes between selected customers

---

## Troubleshooting

### "Mapbox token not configured"
- Check `.env.local` has `NEXT_PUBLIC_MAPBOX_TOKEN`
- Verify token starts with `pk.`
- Restart dev server after adding token

### "No customers with geocoded locations found"
- Run the geocoding script
- Check database for customers with latitude/longitude
- Verify customers have valid addresses (street, city, state)

### Map loads but no markers
- Check browser console for errors
- Verify API endpoint returns data: `http://localhost:3000/api/sales/customers/map`
- Check customer data has both latitude AND longitude (not null)

### Rate limiting errors
- Mapbox free tier: 100,000 requests/month
- Add delays between geocoding requests (see script above)
- Consider caching geocoded results

---

## Production Checklist

Before deploying to production:

- [ ] Add Mapbox token to production environment variables
- [ ] Geocode all customer addresses
- [ ] Test map with real customer data
- [ ] Set up monitoring for Mapbox API usage
- [ ] Consider Mapbox pricing if over free tier limits
- [ ] Add error tracking (Sentry, etc.) for geocoding failures

---

## Free Tier Limits

**Mapbox Free Tier:**
- 50,000 map loads/month
- 100,000 geocoding requests/month
- No credit card required

**More than enough for:**
- Small to medium sales teams (< 100 users)
- Up to 10,000 customers on map
- Daily usage by sales reps

---

## Alternative: Use Google Maps

If you prefer Google Maps over Mapbox, you can swap out the mapping library:

1. Get Google Maps API key
2. Replace Mapbox GL with Google Maps JavaScript API
3. Update customer map component
4. Similar pricing structure (Google also has free tier)

Mapbox is recommended because:
- Better performance
- More modern API
- Easier to customize
- Better mobile support
