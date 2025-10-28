# Samples Quick Reference

One-page cheat sheet for Phase 3 Sample Management features.

---

## Quick Actions

### Log a Sample
1. Navigate to customer page OR Sales > Samples
2. Click **"Log Sample Usage"**
3. Fill: Customer, SKU, Quantity, Date, Feedback
4. Check "Needs Follow-up" if applicable
5. **Save**

### View Analytics
**Sales > Analytics > Samples**
- Conversion rates
- Top performers
- Rep leaderboard
- Date range selector

### Get AI Recommendations
1. Create/edit customer order
2. Add initial products to cart
3. Click **"Get AI Recommendations"**
4. Review suggestions
5. **Add to Order**

---

## Common Commands

### API Endpoints

```bash
# Log sample
POST /api/samples/quick-assign
{
  "customerId": "uuid",
  "skuId": "uuid",
  "quantity": 1,
  "tastedAt": "2024-10-25T14:30:00Z",
  "feedback": "Loved it"
}

# Get analytics
GET /api/samples/analytics?startDate=2024-10-01&endDate=2024-10-31

# Get recommendations
POST /api/recommendations/products
{
  "customerId": "uuid",
  "currentOrderItems": [...]
}
```

---

## Key Metrics Formulas

### Conversion Rate
```
Conversion Rate = (Converted Samples / Total Samples) × 100%
```

### ROI
```
ROI = (Revenue Attributed - Sample Cost) / Sample Cost × 100%
```

### Revenue Per Sample
```
Revenue Per Sample = Total Revenue / Total Samples
```

### Attribution Logic
```
IF order contains sampled SKU
AND order placed within 30 days of sample
THEN mark sample as converted
```

---

## Trigger Types

| Type | When It Fires | Creates |
|------|---------------|---------|
| **Sample No Order** | Sample given, X days pass, no order | Phone call task |
| **First Order** | Customer's first order | Thank you task |
| **Customer Timing** | Expected re-order date approaching | Proactive contact |
| **Burn Rate** | Order frequency decreases >30% | High-priority visit |

**Default Settings**:
- Sample No Order: 7 days
- First Order: 1 day after order
- Customer Timing: 3-5 days before expected
- Burn Rate: When pattern changes

---

## Feedback Templates

### Positive
- "Loved it"
- "Will order soon"
- "Wants to feature it"
- "Impressed with quality"

### Neutral
- "Needs time to decide"
- "Interested in comparing options"
- "Good, not excited"

### Negative
- "Not a fit"
- "Price point too high"
- "Already has similar"
- "Prefer different style"

---

## Analytics Dashboard Views

### Summary Metrics
- Total samples distributed
- Conversion rate (%)
- Revenue attributed ($)
- Avg revenue per sample
- Avg days to conversion

### Top Performers
Sort by:
- Conversion rate (best converters)
- Revenue (highest revenue)
- ROI (best return on investment)

### Rep Leaderboard
Metrics:
- Conversion rate
- Revenue generated
- Samples distributed
- Follow-up rate

### Filters
- Date range (7/30/90 days, custom)
- Sales rep
- Product category
- Conversion status

---

## Troubleshooting Quick Fixes

### "Sample budget exceeded"
- Check budget: Sales > Samples > Budget Tracker
- Wait for monthly reset (1st of month)
- Request increase from manager
- Use half-bottle samples (quantity 0.5)

### Can't find product
- Ensure product is "Active"
- Search by SKU code
- Check if "Sample Only" product
- Contact admin to verify

### Sample not in customer history
- Refresh page
- Verify correct customer selected
- Check Samples page (may be there)
- Clear browser cache

### Conversion not tracking
- Must order exact same SKU
- Must be within 30 days
- Order must not be canceled
- Manual: Click sample > "Mark Converted"

### AI recommendations not appearing
- Verify customer has order history (min 3 orders)
- Check ANTHROPIC_API_KEY configured
- Check API budget not exceeded
- Fallback to manual suggestions

### Triggers not firing
- Verify trigger is enabled (Admin > Triggers)
- Check trigger conditions match
- Verify cron job running
- Check trigger logs

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **L** | Log sample (from customer page) |
| **A** | View analytics |
| **R** | Get AI recommendations (in order) |
| **ESC** | Close modal |
| **/** | Search |

---

## Mobile Quick Tips

### Sample Logging on iPad
1. Use voice-to-text for feedback (microphone icon)
2. Favorites list for common products
3. Auto-complete customer names
4. Offline mode available

### Analytics on Phone
- Swipe charts left/right for more data
- Tap bars/lines for details
- Export button (top right)
- Landscape for best view

---

## Date Ranges

### Pre-defined Ranges
- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last 12 months
- Year to date
- Custom range

### Custom Range
1. Click date range dropdown
2. Select "Custom Range"
3. Choose start and end dates
4. **Apply**

---

## Export Options

### CSV Export
- All data in table format
- Opens in Excel/Google Sheets
- Filter/sort first, then export
- Useful for custom analysis

### PDF Export
- Executive summary format
- Charts and graphs included
- Suitable for presentations
- Supplier performance reviews

---

## Configuration Locations

### Sample Settings
**Admin > Settings > Samples**
- Monthly allowance
- Attribution window (days)
- Budget alerts

### Trigger Settings
**Admin > Settings > Triggers**
- Enable/disable triggers
- Adjust days
- Modify task types
- Description templates

### AI Settings
**Admin > Settings > AI**
- API key
- Model selection
- Monthly budget
- Confidence threshold

---

## Performance Benchmarks

| Operation | Target | Actual |
|-----------|--------|--------|
| Log sample | < 500ms | ~340ms |
| Load analytics | < 2s | ~1.5s |
| AI recommendations | < 3s | ~2.5s |
| Export CSV | < 1s | ~600ms |

---

## Support Contacts

- **In-app help**: Click ? icon (bottom right)
- **Training videos**: Help Center
- **Email**: support@yourcompany.com
- **Manager**: For budget/permission changes

---

## Related Documentation

- [Sample Management Guide](./SAMPLE_MANAGEMENT_GUIDE.md) - Full guide
- [Sample Analytics Guide](./SAMPLE_ANALYTICS_GUIDE.md) - Analytics details
- [Automated Triggers Guide](./AUTOMATED_TRIGGERS_GUIDE.md) - Trigger setup
- [AI Recommendations Guide](./AI_RECOMMENDATIONS_GUIDE.md) - AI features
- [API Reference](./API_REFERENCE.md) - Developer docs

---

## Version
**Phase 3 - Version 3.0.0**
**Last Updated**: October 25, 2024
