# Phase 2 Customer Features - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Environment Setup
Add to your `.env` file:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

**Get a Mapbox token**:
1. Go to https://account.mapbox.com/
2. Sign up or log in
3. Create a new token with `styles:read` and `navigation:read` scopes
4. Copy the token to your `.env` file

### Step 2: Verify Dependencies
All required packages are already installed:
```bash
npm list mapbox-gl recharts date-fns lucide-react
```

### Step 3: Database Check
Ensure customers have location data:
```sql
-- Check if customers have coordinates
SELECT COUNT(*) FROM customers WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- If needed, add sample coordinates (for testing)
UPDATE customers SET
  latitude = 37.7749,
  longitude = -122.4194
WHERE latitude IS NULL;
```

## 📍 New Routes Available

### Customer Map View
**URL**: `/sales/customers/map`

**Features**:
- Geographic view of all customers
- Color-coded health status pins
- Route calculation
- Drive time estimation

**How to Access**:
1. Navigate to `/sales/customers/map`
2. Click pins to see customer info
3. Select multiple customers
4. Click "Show Route" for directions

### Customer Detail Enhancements
**URL**: `/sales/customers/[customerId]`

**New Sections**:
1. **AI-Powered Insights** - Intelligent analysis and predictions
2. **Order Deep Dive** - Product-level breakdown
3. **Product History Reports** - Visual timeline and trends

## 🎯 Feature Highlights

### 1. Order Deep Dive
**What**: Detailed product ordering analysis

**How to Use**:
1. Go to any customer detail page
2. Scroll to "Order History Deep Dive" section
3. Click column headers to sort
4. Click "Export CSV" to download data

**Data Shown**:
- Products ordered by this customer
- Last order date per product
- Total orders and revenue
- Average frequency (days between orders)
- Orders per month

### 2. Product History Reports
**What**: Visual timeline of product purchases

**How to Use**:
1. On customer detail page
2. Find "Product History Reports" section
3. Select date range (3m, 6m, 12m)
4. View interactive chart
5. See trend indicators below

**Insights**:
- Purchase patterns over time
- Seasonal trends
- Up/down trending products
- Percentage changes

### 3. Customer Map View
**What**: Geographic visualization of customers

**How to Use**:
1. Navigate to `/sales/customers/map`
2. Filter by status using dropdown
3. Click pins to see customer details
4. Select multiple pins for routing:
   - Click pins to select (blue border)
   - Click "Show Route" button
   - View drive time and route

**Pin Colors**:
- 🟢 Green = Healthy
- 🟡 Yellow = At Risk - Cadence
- 🟠 Orange = At Risk - Revenue
- ⚫ Gray = Dormant
- 🔴 Red = Closed

### 4. YTD Revenue Column
**What**: Year-to-date revenue in customer list

**How to Use**:
1. Go to `/sales/customers`
2. See new "YTD Revenue" column
3. Click header to sort by YTD revenue

**Calculation**: Sum of all non-cancelled orders from Jan 1 to today

### 5. Advanced Search
**What**: Multi-field customer search

**How to Use**:
1. On customers page, click "Advanced Search" button
2. Fill in desired filters:
   - Customer name
   - City
   - Product purchased
   - Order value range
   - Date range
3. Click "Search"
4. Recent searches saved automatically

**Pro Tip**: Use partial names for fuzzy matching

### 6. AI-Powered Insights
**What**: Machine learning insights and predictions

**How to Use**:
1. View any customer detail page
2. Find "AI-Powered Insights" section
3. Review insights by type:
   - 🔵 Patterns (blue)
   - 🟢 Recommendations (green)
   - 🟣 Predictions (purple)
   - 🟠 Risks (orange)

**Insight Examples**:
- "Customer orders every 14 days with high regularity"
- "Revenue increased by 25% over last 3 months"
- "Expected to order within next 5 days"
- "Customer is 12 days overdue for typical order"

**Confidence Scores**: Each insight shows confidence level (0-100%)

## 🔍 API Endpoints

### Product History
```
GET /api/sales/customers/[customerId]/product-history?type=breakdown
GET /api/sales/customers/[customerId]/product-history?type=timeline
```

### Customer Insights
```
GET /api/sales/customers/[customerId]/insights
```

### Customer Map
```
GET /api/sales/customers/map
```

### Updated Customer List
```
GET /api/sales/customers
# Now returns ytdRevenue field for each customer
```

## 🧪 Testing

### Quick Test Checklist
- [ ] Map loads at `/sales/customers/map`
- [ ] Customer pins appear on map
- [ ] Click pin shows popup with revenue
- [ ] Customer list shows YTD Revenue column
- [ ] YTD column is sortable
- [ ] Customer detail page loads new sections
- [ ] Order Deep Dive shows products
- [ ] Product History shows chart
- [ ] AI Insights display (if customer has 3+ orders)
- [ ] CSV export downloads from Order Deep Dive
- [ ] Advanced search modal opens

### Sample Test Scenarios

**Scenario 1: View Customer on Map**
1. Go to `/sales/customers/map`
2. Find a customer pin (look for colored circles)
3. Click the pin
4. Popup should show: name, location, YTD revenue, status
5. Click "View Details" link in popup
6. Should navigate to customer detail page

**Scenario 2: Analyze Product Trends**
1. Go to customer detail page
2. Scroll to "Product History Reports"
3. Change date range to "3m"
4. Chart should update
5. Check trend indicators below chart
6. Look for up/down arrows and percentages

**Scenario 3: Route Planning**
1. Go to `/sales/customers/map`
2. Click 2-3 customer pins to select them
3. Pins should show blue border when selected
4. Click "Show Route" button
5. Route line should appear on map
6. Alert should show drive time

**Scenario 4: Advanced Search**
1. Go to `/sales/customers`
2. Click "Advanced Search" (if button added to page)
3. Enter city name (e.g., "San Francisco")
4. Enter min order value (e.g., "5000")
5. Click "Search"
6. Results should filter

**Scenario 5: AI Insights**
1. Go to customer with 5+ orders
2. Scroll to "AI-Powered Insights"
3. Should see multiple insights
4. Each should have:
   - Icon (pattern/recommendation/prediction/risk)
   - Title and description
   - Confidence bar

## 🐛 Troubleshooting

### Map Not Loading
**Problem**: White screen or error at `/sales/customers/map`

**Solutions**:
1. Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set in `.env`
2. Verify token is valid at https://account.mapbox.com/
3. Check browser console for errors
4. Ensure customers have `latitude` and `longitude` values

### No Insights Showing
**Problem**: "No insights available" message

**Cause**: Customer needs minimum 3 orders

**Solution**:
- Test with a customer that has 5+ orders
- Add more order data for testing
- Check API endpoint returns 200: `/api/sales/customers/[id]/insights`

### YTD Revenue Shows $0
**Problem**: All customers show $0.00 YTD revenue

**Solutions**:
1. Check orders have `deliveredAt` dates in current year
2. Verify orders are not all CANCELLED status
3. Check API response includes `ytdRevenue` field
4. Run query to verify data exists:
```sql
SELECT COUNT(*), SUM(total)
FROM orders
WHERE delivered_at >= '2025-01-01'
AND status != 'CANCELLED';
```

### Charts Not Rendering
**Problem**: Product History shows error or blank

**Solutions**:
1. Check browser console for errors
2. Verify Recharts is installed: `npm list recharts`
3. Check API returns proper data structure
4. Test API endpoint directly: `/api/sales/customers/[id]/product-history?type=timeline`

### CSV Export Not Working
**Problem**: CSV download fails or is empty

**Solutions**:
1. Check browser allows downloads
2. Verify product data exists for customer
3. Check browser console for errors
4. Test with customer that has order history

## 💡 Pro Tips

### Tip 1: Batch Route Planning
Select multiple customers in the same area on the map, then calculate route to plan efficient territory visits.

### Tip 2: Sort by YTD Revenue
Click the YTD Revenue column header to find your top customers by revenue this year.

### Tip 3: Seasonal Insights
Look for seasonal pattern insights in AI section - plan inventory and outreach based on these patterns.

### Tip 4: Export for Analysis
Use CSV export from Order Deep Dive to analyze product affinity in Excel or other tools.

### Tip 5: Risk Monitoring
Filter map by "At Risk" statuses to visualize which customers need attention.

## 📱 Mobile Support

All features are mobile-responsive:
- **Map**: Full screen on mobile, touch-friendly
- **Charts**: Responsive width, readable on small screens
- **Tables**: Horizontal scroll on mobile
- **Modals**: Full width on mobile
- **Insights**: Stack vertically on mobile

## 🔐 Security Notes

- All APIs require authentication via `withSalesSession`
- Customer data filtered by tenant ID
- Sales reps see only their territory (unless "Show All")
- No sensitive data in map popups without click
- CSV exports are client-side only (no server storage)

## 📊 Performance

**Expected Load Times**:
- Customer list: < 2 seconds
- Customer detail: < 3 seconds
- Map view: < 4 seconds (initial load)
- Product history: < 2 seconds
- AI insights: < 3 seconds

**Optimization Tips**:
1. Map loads coordinates in batches
2. Charts render only visible months
3. Insights limited to top 6
4. Database queries use indexes
5. Parallel API calls where possible

## 🎓 Training Resources

### For Sales Reps
1. **Customer Map**: Plan territory visits efficiently
2. **YTD Revenue**: Identify top customers quickly
3. **AI Insights**: Proactive customer outreach
4. **Product Trends**: Upsell and cross-sell opportunities

### For Managers
1. **Map View**: Territory coverage visualization
2. **Risk Monitoring**: At-risk customer identification
3. **Revenue Tracking**: YTD performance monitoring
4. **Pattern Analysis**: Team performance insights

## 🆘 Support

**Documentation**:
- Full docs: `/docs/features/phase2-customer-features.md`
- API reference: See API section above
- Component docs: Inline JSDoc comments

**Common Questions**:
1. **Q**: How often are insights updated?
   **A**: Real-time, calculated on each page load

2. **Q**: Can I export the map?
   **A**: Take screenshot or use browser print

3. **Q**: How far back is product history?
   **A**: All orders in database (typically years)

4. **Q**: What if customer has no coordinates?
   **A**: Won't appear on map, all other features work

---

**Last Updated**: 2025-10-26
**Version**: 1.0.0
**Status**: Production Ready ✅
