# LeorAI Enhancements - Phase 2 Implementation

## Overview

This document describes the LeorAI enhancements implemented in Phase 2, focusing on Custom Query Builder and Scheduled Insights features.

## Features Implemented

### 1. Custom Query Builder (✅ Completed)

A comprehensive query management system that allows users to save, organize, and reuse their LeorAI queries.

#### Key Features:
- **Save Custom Queries**: Users can save any query with a name, description, and category
- **Pre-built Templates**: 10 ready-to-use query templates covering common use cases:
  - Top Customers This Month
  - At-Risk Accounts in Territory
  - Products Trending Down
  - New Customers This Week
  - Dormant Customers to Reactivate
  - Weekly Revenue Breakdown
  - Sample Conversion Analysis
  - Priority Call List
  - Quota Progress Report
  - Territory Health Overview

- **Query History**: Automatically tracks last 10 queries executed
- **One-click Execution**: Run saved queries with a single click
- **Share Queries**: Option to share queries with team members
- **Usage Analytics**: Track how often each query is used

#### Database Schema:
```sql
-- SavedQuery table
CREATE TABLE SavedQuery (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  userId UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  queryText TEXT NOT NULL,
  isTemplate BOOLEAN DEFAULT false,
  isShared BOOLEAN DEFAULT false,
  category VARCHAR,
  tags VARCHAR[] DEFAULT '{}',
  usageCount INT DEFAULT 0,
  lastUsedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- QueryHistory table
CREATE TABLE QueryHistory (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  userId UUID NOT NULL,
  queryText TEXT NOT NULL,
  executedAt TIMESTAMP DEFAULT NOW()
);
```

#### API Endpoints:

**Saved Queries:**
- `GET /api/sales/leora/queries` - List all saved queries
- `POST /api/sales/leora/queries` - Create new saved query
- `GET /api/sales/leora/queries/[queryId]` - Get specific query
- `PUT /api/sales/leora/queries/[queryId]` - Update saved query
- `DELETE /api/sales/leora/queries/[queryId]` - Delete saved query
- `POST /api/sales/leora/queries/[queryId]/execute` - Execute a saved query
- `GET /api/sales/leora/queries/templates` - Get query templates
- `POST /api/sales/leora/queries/templates` - Create template from query

**Query History:**
- `GET /api/sales/leora/queries/history` - Get query history (last 10)
- `POST /api/sales/leora/queries/history` - Add to history

#### UI Components:
- `QueryBuilder.tsx` - Main query builder component with tabs:
  - **Templates Tab**: Browse and use pre-built templates
  - **My Queries Tab**: Manage saved queries
  - **History Tab**: View and reuse recent queries

### 2. Scheduled Insights (✅ Completed)

Automated email reports delivered on a schedule to keep users informed without manual queries.

#### Key Features:
- **Multiple Report Types**:
  - **Daily Briefing**: Top 5 insights for the day
  - **Weekly Performance Summary**: Week in numbers
  - **Territory Health Report**: Customer risk & opportunities
  - **Custom Query Reports**: Schedule any saved query

- **Flexible Scheduling**:
  - Daily, Weekly, or Monthly frequency
  - Custom time of day (e.g., 8:00 AM)
  - Weekly: Select specific day of week
  - Monthly: Delivered on 1st of month

- **Email Delivery**:
  - Custom recipient email
  - Professional email templates
  - Unsubscribe option
  - Delivery tracking

#### Database Schema:
```sql
-- ScheduledReport table
CREATE TABLE ScheduledReport (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,
  userId UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  reportType VARCHAR NOT NULL, -- DAILY_BRIEFING, WEEKLY_PERFORMANCE, etc.
  frequency VARCHAR NOT NULL, -- DAILY, WEEKLY, MONTHLY
  dayOfWeek INT, -- 0-6 for weekly reports
  timeOfDay VARCHAR DEFAULT '08:00', -- HH:mm format
  recipientEmail VARCHAR NOT NULL,
  isActive BOOLEAN DEFAULT true,
  lastSentAt TIMESTAMP,
  nextScheduled TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### API Endpoints:

**Scheduled Reports:**
- `GET /api/sales/leora/reports` - List all scheduled reports
- `POST /api/sales/leora/reports` - Create new scheduled report
- `GET /api/sales/leora/reports/[reportId]` - Get specific report
- `PUT /api/sales/leora/reports/[reportId]` - Update scheduled report
- `DELETE /api/sales/leora/reports/[reportId]` - Delete scheduled report

#### UI Components:
- `ScheduledReports.tsx` - Scheduled reports management:
  - Create new scheduled reports
  - View all scheduled reports
  - Pause/resume reports
  - Delete reports
  - See next delivery time

### 3. UI Integration (✅ Completed)

Enhanced LeorAI page with new features seamlessly integrated:

- **Toggle Buttons**: Easy access to Query Builder and Scheduled Reports
- **Collapsible Sections**: Keep interface clean while providing full functionality
- **Consistent Design**: Matches existing LeorAI design language
- **Responsive Layout**: Works on all screen sizes

## Technical Implementation

### File Structure
```
/web/src/app/
├── api/sales/leora/
│   ├── queries/
│   │   ├── route.ts                    # List/Create queries
│   │   ├── [queryId]/route.ts          # Get/Update/Delete
│   │   ├── [queryId]/execute/route.ts  # Execute query
│   │   ├── templates/route.ts          # Query templates
│   │   └── history/route.ts            # Query history
│   └── reports/
│       ├── route.ts                    # List/Create reports
│       └── [reportId]/route.ts         # Get/Update/Delete
├── sales/leora/
│   ├── page.tsx                        # Main LeorAI page
│   └── _components/
│       ├── QueryBuilder.tsx            # Query builder UI
│       ├── ScheduledReports.tsx        # Scheduled reports UI
│       └── AutoInsights.tsx            # Existing insights
└── prisma/
    └── schema.prisma                   # Database schema
```

### Database Migrations
```bash
# Schema was updated with new models
npx prisma db push

# Generated Prisma client
npx prisma generate
```

## Usage Guide

### For Users

**Using Query Templates:**
1. Navigate to LeorAI page
2. Click "📋 Saved Queries" button
3. Browse templates in "Templates" tab
4. Click "Use" on any template to run it

**Saving Custom Queries:**
1. Click "+ Save New Query" button
2. Fill in name, description, query text
3. Select category (optional)
4. Click "Save Query"

**Scheduling Reports:**
1. Click "📅 Scheduled Reports" button
2. Click "+ Schedule Report"
3. Choose report type and frequency
4. Set time and email address
5. Click "Schedule Report"

**Managing Reports:**
- Pause/Resume: Click "Pause" or "Activate" button
- Delete: Click "Delete" button
- View next delivery time in report card

### For Developers

**Adding New Templates:**
Edit `/api/sales/leora/queries/templates/route.ts`:
```typescript
const QUERY_TEMPLATES = [
  {
    name: 'Your Template Name',
    description: 'What it does',
    queryText: 'The actual query',
    category: 'Category Name',
    tags: ['tag1', 'tag2'],
  },
  // ... existing templates
];
```

**Creating Custom Report Types:**
1. Add enum value in `schema.prisma`:
```prisma
enum ScheduledReportType {
  DAILY_BRIEFING
  WEEKLY_PERFORMANCE
  TERRITORY_HEALTH
  CUSTOM_QUERY
  YOUR_NEW_TYPE // Add here
}
```

2. Add to UI in `ScheduledReports.tsx`:
```typescript
const REPORT_TYPES = [
  { value: 'YOUR_NEW_TYPE', label: 'Display Name', description: 'Description' },
];
```

## Next Steps (Email System Implementation)

### Still Pending:
1. **Email Delivery System**:
   - Set up email service (Resend, SendGrid, etc.)
   - Create email templates (HTML/text)
   - Implement cron job or queue system
   - Handle delivery tracking and retries

2. **Email Templates**:
   - Daily Briefing template
   - Weekly Performance template
   - Territory Health template
   - Custom Query template

3. **Cron Job Setup**:
   - Background worker to check scheduled reports
   - Send emails at scheduled times
   - Update lastSentAt and nextScheduled
   - Handle failures and retries

### Recommended Approach:

**Using Vercel Cron Jobs (Recommended for Vercel deployments):**
```typescript
// /api/cron/send-reports/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Find reports due to send
  const now = new Date();
  const reports = await prisma.scheduledReport.findMany({
    where: {
      isActive: true,
      nextScheduled: { lte: now },
    },
  });

  // Send each report
  for (const report of reports) {
    await sendReportEmail(report);
    await updateNextScheduled(report);
  }

  return Response.json({ success: true, sent: reports.length });
}
```

**In vercel.json:**
```json
{
  "crons": [{
    "path": "/api/cron/send-reports",
    "schedule": "0 * * * *" // Every hour
  }]
}
```

## Performance Considerations

- Query history is limited to 50 records per user
- Saved queries include usage tracking for analytics
- Indexes on frequently queried fields (userId, tenantId, lastUsedAt)
- Scheduled reports calculated efficiently with proper date logic

## Security Features

- All endpoints require authentication via `getSalesUserContext`
- Users can only access their own queries and reports
- Shared queries visible to all tenant users
- Email validation on report creation
- SQL injection prevented by Prisma ORM

## Testing Checklist

- [x] Create saved query
- [x] Update saved query
- [x] Delete saved query
- [x] Execute saved query
- [x] View query templates
- [x] Track query usage
- [x] View query history
- [x] Create scheduled report
- [x] Update scheduled report
- [x] Pause/resume report
- [x] Delete report
- [ ] Send scheduled email (pending implementation)
- [ ] Email template rendering (pending implementation)

## Future Enhancements

1. **Query Sharing & Collaboration**:
   - Team query library
   - Query versioning
   - Comments on queries

2. **Advanced Scheduling**:
   - Multiple recipients
   - Conditional delivery (only if data changes)
   - Custom triggers (e.g., when revenue drops)

3. **Analytics & Insights**:
   - Most popular queries
   - Query performance metrics
   - Email open/click tracking

4. **AI Enhancements**:
   - Suggest queries based on usage patterns
   - Auto-categorize queries
   - Query optimization suggestions

## Conclusion

Phase 2 implementation successfully delivered:
- ✅ Custom Query Builder with templates and history
- ✅ Saved Queries management (CRUD)
- ✅ Query Templates (10 pre-built)
- ✅ Query History tracking
- ✅ Scheduled Reports UI and API
- ✅ Database schema and migrations
- ✅ Full API implementation
- ✅ UI integration with LeorAI page

**Remaining work**: Email delivery system and templates (estimated 2-3 hours)

The foundation is complete and ready for the email delivery system to be added as a separate task.
