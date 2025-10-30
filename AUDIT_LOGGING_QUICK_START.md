# Audit Logging System - Quick Start Guide

## Overview
The audit logging system tracks all changes across your application, providing a complete audit trail for compliance and debugging.

## Accessing the Audit Logs

### Main Audit Log Viewer
- **URL:** `/admin/audit-logs`
- **Access:** Admin users only

### Statistics Dashboard
- **URL:** `/admin/audit-logs/stats`
- **Access:** Admin users only

## Common Tasks

### 1. View Recent Changes
1. Navigate to `/admin/audit-logs`
2. Logs are displayed in reverse chronological order (newest first)
3. Default shows 100 logs per page

### 2. Filter Logs by User
1. Click the "Filters" button
2. Select a user from the "User" dropdown
3. Click "Apply Filters"

### 3. Find Changes to a Specific Entity
1. Click the "Filters" button
2. Enter the Entity ID in the search box
3. Click "Apply Filters"

Example: To find all changes to customer `abc-123-def`:
- Entity ID: `abc-123-def`

### 4. View Changes in a Date Range
1. Click the "Filters" button
2. Set "From Date" and "To Date"
3. Click "Apply Filters"

### 5. Track DELETE Operations
1. Click the "Filters" button
2. Check only the "DELETE" action checkbox
3. Click "Apply Filters"

Or view recent critical changes:
1. Navigate to `/admin/audit-logs/stats`
2. Scroll to "Recent Critical Changes" section

### 6. Export Logs to CSV
1. Apply any filters you want (optional)
2. Click "Export to CSV" button
3. File downloads automatically with name: `audit-logs-YYYY-MM-DD.csv`

**Note:** Export is limited to 10,000 records

### 7. View Detailed Change Information
1. Find the log entry in the table
2. Click "View Details" button
3. Modal opens showing:
   - Complete metadata
   - Before/after values for each changed field
   - Raw JSON data
   - Link to view all logs for that entity

### 8. Compare Before/After Values
1. Open the detail modal for an UPDATE log
2. View the "Changes" tab
3. Each changed field shows:
   - **Red box:** Before value
   - **Green box:** After value

### 9. View All Changes to a Specific Customer/Order/etc.
1. Open detail modal for any log related to that entity
2. Click "View All Logs for This Entity" at bottom
3. Opens new tab with chronological history

Or use the API directly:
```
GET /api/admin/audit-logs/entity/Customer/[customer-id]
```

### 10. View System Activity Statistics
1. Navigate to `/admin/audit-logs/stats`
2. View summary cards:
   - Total logs count
   - Today's activity
   - Most active user
   - Most modified entity type
3. View charts:
   - Activity by day (last 30 days)
   - Actions breakdown
   - Entity types breakdown
   - Top 10 active users
4. Review recent critical changes (DELETE actions)

## Understanding Action Types

### Action Color Coding
- **GREEN (CREATE):** New record created
- **BLUE (UPDATE):** Record modified
- **RED (DELETE):** Record deleted
- **ORANGE (STATUS_CHANGE):** Status field changed (e.g., order status)
- **PURPLE (REASSIGN):** Record reassigned (e.g., customer to new sales rep)

### Common Entity Types
- **Customer:** Customer records
- **Order:** Orders
- **OrderLine:** Order line items
- **Invoice:** Invoices
- **Payment:** Payments
- **User:** System users
- **SalesRep:** Sales representative profiles
- **Product:** Products
- **Sku:** SKUs

## Tips & Tricks

### 1. Tracking User Activity
To see everything a specific user has done:
1. Filter by User
2. Sort by Date (newest first)
3. Export to CSV for offline review

### 2. Compliance Auditing
For compliance reports:
1. Set date range to reporting period
2. Filter by relevant entity types (e.g., "Invoice", "Payment")
3. Export to CSV
4. Import into compliance software

### 3. Debugging Issues
When investigating a customer issue:
1. Search by customer's Entity ID
2. Review chronological history
3. Look for DELETE or STATUS_CHANGE actions
4. Check who made the changes and when

### 4. Monitoring System Health
Use the statistics dashboard to:
- Track daily activity levels
- Identify unusual DELETE activity
- Monitor user engagement
- Spot anomalies in change patterns

### 5. Finding Related Changes
When investigating a change:
1. Note the timestamp
2. Set date filter to ±1 hour around that time
3. Filter by same user
4. Review all changes made in that time window

## API Usage Examples

### Get Logs with Filters
```bash
GET /api/admin/audit-logs?userId=abc-123&action=UPDATE,DELETE&dateFrom=2025-01-01
```

### Get Single Log Detail
```bash
GET /api/admin/audit-logs/[log-id]
```

### Get Entity History
```bash
GET /api/admin/audit-logs/entity/Customer/[customer-id]
```

### Export to CSV
```bash
POST /api/admin/audit-logs/export
Content-Type: application/json

{
  "userId": "abc-123",
  "dateFrom": "2025-01-01",
  "dateTo": "2025-01-31"
}
```

### Get Statistics
```bash
GET /api/admin/audit-logs/stats
```

## Keyboard Shortcuts

- **Escape:** Close detail modal
- **Enter (in search):** Apply filters
- **Tab:** Navigate through form fields

## Best Practices

### 1. Regular Monitoring
- Check statistics dashboard weekly
- Review critical changes daily
- Set up alerts for DELETE actions (future feature)

### 2. Documentation
- Export logs at end of month for records
- Keep CSV exports for compliance
- Document significant changes in external systems

### 3. Security
- Limit admin access to authorized personnel
- Review user activity regularly
- Investigate unexpected DELETE operations

### 4. Performance
- Use date range filters for large datasets
- Export in batches if over 10,000 records
- Use entity-specific queries when possible

## Troubleshooting

### Problem: No logs showing
**Solution:** Check that:
- You're logged in as an admin user
- The database connection is working
- Audit logging is enabled in the application

### Problem: Export not working
**Solution:** Check that:
- Result set is less than 10,000 records
- Browser allows downloads
- You have sufficient disk space

### Problem: Statistics not loading
**Solution:**
- Refresh the page
- Check browser console for errors
- Contact system administrator

### Problem: Can't find specific log
**Solution:**
- Try broader filters (remove entity type filter)
- Extend date range
- Search by user instead of entity

## Support

For additional help:
1. Review the full implementation documentation
2. Check the API endpoint documentation
3. Contact your system administrator

## Quick Reference Card

| Task | Steps |
|------|-------|
| View recent logs | Go to `/admin/audit-logs` |
| Filter by user | Filters → Select User → Apply |
| Filter by date | Filters → Set dates → Apply |
| View details | Click "View Details" on log entry |
| Export CSV | Click "Export to CSV" button |
| View statistics | Go to `/admin/audit-logs/stats` |
| Find entity history | Detail Modal → "View All Logs for This Entity" |
| Clear filters | Filters → "Clear Filters" button |
| Find deletions | Filters → Check "DELETE" → Apply |
| See top users | Stats → "Top 10 Most Active Users" |
