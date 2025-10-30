# Orphaned Records Documentation Script

## Purpose

This script documents **all 2,106 orphaned records** in the Lovable database before deletion, creating a complete audit trail.

## Orphan Categories

1. **Orders → Missing Customers** (801 records)
2. **OrderLines → Missing Orders** (641 records)
3. **OrderLines → Missing SKUs** (192 records)
4. **SKUs → Missing Products** (472 records)

## Installation

```bash
cd /Users/greghogue/Leora2/scripts/database-investigation
npm install
```

## Usage

```bash
npm run document-orphans
```

## Output Files

All files are saved to `/Users/greghogue/Leora2/docs/database-investigation/orphans/`:

### CSV Exports (Full Data)
- `orphaned-orders-missing-customers.csv` - All 801 orphaned orders
- `orphaned-orderlines-missing-orders.csv` - All 641 orphaned orderlines (missing orders)
- `orphaned-orderlines-missing-skus.csv` - All 192 orphaned orderlines (missing SKUs)
- `orphaned-skus-missing-products.csv` - All 472 orphaned SKUs

### Reports
- `orphan-analysis-summary.md` - Human-readable summary report
- `orphan-analysis-summary.json` - Machine-readable summary

## Features

### 1. Complete Documentation
- Exports every field for every orphaned record
- Preserves all data before deletion
- Creates permanent audit trail

### 2. Recovery Analysis
- **Orders**: Attempts to match to customers by name similarity
- **OrderLines**: Analyzes patterns for potential recovery
- **SKUs**: Matches to products by name similarity
- Reports recoverable vs. unrecoverable counts

### 3. Pattern Detection
- Identifies temporal patterns (date clusters)
- Groups by missing reference IDs
- Detects systematic data quality issues

### 4. Financial Impact
- Calculates total value of orphaned orders
- Sums orderline values for missing references
- Provides financial impact by category

## Database Connection

The script connects to the Lovable Supabase database:
- **URL**: https://wlwqkblueezqydturcpv.supabase.co
- **Service Role Key**: (embedded in script)

## Recovery Matching Algorithms

### Customer Matching (Orders)
- Uses Levenshtein distance algorithm
- 80% similarity threshold for recovery
- Matches on customer name fields

### Product Matching (SKUs)
- 85% similarity threshold
- Name-based matching
- Identifies potential product associations

### Pattern Analysis
- Temporal clustering
- Reference ID analysis
- Data quality assessment

## Coordination

This script integrates with Claude Flow hooks:
- **Pre-task**: `npx claude-flow@alpha hooks pre-task --description "Document orphaned records"`
- **Post-task**: `npx claude-flow@alpha hooks post-task --task-id "document-orphans"`
- **Memory**: `npx claude-flow@alpha hooks post-edit --file "orphan-report.md" --memory-key "migration/orphans/documented"`

## Success Criteria

✅ All 2,106 orphans documented
✅ CSV exports created for each category
✅ Recovery analysis complete
✅ Financial impact calculated
✅ Summary report generated
✅ Pattern analysis performed

## Next Steps

After running this script:
1. Review the summary report
2. Evaluate recoverable records
3. Approve deletion of unrecoverable records
4. Archive CSV files for audit trail
5. Investigate root causes of orphaning

## Support

For issues or questions, refer to the main migration documentation.
