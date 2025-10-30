# AccountHealthSnapshot Generation Report

**Generated:** 2025-10-18  
**Tenant ID:** 58b8126a-2d2f-4f55-bc98-5b6784800bed  
**Database:** PostgreSQL (Supabase)

---

## Summary

Successfully generated **4,862 AccountHealthSnapshot records** for all customers in the database.

### Key Statistics

| Metric | Count |
|--------|-------|
| Total Customers | 4,862 |
| Customers with Orders | 942 |
| Total Snapshots Created | 4,862 |
| Snapshots with Revenue > 0 | 673 |
| Snapshots with No Orders | 4,189 |

### Average Scores

| Score Type | Average |
|------------|---------|
| Revenue Score | 7.24 / 100 |
| Cadence Score | 12.79 / 100 |
| Sample Utilization | 0.00 / 100 |

---

## Score Distribution Analysis

### Revenue Score Distribution

| Range | Customer Count | Percentage |
|-------|----------------|------------|
| Excellent (80-100) | 276 | 5.68% |
| Good (60-79) | 41 | 0.84% |
| Fair (40-59) | 49 | 1.01% |
| Poor (20-39) | 67 | 1.38% |
| Very Poor (0-19) | 4,429 | 91.09% |

**Analysis:** The majority of customers (91%) have very low revenue scores, which is expected since 4,189 customers have no orders yet. Of the 673 active customers, 317 (47%) have excellent or good revenue scores.

### Cadence Score Distribution

| Range | Customer Count | Percentage |
|-------|----------------|------------|
| Excellent (80-100) | 60 | 1.23% |
| Good (60-79) | 882 | 18.14% |
| Very Poor (0-19) | 3,920 | 80.63% |

**Analysis:** 942 customers (19.4%) have good or excellent cadence scores, indicating regular ordering patterns. The 3,920 with very poor scores are primarily customers without any orders.

---

## Customer Status Breakdown

| Status | Customer Count | Avg Revenue Score | Avg Cadence Score |
|--------|----------------|-------------------|-------------------|
| No orders yet | 3,920 | 0.00 | 0.00 |
| Active customer | 503 | 53.74 | 69.89 |
| Irregular ordering pattern | 439 | 18.61 | 61.53 |

---

## Top 10 Performing Customers

Based on combined health score (average of all three metrics):

| Customer Name | Revenue | Cadence | Sample | Avg Health | Status |
|---------------|---------|---------|--------|------------|--------|
| Yiannis Wine Enterpr | 100 | 95 | 0 | 65 | Active customer |
| Drink Puritan LLC | 100 | 95 | 0 | 65 | Active customer |
| Noble Hill Vineyards Pty. Ltd. | 100 | 95 | 0 | 65 | Active customer |
| Verre Wine Bar | 100 | 95 | 0 | 65 | Active customer |
| Hilton Norfolk The Main | 100 | 85 | 0 | 61 | Active customer |
| Kings County Wines | 100 | 85 | 0 | 61 | Active customer |
| Vintage Cellar | 100 | 85 | 0 | 61 | Active customer |
| Marriott Resort Va Beach Oceanfront | 100 | 85 | 0 | 61 | Active customer |
| Pizzeria Panina | 100 | 85 | 0 | 61 | Active customer |
| Ando's Market | 100 | 85 | 0 | 61 | Active customer |

---

## Scoring Methodology

### Revenue Score (0-100)
- Calculated based on total customer revenue relative to the average revenue across all customers
- **Max Revenue:** $141,329.00
- **Avg Revenue:** $692.41
- Score formula: `(customer_revenue / avg_revenue) * 50`, capped at 100
- Customers with no orders receive a score of 0

### Cadence Score (0-100)
Based on recency and consistency of orders:
- **No orders:** 0
- **180+ days since last order:** 10 (Inactive)
- **90-180 days since last order:** 30 (At risk)
- **60-90 days since last order:** 50 (Needs attention)
- **30-60 days since last order:** 70
- **Recent orders:**
  - 12+ orders: 95 (Excellent)
  - 6-11 orders: 85 (Good)
  - 3-5 orders: 75 (Fair)
  - 1-2 orders: 60 (Few orders but recent)

### Sample Utilization (0-100)
- Based on number of sample order lines relative to monthly allowance (60)
- Formula: `(sample_count / 60) * 100`, capped at 100
- **Note:** Current data shows 0% sample utilization across all customers, suggesting samples may not be tracked in the current dataset or need different detection logic

---

## Customer Status Categories

Generated based on order history and patterns:

1. **No orders yet** (3,920 customers) - Customers with no order history
2. **Active customer** (503 customers) - Regular ordering with good cadence
3. **Irregular ordering pattern** (439 customers) - Orders exist but inconsistent timing

---

## Files Generated

1. **`/Users/greghogue/Leora2/generate-account-snapshots.sql`**  
   Main script that generates AccountHealthSnapshot records with comprehensive scoring logic

2. **`/Users/greghogue/Leora2/verify-snapshots.sql`**  
   Verification queries for analyzing the generated snapshots

3. **`/Users/greghogue/Leora2/snapshot-generation-report.md`**  
   This comprehensive report

---

## Recommendations

1. **Sample Tracking:** The current implementation shows 0% sample utilization. Consider:
   - Verifying if the `isSample` flag is being set correctly on OrderLines
   - Implementing proper sample order tracking
   - Adding sample product identification logic

2. **New Customer Engagement:** 3,920 customers have no orders yet. Consider:
   - Implementing onboarding campaigns
   - Creating targeted outreach for dormant accounts
   - Setting up automated follow-up workflows

3. **At-Risk Customers:** Identify customers with declining cadence scores for proactive retention efforts

4. **Regular Snapshots:** Schedule this script to run periodically (weekly/monthly) to track account health trends over time

---

## Technical Details

**Database:** PostgreSQL at postgresql://aws-1-us-east-1.pooler.supabase.com:5432/postgres  
**Execution Time:** < 2 seconds  
**Records Processed:** 4,862 customers  
**Total Invoices Referenced:** 2,126  
**Total Orders Analyzed:** 942 unique customer orders

**Snapshot Date:** 2025-10-18 19:31:48.283  
**Tenant ID:** 58b8126a-2d2f-4f55-bc98-5b6784800bed

---

## Query for Future Analysis

To retrieve snapshots for analysis:

```sql
SELECT
  c.name as customer_name,
  ahs."revenueScore",
  ahs."cadenceScore",
  ahs."sampleUtilization",
  (ahs."revenueScore" + ahs."cadenceScore" + ahs."sampleUtilization") / 3 as avg_health_score,
  ahs.notes,
  ahs."snapshotDate"
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
ORDER BY avg_health_score DESC;
```

---

**Status:** ✅ Complete - All snapshots generated successfully with no errors
