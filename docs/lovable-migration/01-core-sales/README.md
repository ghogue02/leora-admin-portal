# Package 1: Core Sales Features

This package contains the essential sales and customer portal components for migrating to Lovable.

## Files Included

1. **sales-dashboard.tsx** - Sales rep dashboard with metrics, customer health, and tasks
2. **customer-list.tsx** - Customer management with search, filtering, and risk status
3. **product-catalog.tsx** - Product browsing with cart functionality
4. **order-list.tsx** - Order history and invoice management

## Setup Instructions

### 1. Install Dependencies

```bash
npm install lucide-react date-fns
```

### 2. Configure Database

You need the following tables (see Package 02 for full schema):
- `tenants`
- `users` (sales reps)
- `customers`
- `products` & `skus`
- `orders` & `order_lines`
- `invoices`
- `cart` & `cart_items`

### 3. Create API Routes

Create these Next.js API routes (see Package 02 for implementation):

```
/api/sales/dashboard GET
/api/sales/customers GET
/api/portal/catalog GET
/api/portal/orders GET
/api/portal/cart/items POST
```

### 4. Set Up Authentication

Configure Supabase authentication (see Package 04 for details):

```typescript
// Required environment variables
DATABASE_URL=your_supabase_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
```

## Integration with Lovable

### Step 1: Create Pages

In Lovable, create these routes:

- `/sales/dashboard` → Use `sales-dashboard.tsx`
- `/sales/customers` → Use `customer-list.tsx`
- `/portal/catalog` → Use `product-catalog.tsx`
- `/portal/orders` → Use `order-list.tsx`

### Step 2: Add Routing

```typescript
// app/sales/dashboard/page.tsx
import SalesDashboard from '@/components/sales-dashboard';
export default SalesDashboard;
```

### Step 3: Configure Tailwind

These components use standard Tailwind classes. Ensure your `tailwind.config.js` includes:

```javascript
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ... rest of config
}
```

## Key Features

### Sales Dashboard
- ✅ Weekly revenue tracking with quota progress
- ✅ Customer health metrics (healthy, at-risk, dormant)
- ✅ Customers due to order list
- ✅ Pending tasks view
- ✅ Real-time metric updates

### Customer List
- ✅ Search by name/email
- ✅ Filter by risk status (HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT)
- ✅ Sortable columns
- ✅ Revenue and order count display
- ✅ Direct link to customer details

### Product Catalog
- ✅ Product grid with images
- ✅ Search functionality
- ✅ Real-time inventory display
- ✅ Add to cart with quantity tracking
- ✅ Category and brand filtering

### Order List
- ✅ Complete order history
- ✅ Status badges (Draft, Submitted, Fulfilled, Cancelled)
- ✅ Invoice download links
- ✅ Order details view
- ✅ Summary statistics (total orders, fulfilled, total spent)

## Customization

### Styling
All components use Tailwind utility classes. Customize colors by updating class names:

```tsx
// Change primary color from blue to purple
className="bg-blue-600 hover:bg-blue-700"
// becomes
className="bg-purple-600 hover:bg-purple-700"
```

### Data Fetching
All components use standard `fetch()` calls. You can easily swap to:
- Supabase client
- SWR for caching
- React Query for advanced state management

Example:
```tsx
// Current
const response = await fetch("/api/sales/dashboard");

// With Supabase
const { data } = await supabase.from('dashboard_view').select('*');
```

## Dependencies

```json
{
  "dependencies": {
    "lucide-react": "^0.400.0",
    "date-fns": "^3.0.0",
    "react": "^18.0.0",
    "next": "^14.0.0"
  }
}
```

## Environment Variables

```env
# Required for all components
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional for enhanced features
DEFAULT_TENANT_SLUG=well-crafted
PORTAL_SESSION_MAX_AGE=86400
```

## Next Steps

1. ✅ Set up Package 02 (Database & API routes)
2. ✅ Implement Package 04 (Authentication)
3. ✅ Deploy to Lovable
4. ⏭️ Test with sample data
5. ⏭️ Customize styling to match your brand

## Support

- Original codebase: `/src/app/sales/` and `/src/app/portal/`
- API routes: `/src/app/api/`
- Database schema: `/prisma/schema.prisma`
