# Sample Analytics Guide

## Overview

The Sample Analytics Dashboard provides comprehensive insights into your sample distribution effectiveness, conversion rates, and return on investment. Use these analytics to optimize your sampling strategy and maximize revenue generation.

## Dashboard Overview

### Accessing the Dashboard

1. Navigate to **Sales > Analytics > Samples**
2. The dashboard loads the last 30 days of data by default
3. Use the date range selector to adjust the timeframe

### Key Sections

1. **Summary Metrics**: High-level KPIs
2. **Conversion Metrics**: Sample-to-order conversion rates
3. **Top Performers**: Best-converting products
4. **Rep Leaderboard**: Sales rep performance comparison
5. **Supplier Reports**: Performance by supplier
6. **Trend Analysis**: Historical patterns

## Understanding Conversion Metrics

### What is Conversion?

A sample is considered "converted" when:
- The customer places an order containing the sampled SKU
- The order occurs within **30 days** of the sample date
- The order is not canceled or voided

### Conversion Rate Calculation

```
Conversion Rate = (Converted Samples / Total Samples) × 100%
```

**Example**:
- Total samples distributed: 100
- Samples that led to orders: 35
- Conversion rate: 35%

### Industry Benchmarks

- **Excellent**: 40%+ conversion rate
- **Good**: 25-40% conversion rate
- **Average**: 15-25% conversion rate
- **Needs Improvement**: <15% conversion rate

**Note**: Conversion rates vary significantly by:
- Product category (premium vs. value)
- Customer type (restaurant vs. retail)
- Market conditions
- Sales rep experience

## Revenue Attribution

### 30-Day Attribution Window

When a customer orders a sampled product within 30 days, the **entire revenue** from that line item is attributed to the sample.

**Attribution Logic**:
1. System identifies all samples given to a customer
2. When an order is placed, checks if any line items match sampled SKUs
3. If the order is within 30 days of the sample, revenue is attributed
4. Revenue is calculated as: `Quantity Ordered × Price Per Unit`

### Example Attribution

**Sample Given**:
- Date: January 5
- Customer: Wine Bar ABC
- Product: Chardonnay XYZ (SKU: CHARD-001)
- Quantity: 1 bottle

**Order Placed**:
- Date: January 20 (within 30 days ✓)
- Customer: Wine Bar ABC
- Line item: Chardonnay XYZ × 6 cases × $120/case = $720

**Result**: $720 in revenue is attributed to that sample

### ROI Calculation

```
Sample ROI = (Revenue Attributed - Sample Cost) / Sample Cost × 100%
```

**Example**:
- Sample cost: $15
- Revenue attributed: $720
- ROI: ($720 - $15) / $15 × 100% = 4,700%

**Interpreting ROI**:
- **> 1,000%**: Excellent ROI
- **500-1,000%**: Very good ROI
- **100-500%**: Good ROI, sample paid for itself
- **< 100%**: Sample cost more than it generated

## Top Performers

### Top Performing Products

This view shows which wines convert best from samples:

**Metrics Displayed**:
- **SKU/Product Name**
- **Samples Distributed**: Total number given out
- **Conversions**: Number that led to orders
- **Conversion Rate**: Percentage
- **Revenue Generated**: Total revenue attributed
- **Avg Order Size**: Average revenue per conversion
- **ROI**: Return on investment

**Sorting Options**:
- Conversion rate (highest to lowest)
- Revenue generated (highest to lowest)
- Number of samples (most distributed)
- ROI (highest to lowest)

### Strategic Use Cases

**High Conversion, High Revenue**:
- These are your star performers
- Lead with these for new accounts
- Ensure adequate inventory
- Consider expanding the range

**High Conversion, Lower Revenue**:
- Great "foot in the door" products
- Use for initial relationship building
- May convert to higher-value purchases later

**Lower Conversion, High Revenue When They Hit**:
- Premium/specialty products
- Use more selectively
- Target customers with appropriate budgets
- May need more education/story

**Low Conversion, Low Revenue**:
- Consider discontinuing sampling
- May not fit your market
- Could be pricing issues
- Might work better in different channels

## Rep Leaderboard

### Understanding Rep Performance

The leaderboard compares sales reps on:

**Primary Metrics**:
- **Total Samples Distributed**
- **Conversion Rate**: Percentage of samples converting to orders
- **Revenue Generated**: Total attributed revenue
- **Avg Revenue Per Sample**: Efficiency metric
- **Number of Customers Sampled**

**Efficiency Metrics**:
- **Samples per Account**: Average samples per customer
- **Revenue per Account**: Average revenue per customer sampled
- **Follow-up Rate**: Percentage of samples with follow-up logged

### Leaderboard Views

**Top Converters**:
- Reps with highest conversion rates
- Identifies effective sampling strategies
- Benchmark for team training

**Revenue Generators**:
- Reps generating most revenue from samples
- May sample more or convert higher-value products
- Balance volume vs. efficiency

**Most Efficient**:
- Highest revenue per sample distributed
- Strategic samplers vs. volume samplers
- Quality over quantity approach

### Using the Leaderboard for Coaching

**High-Performing Reps**:
- What products do they sample most?
- Which customer types do they target?
- What's their follow-up approach?
- Share best practices with the team

**Improvement Opportunities**:
- Lower conversion rate: Better customer qualification?
- High samples but low revenue: Sample more premium products?
- Low follow-up rate: Implement task triggers

## Supplier Reports

### Generating Supplier Reports

1. Navigate to **Sample Analytics > Supplier Reports**
2. Select date range
3. Choose supplier(s) or "All Suppliers"
4. Click **"Generate Report"**

### Report Contents

**For each supplier**:
- Total samples distributed
- Number of unique SKUs sampled
- Conversion rate
- Revenue generated
- Top-performing SKUs
- Breakdown by sales rep

### Report Formats

**CSV Export**:
- Detailed line-by-line data
- Import into Excel for further analysis
- Share with suppliers

**PDF Summary**:
- Executive summary format
- Charts and graphs
- Suitable for presentations

### Strategic Use of Supplier Reports

**Supplier Negotiations**:
- "Your samples convert at 42% vs. 28% industry average"
- Request more sample inventory for high performers
- Negotiate better pricing based on performance

**Sample Allocation**:
- Allocate more samples to high-performing suppliers
- Request suppliers discontinue poor performers
- Identify gaps in the portfolio

**Supplier Partnerships**:
- Share data to improve collaboration
- Request targeted samples for specific accounts
- Joint planning for new launches

## Date Range Selection

### Available Date Ranges

**Quick Selects**:
- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last 12 months
- Year to date
- Custom range

### Selecting Custom Ranges

1. Click the date range dropdown
2. Select "Custom Range"
3. Choose start date
4. Choose end date
5. Click **"Apply"**

**Tips**:
- Align with your fiscal calendar
- Compare same periods year-over-year
- Use 30 or 90-day windows for meaningful conversion data

## Interpreting Trends

### Conversion Rate Trends

**Upward Trend** (Improving conversion):
- Possible causes: Better targeting, improved follow-up, seasonal demand
- Action: Document what's working, maintain momentum

**Downward Trend** (Declining conversion):
- Possible causes: Market saturation, wrong products, poor follow-up
- Action: Review sample strategy, refresh product mix, improve follow-up

**Seasonal Patterns**:
- Identify high and low conversion periods
- Plan sample distribution accordingly
- Build inventory before high-conversion seasons

### Volume vs. Efficiency

**Chart**: Samples Distributed (bars) vs. Conversion Rate (line)

**Patterns to Watch**:

**High Volume, Stable Conversion**:
- Scalable strategy
- Keep it up

**Increasing Volume, Declining Conversion**:
- Sampling fatigue or wrong targeting
- Refocus on quality accounts

**Lower Volume, Rising Conversion**:
- More strategic sampling
- Possibly sustainable with better ROI

### Revenue Attribution Over Time

**Monthly Revenue Attribution Chart**:
- Shows revenue generated from samples by month
- Identifies seasonal patterns
- Helps with forecasting

**Leading Indicator**:
- Current month's samples predict next 30 days' revenue
- Use for pipeline forecasting
- Adjust sample distribution to hit revenue targets

## Export Functions

### Export to CSV

1. Click **"Export to CSV"** on any analytics view
2. Data downloads in tabular format
3. Opens in Excel, Google Sheets, etc.

**CSV Contents**:
- All visible data columns
- Filtered by current date range and selections
- Includes calculated metrics

**Uses**:
- Deep dive analysis in Excel
- Import into BI tools (Tableau, PowerBI)
- Create custom reports
- Share with stakeholders

### Export to PDF

1. Click **"Export to PDF"**
2. Select report template:
   - Executive Summary
   - Detailed Report
   - Rep Performance Report
   - Supplier Report
3. PDF generates with charts and tables

**Uses**:
- Presentations to management
- Supplier performance reviews
- Sales meeting materials
- Archive snapshots

## Making Business Decisions from Data

### Sample Budget Allocation

**Question**: How should I allocate my monthly sample budget?

**Data to Review**:
1. Top Performers report (which products convert best)
2. Revenue Attribution (which products generate most revenue)
3. Rep Leaderboard (which reps use samples most effectively)

**Decision Framework**:
- Allocate 60% to proven high converters
- Allocate 30% to new products for testing
- Allocate 10% to special requests

### Customer Targeting

**Question**: Which customers should I prioritize for sampling?

**Data to Review**:
1. Filter analytics by customer
2. Historical conversion rates by customer
3. Average revenue per customer when samples convert

**Red Flags** (deprioritize sampling):
- Customers who never convert samples
- Very low revenue when they do convert
- Long sales cycles (> 60 days)

**Green Lights** (prioritize sampling):
- Customers with 40%+ conversion on past samples
- High average order value
- Quick decision-makers (< 14 days)

### Product Mix Optimization

**Question**: Which products should we push vs. phase out?

**Data to Review**:
1. Top Performers > Sort by Conversion Rate
2. Revenue Generated by SKU
3. ROI by SKU

**Decision Matrix**:

| Conversion | Revenue | Action |
|------------|---------|--------|
| High | High | **Feature prominently**, ensure stock |
| High | Low | Use as **"door opener"**, upsell to premium |
| Low | High | **Selective sampling**, target right customers |
| Low | Low | **Phase out** or discontinue sampling |

### Seasonal Planning

**Question**: When should we ramp up sampling?

**Data to Review**:
1. Conversion Rate Trends > Monthly view
2. Revenue Attribution > Year-over-year comparison
3. Historical sample distribution patterns

**Seasonal Insights**:
- **Spring** (March-May): High rosé conversion, seafood-friendly whites
- **Summer** (June-August): Lower overall conversion (vacation closures)
- **Fall** (September-November): Highest conversion period, new menu season
- **Winter** (December-February): Holiday slump, focus on by-the-glass programs

### Rep Training and Coaching

**Question**: How do I improve team performance?

**Data to Review**:
1. Rep Leaderboard > Conversion Rate
2. Compare top performer strategies to average performers
3. Follow-up rates by rep

**Coaching Opportunities**:
- **Low conversion rate**: Improve customer qualification, better product-customer matching
- **Low follow-up rate**: Implement task triggers, train on CRM usage
- **High volume, low revenue**: Coach on upselling, sampling premium products
- **Great conversion, low volume**: Encourage more proactive sampling

## Advanced Analytics Features

### Cohort Analysis

**Upcoming Feature**: Track sample conversion by cohort (month sampled)

**Use Case**: Do January samples convert better than March samples?

### Multi-Touch Attribution

**Upcoming Feature**: Credit samples when multiple samples precede an order

**Example**: Customer tasted 3 wines, ordered 2 of them - how to attribute?

### Predictive Modeling

**Upcoming Feature**: AI predicts which samples are most likely to convert

**Based on**:
- Historical customer behavior
- Product characteristics
- Market trends
- Sales rep patterns

## Troubleshooting Analytics Issues

### Data Doesn't Match Expectations

**Problem**: Numbers seem off

**Checks**:
1. Verify date range is correct
2. Ensure all samples were logged properly
3. Check that orders were entered in the system
4. Confirm SKU codes match between samples and orders

### Missing Products in Top Performers

**Problem**: I know we sampled Product X but it's not showing

**Solutions**:
1. Check that samples were logged (not just inventory deduction)
2. Verify SKU code consistency
3. Ensure date range includes the sampling period
4. Check that the product isn't filtered out

### Conversion Seems Low

**Problem**: Conversion rate lower than expected

**Considerations**:
1. Are you within the 30-day attribution window?
2. Did customers order under different SKU codes?
3. Were pending orders not yet entered?
4. Is there a seasonal factor?

### Revenue Attribution Doesn't Match

**Problem**: Revenue seems higher or lower than reality

**Checks**:
1. Attribution includes ALL revenue from matching line items
2. If customer ordered 10 cases and you sampled 1 bottle, all 10 cases count
3. Attribution is based on order placement date, not delivery
4. Check for duplicate sample entries

## Best Practices

### Review Frequency

**Weekly**: Top Performers, recent conversions
**Monthly**: Full dashboard, rep leaderboard
**Quarterly**: Trend analysis, strategic adjustments
**Annually**: Year-over-year comparisons, budget planning

### Share Insights with Team

- Weekly highlight emails: "This week's top converting sample"
- Monthly team meetings: Review leaderboard, celebrate wins
- Quarterly strategy sessions: Adjust sample portfolio based on data

### Continuous Improvement

1. **Test and Learn**: Try new products, track results
2. **Benchmark**: Compare to industry standards and top performers
3. **Iterate**: Adjust strategy based on data quarterly
4. **Document**: Keep notes on what works and why

## Related Documentation

- [Sample Management Guide](./SAMPLE_MANAGEMENT_GUIDE.md) - How to log and track samples
- [Automated Triggers Guide](./AUTOMATED_TRIGGERS_GUIDE.md) - Automate follow-ups
- [Samples Quick Reference](./SAMPLES_QUICK_REFERENCE.md) - Cheat sheet
- [API Reference](./API_REFERENCE.md) - Analytics API endpoints

## Support

- **In-app help**: Click the ? icon
- **Training**: Available in Help Center
- **Custom reports**: Contact your admin
- **Data exports**: Use CSV for custom analysis
