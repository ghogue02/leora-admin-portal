# Sales Funnel System - Installation Guide

## Quick Start

Follow these steps to install and configure the Sales Funnel & Lead Management System.

---

## Prerequisites

- Node.js 18+ installed
- Database (MySQL/PostgreSQL) configured
- Next.js application running
- Authentication system in place

---

## Installation Steps

### 1. Database Setup

Run the migration to create required tables:

```bash
# Navigate to web directory
cd /Users/greghogue/Leora2/web

# Run migration
mysql -u [username] -p [database_name] < migrations/003_create_sales_tables.sql

# OR for PostgreSQL
psql -U [username] -d [database_name] -f migrations/003_create_sales_tables.sql
```

This creates:
- `leads` table
- `lead_stage_history` table
- `sales_reps` table
- `products` table

### 2. Verify Database Connection

Ensure your `/web/src/lib/db.ts` is properly configured:

```typescript
import { createConnection } from 'mysql2/promise';

export const db = await createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

### 3. Install Dependencies

No additional packages needed! The system uses:
- Next.js (already installed)
- React (already installed)
- TypeScript (already installed)
- Native HTML5 drag-and-drop (no library needed)

### 4. Environment Variables

Ensure these are set in your `.env` file:

```bash
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### 5. Add Navigation Links

Update your main navigation to include sales pages:

```tsx
// In your layout or navigation component
<nav>
  <Link href="/sales/leads">Lead Management</Link>
  <Link href="/sales/funnel">Sales Funnel</Link>
</nav>
```

---

## Initial Data Setup

### Create Sales Reps

```sql
INSERT INTO sales_reps (id, tenant_id, user_id, name, email, territory, quota_monthly, quota_annual, commission_rate, active)
VALUES
  (UUID(), 'your-tenant-id', 'user-id-1', 'Jane Smith', 'jane@company.com', 'Northeast', 50000, 600000, 5.0, TRUE),
  (UUID(), 'your-tenant-id', 'user-id-2', 'John Doe', 'john@company.com', 'West', 60000, 720000, 5.0, TRUE);
```

### Create Products

```sql
INSERT INTO products (id, tenant_id, name, description, price, category, active)
VALUES
  (UUID(), 'your-tenant-id', 'Product A', 'Enterprise solution', 10000.00, 'Software', TRUE),
  (UUID(), 'your-tenant-id', 'Product B', 'Standard package', 5000.00, 'Software', TRUE),
  (UUID(), 'your-tenant-id', 'Service X', 'Consulting services', 15000.00, 'Services', TRUE);
```

---

## Verify Installation

### 1. Check Database Tables

```sql
SHOW TABLES LIKE '%lead%';
-- Should show: leads, lead_stage_history

SELECT COUNT(*) FROM leads;
-- Should return 0 (initially)
```

### 2. Test API Endpoints

```bash
# List leads (should return empty array)
curl http://localhost:3000/api/sales/leads

# Get metrics (should return initial metrics)
curl http://localhost:3000/api/sales/funnel/metrics
```

### 3. Access Pages

Navigate to:
- http://localhost:3000/sales/leads - Lead management
- http://localhost:3000/sales/funnel - Sales funnel

You should see the interfaces load without errors.

---

## Create Your First Lead

### Via UI
1. Go to `/sales/leads`
2. Click "Add New Lead"
3. Fill in:
   - Company: "Acme Corp"
   - Contact: "John Doe"
   - Email: "john@acme.com"
   - Source: "Website"
   - Interest: "Hot"
   - Value: 50000
4. Submit

### Via API

```bash
curl -X POST http://localhost:3000/api/sales/leads \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "contactName": "John Doe",
    "email": "john@acme.com",
    "leadSource": "website",
    "interestLevel": "hot",
    "estimatedValue": 50000
  }'
```

---

## Configuration Options

### Customize Products

Update the products list in `LeadForm.tsx`:

```tsx
<LeadForm
  products={['Your Product 1', 'Your Product 2', 'Service A']}
  ...
/>
```

Or fetch dynamically:

```tsx
const [products, setProducts] = useState([]);

useEffect(() => {
  fetch('/api/sales/products')
    .then(res => res.json())
    .then(data => setProducts(data.map(p => p.name)));
}, []);
```

### Customize Stage Weights

Modify forecasting weights in `Lead.ts`:

```typescript
const stageWeights: Record<FunnelStage, number> = {
  [FunnelStage.LEAD]: 0.1,        // 10% - Adjust as needed
  [FunnelStage.QUALIFIED]: 0.25,  // 25%
  [FunnelStage.PROPOSAL]: 0.5,    // 50%
  [FunnelStage.NEGOTIATION]: 0.75, // 75%
  [FunnelStage.CLOSED_WON]: 1.0,
  [FunnelStage.CLOSED_LOST]: 0,
};
```

### Customize Lead Sources

Add more sources in `Lead.ts`:

```typescript
export enum LeadSource {
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  EVENT = 'event',
  WEBSITE = 'website',
  SOCIAL_MEDIA = 'social_media',
  PARTNER = 'partner',
  EMAIL_CAMPAIGN = 'email_campaign',  // Add new
  TRADE_SHOW = 'trade_show',          // Add new
  OTHER = 'other'
}
```

---

## Troubleshooting

### Issue: "Failed to fetch leads"

**Solution**:
1. Check database connection
2. Verify session authentication
3. Check console for errors
4. Verify tenant ID in session

### Issue: Drag-and-drop not working

**Solution**:
1. Ensure JavaScript is enabled
2. Check browser compatibility (Chrome, Firefox, Safari, Edge)
3. Clear browser cache
4. Check console for errors

### Issue: Metrics not calculating

**Solution**:
1. Ensure leads exist in database
2. Check date range filters
3. Verify SQL aggregate functions
4. Review console errors

### Issue: Stage history missing

**Solution**:
1. Verify foreign key constraints
2. Check cascade delete settings
3. Ensure stage transitions trigger history creation
4. Review migration script

---

## Performance Tuning

### For Large Datasets (>1000 leads)

#### Add Pagination

```typescript
// In leads API route
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '50');
const offset = (page - 1) * limit;

query += ' LIMIT ? OFFSET ?';
params.push(limit, offset);
```

#### Add Caching

```typescript
import { Redis } from 'ioredis';
const redis = new Redis();

// Cache metrics for 5 minutes
const cacheKey = `metrics:${tenantId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const metrics = await calculateMetrics();
await redis.setex(cacheKey, 300, JSON.stringify(metrics));
```

#### Add Indexes

```sql
CREATE INDEX idx_leads_created_stage ON leads(created_at, current_stage);
CREATE INDEX idx_history_lead_entered ON lead_stage_history(lead_id, entered_at);
```

---

## Security Checklist

- [ ] Session authentication enabled
- [ ] Tenant isolation verified
- [ ] Input validation on all forms
- [ ] SQL injection protection (parameterized queries)
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database credentials not in code
- [ ] Error messages don't leak sensitive info

---

## Backup Strategy

### Daily Backups

```bash
# MySQL
mysqldump -u [user] -p [database] leads lead_stage_history > backup_$(date +%Y%m%d).sql

# PostgreSQL
pg_dump -U [user] -t leads -t lead_stage_history [database] > backup_$(date +%Y%m%d).sql
```

### Recovery

```bash
# MySQL
mysql -u [user] -p [database] < backup_20250126.sql

# PostgreSQL
psql -U [user] [database] < backup_20250126.sql
```

---

## Monitoring

### Key Metrics to Monitor

1. **Application Metrics**:
   - API response times
   - Error rates
   - Active sessions

2. **Database Metrics**:
   - Query performance
   - Connection pool usage
   - Table sizes

3. **Business Metrics**:
   - Lead creation rate
   - Conversion rates
   - Average deal size
   - Days to close

### Set Up Alerts

```typescript
// Example: Alert on low conversion rate
if (metrics.conversionRates.overallWinRate < 20) {
  await sendAlert('Low win rate detected');
}

// Alert on aging deals
const agingDeals = leads.filter(l =>
  daysInStage(l) > 30 && l.currentStage === 'proposal'
);
if (agingDeals.length > 5) {
  await sendAlert('Multiple aging proposals');
}
```

---

## Maintenance

### Weekly Tasks
- Review error logs
- Check database performance
- Monitor disk space
- Review metrics anomalies

### Monthly Tasks
- Analyze conversion trends
- Review and archive old closed leads
- Update stage weights based on actual data
- Performance optimization review

### Quarterly Tasks
- User feedback review
- Feature planning
- Database optimization
- Security audit

---

## Upgrade Path

When new versions are released:

1. **Backup Database**
2. **Review Changelog**
3. **Test in Staging**
4. **Run Migrations**
5. **Deploy to Production**
6. **Verify Functionality**
7. **Monitor for Issues**

---

## Support

For issues:
1. Check this installation guide
2. Review main documentation
3. Check API reference
4. Review console errors
5. Contact development team

---

## Next Steps

After installation:

1. **Import Existing Leads** (if migrating)
2. **Train Sales Team** on new system
3. **Configure Custom Fields** as needed
4. **Set Up Integrations** (email, calendar)
5. **Establish Workflows** and processes
6. **Monitor Usage** and gather feedback

---

## Quick Reference

### File Locations
- Models: `/web/src/lib/models/Lead.ts`
- API: `/web/src/app/api/sales/`
- Components: `/web/src/components/sales/`
- Pages: `/web/src/app/sales/`
- Docs: `/web/docs/`
- Migration: `/web/migrations/003_create_sales_tables.sql`

### URLs
- Lead Management: `/sales/leads`
- Sales Funnel: `/sales/funnel`

### API Endpoints
- GET `/api/sales/leads` - List leads
- POST `/api/sales/leads` - Create lead
- PATCH `/api/sales/leads/:id/stage` - Update stage
- GET `/api/sales/funnel/metrics` - Get metrics

---

**Installation Guide Version**: 1.0.0
**Last Updated**: 2025-10-26
**Status**: Production Ready
