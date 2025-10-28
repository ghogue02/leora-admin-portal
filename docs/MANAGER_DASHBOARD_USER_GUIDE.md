# Manager Dashboard User Guide

## Quick Start Guide for Managers

### Navigation
Access the manager dashboard at: `/sales/manager`

### Dashboard Tabs

The dashboard has 4 main tabs:

1. **Overview** - Team stats, rep performance, territory health
2. **Performance** - Charts and rankings
3. **Forecast** - Revenue projections
4. **Samples** - Sample budget tracking

---

## Feature Guide

### 1. Rep Performance Drill-Down

**How to Use**:
1. Go to "Overview" tab
2. In the "Sales Representatives Performance" table
3. **Click any rep's name** (blue, underlined)
4. Modal opens with detailed information

**What You'll See**:
- **Overview Tab**: Revenue stats (week/month/year/all-time), top customers, activity breakdown
- **Customers Tab**: Full list of all customers with revenue and order counts
- **Orders Tab**: Recent orders (last 30 days) with amounts and dates
- **Activities Tab**: All recent activities with notes
- **At Risk Tab**: Customers requiring attention with days since last order

**Use Cases**:
- Review individual rep performance in detail
- Identify top customers for a rep
- Find at-risk customers that need follow-up
- Track rep activities and engagement

---

### 2. Territory Drill-Down

**How to Use**:
1. Go to "Overview" tab
2. In the "Territory Health" section
3. **Click any territory card**
4. Modal opens with territory details

**What You'll See**:
- **Statistics**: Total revenue, total accounts, average per account
- **Health Chart**: Pie chart showing healthy/at-risk/dormant breakdown
- **All Accounts**: Complete list of accounts in territory with health status

**Use Cases**:
- Analyze territory health at a glance
- Review all accounts in a specific territory
- Identify territories needing support
- Compare revenue distribution across accounts

---

### 3. Performance Comparison

**How to Use**:
1. Click "Performance" tab
2. Use toggle buttons: **This Week**, **YTD**, or **All-Time**
3. View charts and rankings

**What You'll See**:
- **Rankings**: 1st 🥇, 2nd 🥈, 3rd 🥉 with percentage of team total
- **Bar Chart**: Rep-by-rep revenue comparison
- **Pie Chart**: Team revenue distribution
- **Line Chart**: 4-week trend analysis

**Use Cases**:
- Compare rep performance side-by-side
- Identify top performers
- Spot trends over time
- Analyze team revenue distribution

---

### 4. Revenue Forecasting

**How to Use**:
1. Click "Forecast" tab
2. Review team and individual projections

**What You'll See**:
- **Team Forecast**: Projected annual revenue, YTD actual, current pace
- **12-Month Projection**: Area chart with confidence intervals
- **Individual Rep Forecasts**:
  - Projected annual revenue
  - YTD actual vs target
  - Trend indicator (↗️ up, ↘️ down, → stable)
  - Confidence level (HIGH, MEDIUM, LOW)

**Confidence Levels Explained**:
- **HIGH**: >50 orders and >10 weeks of data (reliable projection)
- **MEDIUM**: Moderate data volume (reasonable projection)
- **LOW**: <10 orders or <5 weeks of data (use with caution)

**Trend Indicators**:
- **↗️ Up**: Revenue increased >10% (last 4 weeks vs previous 4 weeks)
- **↘️ Down**: Revenue decreased >10% (last 4 weeks vs previous 4 weeks)
- **→ Stable**: Revenue within ±10% range

**Use Cases**:
- Plan for future revenue
- Identify reps trending down (need coaching)
- Set realistic targets
- Make informed business decisions

---

## Common Workflows

### Weekly Team Review
1. Check "Overview" → Team Stats for weekly summary
2. Review rep performance table for quota attainment
3. Click any underperforming rep to see details
4. Check "At Risk" tab in drill-down for customers needing attention

### Monthly Planning
1. Go to "Performance" tab
2. Switch to "YTD" view
3. Review rankings and identify coaching opportunities
4. Go to "Forecast" tab
5. Review projections and adjust targets

### Territory Analysis
1. Click territory card
2. Review health breakdown pie chart
3. Identify dormant accounts
4. Check revenue distribution
5. Plan territory strategy

### Rep Coaching Session
1. Click rep name to open drill-down
2. Review "Overview" → Top customers
3. Check "At Risk" tab for follow-up opportunities
4. Review "Activities" tab for engagement level
5. Discuss findings with rep

---

## Tips & Best Practices

### For Daily Use
- Check "Overview" daily for team pulse
- Click rep names for quick drill-downs
- Monitor at-risk customers weekly

### For Weekly Reviews
- Use "Performance" tab to compare reps
- Review trends in line chart
- Identify coaching opportunities

### For Monthly Planning
- Use "Forecast" tab for projections
- Check confidence levels before setting targets
- Review trend indicators for early warnings

### For Territory Management
- Click territories to see account distribution
- Monitor health breakdown percentages
- Track dormant accounts for reactivation

---

## Mobile Usage

All features are mobile-responsive:
- Tables scroll horizontally
- Charts adapt to screen size
- Modals fit mobile screens
- Touch-friendly buttons

**Tip**: Use landscape mode for better chart viewing on mobile.

---

## Data Refresh

- All data is **real-time** from the database
- Drill-down modals load fresh data when opened
- No caching - always see latest information
- Refresh page to update dashboard stats

---

## Exporting Data

**Current**:
- Performance charts can be viewed on screen
- Forecast has "Download PDF Report" button (ready for implementation)

**Future**:
- Excel export for detailed analysis
- CSV export for custom reports
- Email scheduled reports

---

## Getting Help

### Understanding Metrics

**Revenue Stats**:
- **This Week**: Monday-Sunday current week
- **This Month**: Calendar month
- **This Year**: January 1 to today (YTD)
- **All-Time**: Total since account creation

**Customer Status**:
- **HEALTHY**: Recent orders, on schedule
- **AT_RISK_CADENCE**: Ordering less frequently
- **AT_RISK_REVENUE**: Spending less
- **DORMANT**: No recent orders

**Quota Attainment**:
- **Green (≥100%)**: Meeting or exceeding quota
- **Yellow (80-99%)**: Close to quota
- **Red (<80%)**: Below quota

---

## Keyboard Shortcuts

- **Tab**: Navigate between elements
- **Enter**: Activate selected element
- **Esc**: Close modals
- **Arrow Keys**: Navigate through tables

---

## Troubleshooting

**Modal won't open**:
- Ensure you're clicking the rep name (not email)
- Try refreshing the page

**Charts not displaying**:
- Check internet connection
- Refresh the page
- Ensure browser is up to date

**Data seems old**:
- Click refresh in browser
- Modal data loads when opened

**Mobile issues**:
- Use landscape mode for charts
- Scroll horizontally for tables
- Zoom in/out if needed

---

## Support

For technical issues or feature requests:
- Contact your system administrator
- Refer to technical documentation at `/docs/phase2-manager-enhancements.md`

---

**Last Updated**: October 26, 2025
**Version**: 2.0 (Phase 2 Complete)
