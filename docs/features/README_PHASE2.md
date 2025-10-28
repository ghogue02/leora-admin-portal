# Phase 2 Customer Features - README

## 🚀 Quick Links

### 📚 Documentation
- **[Quick Start Guide](QUICK_START_GUIDE.md)** - Get started in 5 minutes
- **[Full Documentation](phase2-customer-features.md)** - Complete feature reference
- **[Implementation Summary](PHASE2_SUMMARY.md)** - Executive overview
- **[File Manifest](PHASE2_FILE_MANIFEST.md)** - All files and paths

### 🎯 Features
1. [Order Deep Dive](#order-deep-dive) - Product-level breakdown
2. [Product History Reports](#product-history-reports) - Visual timeline
3. [Customer Map View](#customer-map-view) - Geographic visualization
4. [YTD Revenue Column](#ytd-revenue-column) - Customer list enhancement
5. [Advanced Search](#advanced-search) - Multi-field search
6. [AI Insights](#ai-insights) - Intelligent analysis

---

## Order Deep Dive

**Component**: `OrderDeepDive.tsx`

**Location**: `/sales/customers/[customerId]` (detail page)

**What it does**: Shows detailed product-level breakdown of customer orders

**Key Features**:
- Products ordered by customer
- Last order date per product
- Total orders and revenue
- Average frequency (days)
- Orders per month
- Sortable columns
- CSV export

**API**: `GET /api/sales/customers/[customerId]/product-history?type=breakdown`

**File**: `/Users/greghogue/Leora2/web/src/app/sales/customers/[customerId]/sections/OrderDeepDive.tsx`

---

## Product History Reports

**Component**: `ProductHistoryReports.tsx`

**Location**: `/sales/customers/[customerId]` (detail page)

**What it does**: Displays visual timeline of product purchases with trends

**Key Features**:
- 12-month purchase timeline
- Interactive line charts
- Date range selector
- Trend indicators (up/down)
- Percentage changes
- Seasonal patterns
- PDF export (placeholder)

**API**: `GET /api/sales/customers/[customerId]/product-history?type=timeline`

**File**: `/Users/greghogue/Leora2/web/src/app/sales/customers/[customerId]/sections/ProductHistoryReports.tsx`

---

## Customer Map View

**Component**: `CustomerMapView`

**Location**: `/sales/customers/map`

**What it does**: Geographic visualization of all customers

**Key Features**:
- Mapbox GL integration
- Color-coded pins by health status
- Customer info popups
- Filter by risk status
- Multi-customer selection
- Route calculation
- Drive time estimation

**API**: `GET /api/sales/customers/map`

**File**: `/Users/greghogue/Leora2/web/src/app/sales/customers/map/page.tsx`

**Requirements**:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
```

---

## YTD Revenue Column

**Component**: `CustomerTable.tsx` (modified)

**Location**: `/sales/customers` (list page)

**What it does**: Adds Year-to-Date revenue column to customer list

**Key Features**:
- YTD revenue display
- Sortable column
- Currency formatting
- Updated API response

**File**: `/Users/greghogue/Leora2/web/src/app/sales/customers/sections/CustomerTable.tsx`

---

## Advanced Search

**Component**: `AdvancedSearchModal.tsx`

**Location**: Ready for integration

**What it does**: Multi-field customer search with history

**Key Features**:
- Search by name, city, product
- Order value range
- Date range filtering
- Search history
- Recent searches
- Fuzzy matching

**File**: `/Users/greghogue/Leora2/web/src/app/sales/customers/components/AdvancedSearchModal.tsx`

**Usage**:
```tsx
import AdvancedSearchModal from './components/AdvancedSearchModal';

<AdvancedSearchModal
  isOpen={showSearch}
  onClose={() => setShowSearch(false)}
  onSearch={(filters) => handleSearch(filters)}
/>
```

---

## AI Insights

**Component**: `CustomerInsights.tsx`

**Location**: `/sales/customers/[customerId]` (detail page)

**What it does**: AI-powered customer analysis and predictions

**Key Features**:
- Pattern analysis
- Recommendations
- Predictions
- Risk alerts
- Confidence scores

**Insight Types**:
- 🔵 **Patterns**: Ordering trends, seasonal behavior
- 🟢 **Recommendations**: Cross-sell, upsell opportunities
- 🟣 **Predictions**: Next order timing
- 🟠 **Risks**: Overdue orders, revenue decline

**API**: `GET /api/sales/customers/[customerId]/insights`

**File**: `/Users/greghogue/Leora2/web/src/app/sales/customers/[customerId]/sections/CustomerInsights.tsx`

**Algorithm**:
- Analyzes 50 most recent orders
- Pattern detection (interval consistency)
- Trend analysis (3m vs 6m)
- Seasonal pattern detection
- Product affinity analysis

---

## 🛠️ Setup Instructions

### 1. Environment Variables
Add to `.env`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

Get token: https://account.mapbox.com/

### 2. Dependencies
Already installed (no action needed):
- mapbox-gl ^3.16.0
- recharts ^3.3.0
- date-fns ^4.1.0
- lucide-react ^0.546.0

### 3. Database
Ensure customers have coordinates:
```sql
UPDATE customers
SET latitude = [value], longitude = [value]
WHERE latitude IS NULL;
```

### 4. Test
1. Visit `/sales/customers/map`
2. Check YTD Revenue column in customer list
3. Open customer detail page
4. Verify new sections appear

---

## 📁 File Locations

### Components
```
/Users/greghogue/Leora2/web/src/app/sales/customers/
├── [customerId]/
│   └── sections/
│       ├── OrderDeepDive.tsx
│       ├── ProductHistoryReports.tsx
│       └── CustomerInsights.tsx
├── components/
│   └── AdvancedSearchModal.tsx
└── map/
    └── page.tsx
```

### API Routes
```
/Users/greghogue/Leora2/web/src/app/api/sales/customers/
├── [customerId]/
│   ├── product-history/
│   │   └── route.ts
│   └── insights/
│       └── route.ts
└── map/
    └── route.ts
```

### Documentation
```
/Users/greghogue/Leora2/web/docs/features/
├── phase2-customer-features.md
├── PHASE2_SUMMARY.md
├── QUICK_START_GUIDE.md
├── PHASE2_FILE_MANIFEST.md
└── README_PHASE2.md (this file)
```

---

## 🧪 Testing

### Quick Test
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to pages
# - http://localhost:3000/sales/customers
# - http://localhost:3000/sales/customers/map
# - http://localhost:3000/sales/customers/[any-id]

# 3. Check features
# - YTD Revenue column visible
# - Map loads with pins
# - Customer detail shows new sections
# - Charts render
# - Insights display
# - CSV export works
```

### Test Checklist
- [ ] Map view loads at `/sales/customers/map`
- [ ] Customer pins appear with correct colors
- [ ] Pin popups show customer info
- [ ] Route calculation works (select 2+ pins)
- [ ] YTD Revenue column in customer list
- [ ] Column is sortable
- [ ] Customer detail shows Order Deep Dive
- [ ] Product History chart renders
- [ ] AI Insights display (for customers with 3+ orders)
- [ ] CSV export downloads
- [ ] All features mobile responsive

---

## 🐛 Troubleshooting

### Map doesn't load
**Check**:
- `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Token is valid
- Customers have latitude/longitude
- Browser console for errors

### No insights showing
**Check**:
- Customer has 3+ orders
- API returns 200 status
- Orders have proper dates
- Browser console for errors

### YTD Revenue shows $0
**Check**:
- Orders exist in current year
- Orders are not CANCELLED
- Orders have deliveredAt dates
- API includes ytdRevenue field

### Charts not rendering
**Check**:
- Recharts installed
- API returns proper data format
- Browser supports required features
- No console errors

---

## 📊 Performance

**Expected Load Times**:
- Customer list: < 2s
- Customer detail: < 3s
- Map view: < 4s
- Product history: < 2s
- AI insights: < 3s

**Optimizations**:
- Parallel database queries
- Database aggregation
- Client-side caching
- Lazy loading
- Efficient rendering

---

## 🔒 Security

- All APIs require authentication
- Data filtered by tenant ID
- Sales rep scoping enforced
- No cross-tenant data access
- CSV exports client-side only

---

## 🎯 Next Steps

### Immediate
1. Set Mapbox token
2. Test all features
3. Verify data displays correctly
4. Run test checklist

### Future Enhancements
1. Replace AI with ML models
2. Add real-time updates
3. Implement full PDF export
4. Add batch operations
5. Territory optimization
6. Advanced routing

---

## 📞 Support

**Documentation**:
- [Quick Start Guide](QUICK_START_GUIDE.md)
- [Full Documentation](phase2-customer-features.md)
- [File Manifest](PHASE2_FILE_MANIFEST.md)

**Common Issues**:
See [Quick Start Guide - Troubleshooting](QUICK_START_GUIDE.md#-troubleshooting)

---

## ✅ Status

**Phase**: 2 of 4
**Status**: ✅ Complete
**Date**: 2025-10-26
**Files**: 11 total (9 new + 2 modified)
**Lines**: ~3,250 (code + docs)

**Next Phase**: Phase 3 - Order and Sample Management

---

**Quick Navigation**:
- [⬆️ Top](#phase-2-customer-features---readme)
- [📚 Docs](#-quick-links)
- [🎯 Features](#-features)
- [🛠️ Setup](#️-setup-instructions)
- [🧪 Testing](#-testing)
