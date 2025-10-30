# Auto-Insights Feature for LeorAI Page

## Overview

The Auto-Insights feature automatically runs database queries when users land on the `/sales/leora` page, providing instant, actionable insights from their sales data without requiring any user input.

## Implementation

### Architecture

```
/sales/leora (Page)
    ↓
AutoInsights Component (Client)
    ↓
/api/sales/insights (Server)
    ↓
Prisma Database Queries
```

### Components

#### 1. API Endpoint: `/api/sales/insights`

**Location:** `/src/app/api/sales/insights/route.ts`

**Features:**
- Runs 10 parallel database queries for performance
- Filters data by sales rep (if applicable)
- Returns enriched data with customer names, product details, etc.

**Queries:**
1. Top 10 customers by revenue
2. Order status distribution
3. Customer risk breakdown
4. Top 10 products
5. Recent activity (last 30 days)
6. Sample usage statistics
7. Invoice status summary
8. Shopping cart status
9. Monthly order trend (last 6 months)
10. Customer metrics by sales rep

**Response Format:**
```typescript
{
  summary: {
    totalRevenue: string;
    totalOrders: number;
    topCustomerRevenue: string;
    topCustomerName: string;
  };
  topCustomers: Array<{...}>;
  orderStatuses: Array<{...}>;
  customerRisk: Array<{...}>;
  topProducts: Array<{...}>;
  recentActivity: Array<{...}>;
  samples: {...};
  invoices: Array<{...}>;
  carts: Array<{...}>;
  monthlyTrend: Array<{...}>;
}
```

#### 2. UI Component: `AutoInsights`

**Location:** `/src/app/sales/leora/_components/AutoInsights.tsx`

**Features:**
- Loads insights automatically on component mount
- Beautiful gradient card design with collapsible sections
- Interactive "Quick Action Prompts" that auto-populate LeorAI questions
- Real-time loading states with spinner
- Error handling with user-friendly messages

**UI Sections:**

1. **Summary Card** (Always Visible)
   - Total Revenue
   - Total Orders
   - Top Customer
   - Healthy Customers
   - Quick action prompts (clickable insights)

2. **Detailed Insights** (Collapsible)
   - Top 5 Customers (with revenue and order count)
   - Top 5 Products (with units sold)
   - Monthly Trend (6-month chart data)
   - Sample Performance (conversion rate)

### Smart Question Prompts

The component automatically generates contextual questions based on the data:

- **If customers at risk:** "Tell me about the X at-risk customers"
- **If dormant customers:** "Show me the X dormant customers and how to reactivate them"
- **If revenue up:** "Revenue is up X% this month - what's driving the growth?"
- **Always available:** "Which customers should I prioritize calling this week?"

When clicked, these prompts automatically populate the LeorAI chat input and submit the question.

## User Flow

1. User navigates to `/sales/leora`
2. Page loads with "Loading insights..." message
3. API fetches fresh data from database (< 2 seconds)
4. Insights appear in beautiful gradient card
5. User sees key metrics immediately
6. User can click contextual prompts to dive deeper
7. User can collapse/expand detailed insights

## Performance Considerations

### Database Optimization

- **Parallel Queries:** All 10 queries run simultaneously using `Promise.all()`
- **Indexed Fields:** Queries use indexed fields (tenantId, salesRepId, status)
- **Limited Results:** Top queries limited to 10 items, trends to 6 months
- **Efficient Joins:** Uses Prisma's `include` and `select` for efficient joins

### Frontend Optimization

- **Single API Call:** All data fetched in one request
- **Loading States:** Prevents layout shift with skeleton states
- **Collapsible Sections:** Reduces initial render size
- **Memoization:** Could add `useMemo` for computed values if needed

## Customization Options

### Add New Insights

To add a new insight query:

1. Add query to `Promise.all()` in `/api/sales/insights/route.ts`
2. Add data to response object
3. Update `Insights` type in `AutoInsights.tsx`
4. Add UI section to render the new insight

### Modify Filters

Change sales rep filtering in the API:
```typescript
const salesRepFilter = salesRep ? { salesRepId: salesRep.id } : {};
```

### Customize UI

The component uses Tailwind CSS classes and can be styled by modifying:
- Gradient colors: `from-blue-50 to-indigo-50`
- Border colors: `border-indigo-200`
- Text colors: `text-indigo-600`

## Benefits

### For Sales Reps

1. **Instant Context:** See business health immediately on page load
2. **Actionable Alerts:** Red flags (at-risk customers) highlighted
3. **One-Click Questions:** Click insights to ask LeorAI for details
4. **No Manual Work:** Zero effort required to see key metrics

### For Sales Managers

1. **Territory Overview:** See aggregate metrics across all reps
2. **Performance Tracking:** Monthly trends and comparisons
3. **Customer Health:** Risk status at a glance

### For Business

1. **Data-Driven:** Decisions based on fresh, real data
2. **Engagement:** Users more likely to use LeorAI when they see insights
3. **Efficiency:** Reduces time spent in reports/dashboards

## Future Enhancements

### Potential Improvements

1. **Caching:** Cache insights for 5-10 minutes to reduce DB load
2. **Real-time Updates:** WebSocket or polling for live data
3. **Personalization:** Different insights based on user role
4. **Export:** Download insights as PDF/CSV
5. **Alerts:** Email/SMS when critical thresholds hit
6. **Comparisons:** YoY, MoM comparison metrics
7. **Forecasting:** ML-based revenue predictions
8. **Drill-down:** Click metrics to see customer lists

### Advanced Features

1. **Custom Insights:** Let users configure which metrics they see
2. **Saved Queries:** Bookmark frequently used questions
3. **Scheduled Reports:** Email daily/weekly insights
4. **Mobile Optimization:** Simplified view for mobile devices

## Testing

### Manual Testing

1. Navigate to `/sales/leora`
2. Verify insights load within 2 seconds
3. Check all metrics display correctly
4. Click quick action prompts
5. Verify questions populate and submit
6. Test collapse/expand functionality

### Data Scenarios

Test with:
- Sales rep with customers
- Sales rep with no customers
- Admin user (all data)
- Empty database
- Database connection failure

## Troubleshooting

### Insights Not Loading

1. Check browser console for errors
2. Verify `/api/sales/insights` endpoint responds
3. Check database connection
4. Verify Prisma schema matches database

### Slow Loading

1. Check database query performance
2. Add indexes on frequently queried fields
3. Consider implementing caching
4. Reduce number of top items returned

### Incorrect Data

1. Verify sales rep filtering logic
2. Check date range calculations
3. Ensure tenant isolation is working
4. Review aggregation logic

## Technical Details

### Dependencies

- React (client component)
- Next.js App Router
- Prisma ORM
- TypeScript
- Tailwind CSS

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Responsive design (mobile/tablet/desktop)

## Related Files

- `/src/app/sales/leora/page.tsx` - Main Leora page
- `/src/app/api/sales/insights/route.ts` - Insights API endpoint
- `/src/app/sales/leora/_components/AutoInsights.tsx` - Insights UI component
- `/src/lib/auth/sales.ts` - Sales session authentication
- `/prisma/schema.prisma` - Database schema

## Conclusion

The Auto-Insights feature transforms the LeorAI page from a blank chat interface into an intelligent dashboard that immediately provides value to users. By automatically running relevant queries and presenting them in an actionable format, it increases engagement and helps sales reps make data-driven decisions faster.
