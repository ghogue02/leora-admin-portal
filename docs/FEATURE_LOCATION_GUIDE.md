# 🗺️ Feature Location Guide - Where to Find Everything

**Quick Reference**: Exact URLs and navigation paths for all implemented features

---

## 📍 HOW TO ACCESS EACH FEATURE

### 1. **Business Card Scanner** 📸
**Direct URL**: `https://your-domain.com/sales/customers/scan-card`

**Navigation Path**:
- Not currently in main menu
- **Direct browser access**: Type `/sales/customers/scan-card` in URL bar

**What it does**:
- Take photo of business card with camera or upload image
- Auto-extracts name, email, phone, address
- Creates new customer with extracted data

**File Location**: `web/src/app/sales/customers/scan-card/page.tsx`

---

### 2. **Liquor License Scanner** 📋
**Direct URL**: `https://your-domain.com/sales/customers/scan-license`

**Navigation Path**:
- Not currently in main menu
- **Direct browser access**: Type `/sales/customers/scan-license` in URL bar

**What it does**:
- Take photo of liquor license placard
- Auto-extracts license details
- Creates customer account with compliance tracking

**File Location**: `web/src/app/sales/customers/scan-license/page.tsx`

---

### 3. **Deep Dive Orders** 📊
**Direct URL**: `https://your-domain.com/sales/customers/[CUSTOMER-ID]` (scroll to Order Deep Dive section)

**Navigation Path**:
1. Click **"Customers"** in top menu
2. Click on any customer name in the list
3. Scroll down to **"Order Deep Dive"** section

**What it shows**:
- Every product the customer has ordered
- Last order date for each item
- Total orders per product
- Total revenue per product
- Average ordering frequency in days
- Orders per month
- Sortable by any column
- Export to CSV button

**File Location**: `web/src/app/sales/customers/[customerId]/sections/OrderDeepDive.tsx`

---

### 4. **Customer Balances** 💰
**Status**: ⚠️ Built but currently DISABLED on dashboard

**To Enable**:
Edit file: `web/src/app/sales/dashboard/page.tsx`
Uncomment lines **246-253**:
```tsx
// CURRENTLY COMMENTED OUT (lines 246-253):
{/* <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {isSectionEnabled('customer-balances') && (
    <CustomerBalances onDrilldown={setActiveDrilldown} />
  )}
  {isSectionEnabled('new-customers') && (
    <NewCustomersMetric onDrilldown={setActiveDrilldown} />
  )}
</div> */}
```

**What it shows** (when enabled):
- Real-time past due amounts
- Aging buckets (0-30, 31-60, 61-90, 90+ days)
- Total outstanding balance
- Click-through to customer list

**File Location**: `web/src/app/sales/dashboard/sections/CustomerBalances.tsx`

---

### 5. **Customer Map View** 🗺️
**Direct URL**: `https://your-domain.com/sales/customers/map`

**Navigation Path**:
- Not currently in main menu
- **Direct browser access**: Type `/sales/customers/map` in URL bar

**What it shows**:
- Interactive map with all customers plotted by address
- Color-coded markers by health status:
  - Green = Healthy
  - Yellow = At Risk
  - Red = Dormant
  - Gray = Closed
- Click marker to see customer details
- Cluster groups for dense areas
- Filter by territory and status
- Route planning capabilities

**File Location**: `web/src/app/sales/customers/map/page.tsx`

**Requirements**: Mapbox API key configured

---

### 6. **Product History Reports** 📈
**By Customer** - See all products a specific customer has purchased

**Direct URL**: `https://your-domain.com/sales/customers/[CUSTOMER-ID]`

**Navigation Path**:
1. Click **"Customers"** in top menu
2. Click on any customer name
3. See sections:
   - **"Top Products"** - Best-selling items for this customer
   - **"Order History"** - Complete order timeline
   - **"Order Deep Dive"** - Product-by-product breakdown

**What it shows**:
- Product purchase frequency
- Last order date per product
- Revenue per product
- Order patterns and trends
- Recommended reorder dates

**File Locations**:
- `web/src/app/sales/customers/[customerId]/sections/ProductHistoryReports.tsx`
- `web/src/app/sales/customers/[customerId]/sections/TopProducts.tsx`
- `web/src/app/sales/customers/[customerId]/sections/OrderHistory.tsx`

---

### 7. **Item History Reports** 🍷
**By Product** - See which customers buy a specific product

**Navigation Path**:
1. Click **"Catalog"** in top menu
2. Click on any product
3. View **"Top Customers"** section showing who buys this product

**Alternative via Dashboard**:
1. Click **"Dashboard"** in top menu
2. Scroll to **"Top Products by Revenue"**
3. Click **"Click for details →"** on any product

**What it shows**:
- Which customers purchase this product
- Purchase frequency per customer
- Revenue contribution per customer
- Total units sold to each customer

**File Locations**:
- Catalog product detail page
- Dashboard Top Products drilldown
- `/api/sales/insights` endpoints

---

### 8. **AI Product Recommendations** 🤖
**Multiple Locations** - Context-aware recommendations throughout the app

**Where to find it**:

**A. LeorAI Chat**
- Click **"LeorAI"** in top menu
- Ask: "What products should I recommend to [customer name]?"
- Ask: "What should I suggest based on their purchase history?"

**B. Customer Detail Page**
- Go to any customer: `/sales/customers/[CUSTOMER-ID]`
- See **"AI Recommendations"** section
- Shows products based on:
  - Purchase history
  - Similar customers
  - Frequently bought together

**C. Order Entry / Cart**
- While building an order
- See "Recommended for this customer" suggestions
- Smart upsell recommendations

**D. Call Planning**
- In **"Call Plan"** section
- AI suggests products to pitch per customer

**What it recommends**:
- Products based on purchase history
- Items frequently bought together
- What similar customers buy
- Seasonal recommendations
- New products matching preferences

**File Locations**:
- `web/src/lib/ai-recommendations.ts`
- `web/src/components/ai/ProductRecommendations.tsx`
- `web/src/app/api/ai/recommendations/route.ts`

---

## 🚀 QUICK NAVIGATION TIPS

### Features in Main Menu:
- ✅ **Dashboard** → Revenue metrics, top products
- ✅ **Customers** → Customer list, filters, search
- ✅ **LeorAI** → AI chat for insights and recommendations
- ✅ **Catalog** → Product browsing, item history
- ✅ **Orders** → Order management
- ✅ **Samples** → Sample tracking

### Features NOT in Main Menu (Use Direct URLs):
- 📸 **Business Card Scanner**: `/sales/customers/scan-card`
- 📋 **License Scanner**: `/sales/customers/scan-license`
- 🗺️ **Customer Map**: `/sales/customers/map`

### Features in Sections:
- 💰 **Customer Balances**: Dashboard (currently disabled - see above)
- 📊 **Order Deep Dive**: Customer detail pages
- 📈 **Product History**: Customer detail pages
- 🍷 **Item History**: Catalog product pages

---

## 📝 RECOMMENDED MENU ADDITIONS

To make these features easier to access, consider adding:

**Under "Customers" dropdown**:
- 📸 Scan Business Card
- 📋 Scan License
- 🗺️ View Map

**Code to add dropdown** (in `SalesNav.tsx`):
```tsx
const navigation = [
  { label: "LeorAI", href: "/sales/leora" },
  { label: "Dashboard", href: "/sales/dashboard" },
  {
    label: "Customers",
    href: "/sales/customers",
    submenu: [
      { label: "Customer List", href: "/sales/customers" },
      { label: "Customer Map", href: "/sales/customers/map" },
      { label: "Scan Business Card", href: "/sales/customers/scan-card" },
      { label: "Scan License", href: "/sales/customers/scan-license" },
    ]
  },
  // ... rest of menu
];
```

---

## 🔗 FULL URL REFERENCE

Base URL: `https://your-domain.com`

| Feature | URL Path |
|---------|----------|
| Business Card Scanner | `/sales/customers/scan-card` |
| License Scanner | `/sales/customers/scan-license` |
| Customer List | `/sales/customers` |
| Customer Detail | `/sales/customers/{id}` |
| Customer Map | `/sales/customers/map` |
| Dashboard | `/sales/dashboard` |
| LeorAI Chat | `/sales/leora` |
| Catalog | `/sales/catalog` |
| Product Detail | `/sales/catalog/{productId}` |

---

## 💡 POWER USER TIPS

1. **Bookmark Scanners**: Add `/sales/customers/scan-card` and `/sales/customers/scan-license` to browser bookmarks

2. **Map View**: Use `/sales/customers/map` for route planning before field visits

3. **LeorAI Shortcuts**: Type these questions in LeorAI:
   - "Who should I call today?"
   - "Which customers are at risk?"
   - "What products should I recommend to [customer]?"
   - "Show me customers who haven't ordered in 30 days"

4. **Customer Deep Dive**: Use the Order Deep Dive table's sort feature to find:
   - Products ordered most frequently
   - Highest revenue products
   - Products not ordered in longest time (reorder opportunity)

5. **Quick Balance Check**: Once Customer Balances is enabled, use it to prioritize collection calls

---

Would you like me to:
1. Add navigation menu items for the scanner features?
2. Enable the Customer Balances widget on the dashboard?
3. Add a "Tools" menu for quick access to Map, Scanners, etc.?
