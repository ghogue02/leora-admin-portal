# Sales Funnel System - Quick Reference Card

## 🚀 Quick Start

### URLs
- **Lead Management**: `/sales/leads`
- **Sales Funnel**: `/sales/funnel`

### First-Time Setup
```bash
# 1. Run migration
mysql -u user -p database < migrations/003_create_sales_tables.sql

# 2. Add navigation links
<Link href="/sales/leads">Leads</Link>
<Link href="/sales/funnel">Funnel</Link>

# 3. Create first lead via UI or API
```

---

## 📋 Common Tasks

### Create Lead
```typescript
POST /api/sales/leads
{
  "companyName": "Acme Corp",
  "contactName": "John Doe",
  "email": "john@acme.com",
  "leadSource": "website",
  "interestLevel": "hot",
  "estimatedValue": 50000
}
```

### Update Lead Stage
```typescript
PATCH /api/sales/leads/:id/stage
{
  "stage": "proposal",
  "notes": "Sent enterprise proposal"
}
```

### Get Pipeline Metrics
```typescript
GET /api/sales/funnel/metrics?assignedRepId=uuid&startDate=2025-01-01
```

---

## 🎨 Funnel Stages

| Stage | Description | Weight |
|-------|-------------|--------|
| **Lead** | Initial contact | 10% |
| **Qualified** | Meets criteria | 25% |
| **Proposal** | Quote sent | 50% |
| **Negotiation** | Active discussion | 75% |
| **Closed Won** | Deal secured | 100% |
| **Closed Lost** | Deal lost | 0% |

---

## 📊 Key Metrics

### Conversion Rates
- **Lead → Qualified**: % of leads that qualify
- **Qualified → Proposal**: % that get proposals
- **Proposal → Won**: % that close
- **Overall Win Rate**: Won / Total Closed

### Time Metrics
- **Days in Stage**: Current time in stage
- **Avg Time per Stage**: Historical average
- **Days to Close**: Lead creation to close

### Value Metrics
- **Total Pipeline**: Sum of all values
- **Weighted Forecast**: Σ(value × stage weight)
- **Avg Deal Size**: Mean estimated value

---

## 🔧 Configuration

### Customize Stage Weights
```typescript
// In Lead.ts
const stageWeights = {
  lead: 0.1,       // Adjust as needed
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75
};
```

### Add Lead Sources
```typescript
// In Lead.ts
export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  // Add more...
}
```

### Customize Products
```tsx
// In LeadForm
products={['Product A', 'Product B', 'Service X']}
```

---

## 🐛 Troubleshooting

### Common Issues

**Leads not showing**
- Check tenant ID in session
- Verify database connection
- Clear filters

**Drag-drop not working**
- Enable JavaScript
- Check browser compatibility
- Clear cache

**Metrics not calculating**
- Ensure leads exist
- Check date filters
- Review console errors

**Stage history missing**
- Verify foreign keys
- Check cascade deletes
- Review migration

---

## 💾 Database Quick Ref

### Tables
- `leads` - Main lead data
- `lead_stage_history` - Audit trail
- `sales_reps` - Rep information
- `products` - Product catalog

### Important Indexes
- `idx_tenant_id` - Tenant isolation
- `idx_current_stage` - Stage filtering
- `idx_lead_id` - History lookups

### Quick Queries
```sql
-- Total pipeline
SELECT SUM(estimated_value) FROM leads WHERE tenant_id = ?;

-- Win rate
SELECT
  (SELECT COUNT(*) FROM leads WHERE current_stage = 'closed_won') /
  (SELECT COUNT(*) FROM leads WHERE current_stage IN ('closed_won', 'closed_lost'))
  * 100 AS win_rate;

-- Aging deals
SELECT * FROM leads
WHERE current_stage = 'proposal'
  AND DATEDIFF(NOW(), updated_at) > 30;
```

---

## 🔐 Security Checklist

- [ ] Session auth enabled
- [ ] Tenant isolation verified
- [ ] Input validation on
- [ ] SQL injection protected
- [ ] HTTPS in production
- [ ] Env vars secured
- [ ] Error messages safe

---

## 📈 Performance Tips

### For >1000 Leads
1. **Add Pagination**
   ```typescript
   ?page=1&limit=50
   ```

2. **Add Caching**
   ```typescript
   redis.setex('metrics', 300, JSON.stringify(data));
   ```

3. **Add Indexes**
   ```sql
   CREATE INDEX idx_leads_created_stage
   ON leads(created_at, current_stage);
   ```

---

## 📱 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sales/leads` | List leads |
| POST | `/api/sales/leads` | Create lead |
| GET | `/api/sales/leads/:id` | Get lead |
| PATCH | `/api/sales/leads/:id` | Update lead |
| DELETE | `/api/sales/leads/:id` | Delete lead |
| PATCH | `/api/sales/leads/:id/stage` | Update stage |
| GET | `/api/sales/leads/:id/history` | Get history |
| GET | `/api/sales/funnel/metrics` | Get metrics |
| GET | `/api/sales/reps` | List reps |
| GET | `/api/sales/products` | List products |

---

## 🎯 Best Practices

### Lead Management
- ✅ Capture lead source for attribution
- ✅ Use interest level for prioritization
- ✅ Estimate value for forecasting
- ✅ Assign to rep quickly
- ✅ Add notes for context

### Stage Management
- ✅ Move leads promptly
- ✅ Add transition notes
- ✅ Capture win/loss reasons
- ✅ Review aging deals weekly
- ✅ Track conversion rates

### Pipeline Health
- ✅ Monitor conversion rates
- ✅ Identify bottlenecks
- ✅ Track time in stage
- ✅ Set days-to-close goals
- ✅ Review forecast accuracy

---

## 🎨 UI Components

### LeadForm
```tsx
<LeadForm
  initialData={lead}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  salesReps={reps}
  products={products}
/>
```

### LeadCard
```tsx
<LeadCard
  lead={lead}
  onClick={handleClick}
  draggable={true}
  onDragStart={handleDragStart}
/>
```

### FunnelBoard
```tsx
<FunnelBoard
  leads={leads}
  onLeadClick={handleClick}
  onStageChange={handleStageChange}
/>
```

### PipelineMetrics
```tsx
<PipelineMetrics metrics={metrics} />
```

---

## 🔄 Common Workflows

### 1. New Lead Entry
```
/sales/leads → Add New Lead → Fill Form → Submit
→ Lead created in "Lead" stage
```

### 2. Move Through Funnel
```
/sales/funnel → Drag card to new stage
→ Stage updated + history recorded
```

### 3. Convert to Customer
```
/sales/leads → Click lead → Edit → Convert to Customer
→ Moves to "Closed Won" + links to customer
```

### 4. View Performance
```
/sales/funnel → View metrics dashboard
→ Filter by rep/date → Export if needed
```

---

## 📚 Documentation

- **User Guide**: `SALES_FUNNEL_DOCUMENTATION.md`
- **API Ref**: `SALES_API_REFERENCE.md`
- **Install**: `SALES_INSTALLATION_GUIDE.md`
- **Implementation**: `PHASE3_SALES_FUNNEL_README.md`
- **Quick Ref**: This file

---

## 🆘 Support

1. Check this quick reference
2. Review main documentation
3. Check API reference
4. Review console errors
5. Contact dev team

---

## 📊 Sample Data

### Test Lead
```json
{
  "companyName": "Test Corp",
  "contactName": "Jane Doe",
  "email": "jane@test.com",
  "phone": "+1-555-0100",
  "leadSource": "website",
  "interestLevel": "warm",
  "estimatedValue": 25000,
  "productsInterested": ["Product A"],
  "notes": "Interested in Q2 implementation"
}
```

---

## 🎓 Learn More

- Full docs in `/web/docs/`
- Code in `/web/src/`
- Migration in `/web/migrations/`
- Examples in documentation

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-10-26
**Print-Friendly**: Yes ✅
