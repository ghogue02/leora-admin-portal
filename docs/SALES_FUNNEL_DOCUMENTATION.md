# Sales Funnel & Lead Management System Documentation

## Overview

The Sales Funnel & Lead Management System is a comprehensive solution for tracking leads through the entire sales lifecycle, from initial contact to closed deal. It provides visual pipeline management, conversion tracking, and detailed analytics.

## Features

### 1. Lead Management
- **Lead Entry Form**: Capture comprehensive lead information
  - Company and contact details
  - Lead source tracking (referral, cold call, event, website, etc.)
  - Interest level classification (hot, warm, cold)
  - Product interest tracking
  - Estimated deal value
  - Assignment to sales representatives
  - Custom notes

- **Lead List View**:
  - Searchable and filterable lead list
  - Filter by stage, source, interest level, and assigned rep
  - Quick view of key metrics
  - Edit and delete capabilities

- **Lead Lifecycle Tracking**:
  - Complete history of stage transitions
  - Track who moved leads and when
  - Notes on each stage change
  - Win/loss reason capture

### 2. Sales Funnel Visualization

#### Kanban Board
- **6 Funnel Stages**:
  1. **Lead**: Initial contact/inquiry
  2. **Qualified**: Lead meets criteria
  3. **Proposal**: Quote/proposal sent
  4. **Negotiation**: Active discussions
  5. **Closed Won**: Deal secured
  6. **Closed Lost**: Deal lost

- **Drag & Drop**: Move leads between stages visually
- **Stage Metrics**: Count and total value per stage
- **Lead Cards**: Display key information at a glance
- **Days in Stage**: Track how long leads stay in each stage

### 3. Conversion Tracking

The system automatically tracks:
- **Lead → Qualified** conversion rate
- **Qualified → Proposal** conversion rate
- **Proposal → Closed Won** conversion rate
- **Overall Win Rate** across all stages
- **Average Time in Each Stage**
- **Average Days to Close**

### 4. Pipeline Reporting

#### Key Metrics Dashboard
- **Total Leads**: Current pipeline count
- **Total Pipeline Value**: Sum of all estimated values
- **Weighted Forecast**: Probability-weighted revenue forecast
  - Lead: 10% weight
  - Qualified: 25% weight
  - Proposal: 50% weight
  - Negotiation: 75% weight
  - Closed Won: 100% weight
- **Average Days to Close**: Time from lead to close

#### Conversion Funnel Chart
Visual representation showing:
- Percentage at each stage
- Drop-off rates between stages
- Bottleneck identification

#### Stage Performance
- Average time spent in each stage
- Aging deals report
- Stage health indicators

### 5. Rep Performance Analytics

Track performance by sales representative:
- Leads assigned vs. closed
- Win rate by rep
- Average deal size
- Time to close
- Pipeline value by rep

## Technical Architecture

### Database Models

#### Lead Model
```typescript
{
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  leadSource: LeadSource;
  interestLevel: InterestLevel;
  estimatedValue?: number;
  productsInterested?: string[];
  assignedRepId?: string;
  currentStage: FunnelStage;
  notes?: string;
  convertedToCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### LeadStageHistory Model
```typescript
{
  id: string;
  leadId: string;
  stage: FunnelStage;
  enteredAt: Date;
  exitedAt?: Date;
  movedBy: string;
  notes?: string;
  winLossReason?: string;
}
```

### API Routes

#### Lead Management
- `GET /api/sales/leads` - List all leads with filters
- `POST /api/sales/leads` - Create new lead
- `GET /api/sales/leads/[id]` - Get lead details
- `PATCH /api/sales/leads/[id]` - Update lead
- `DELETE /api/sales/leads/[id]` - Soft delete lead
- `PATCH /api/sales/leads/[id]/stage` - Update lead stage
- `GET /api/sales/leads/[id]/history` - Get stage history

#### Pipeline Analytics
- `GET /api/sales/funnel/metrics` - Get pipeline metrics
  - Query params: `assignedRepId`, `startDate`, `endDate`

#### Supporting Data
- `GET /api/sales/reps` - List sales representatives
- `GET /api/sales/products` - List products

### Components

#### LeadForm
Comprehensive form for creating and editing leads with validation.

#### LeadCard
Reusable card component displaying lead summary with drag-and-drop support.

#### FunnelBoard
Kanban-style board with 6 columns for funnel stages and drag-and-drop functionality.

#### PipelineMetrics
Dashboard displaying all key metrics, conversion rates, and funnel visualization.

### Pages

#### /sales/leads
Lead management interface with:
- Lead list view
- Search and filtering
- Create/edit modal
- Summary statistics

#### /sales/funnel
Visual pipeline management with:
- Kanban board
- Metrics dashboard
- Pipeline export
- Filtering by rep and date range

## Forecasting Algorithm

The system uses a weighted forecast approach:

```typescript
weightedValue = Σ (estimatedValue × stageWeight)

Stage Weights:
- Lead: 10%
- Qualified: 25%
- Proposal: 50%
- Negotiation: 75%
- Closed Won: 100%
- Closed Lost: 0%
```

This provides a more realistic revenue forecast based on stage progression probability.

## Usage Guide

### Creating a New Lead

1. Navigate to `/sales/leads`
2. Click "Add New Lead"
3. Fill in required information:
   - Company name
   - Contact name
   - Email
   - Lead source
   - Interest level
4. Optional fields:
   - Phone
   - Estimated value
   - Products interested
   - Assigned rep
   - Notes
5. Click "Create Lead"

### Moving Leads Through the Funnel

**Option 1: Kanban Board**
1. Navigate to `/sales/funnel`
2. Drag lead card to new stage column
3. Provide reason if closing (won/lost)

**Option 2: Lead Edit**
1. Navigate to `/sales/leads`
2. Click on lead card
3. Edit form opens
4. Update information
5. Click "Update Lead"

### Tracking Performance

1. Navigate to `/sales/funnel`
2. View metrics dashboard:
   - Total pipeline value
   - Weighted forecast
   - Conversion rates
   - Time in stage
3. Filter by:
   - Sales rep
   - Date range
4. Export pipeline to CSV

### Converting Lead to Customer

1. Open lead in edit mode
2. Click "Convert to Customer"
3. Enter customer ID
4. Lead automatically moves to "Closed Won"
5. Conversion tracked in history

## Best Practices

### Lead Qualification
- Always capture lead source for attribution
- Use interest level to prioritize follow-up
- Estimate deal value for accurate forecasting
- Assign to appropriate sales rep quickly

### Stage Management
- Move leads promptly between stages
- Add notes when changing stages
- Capture win/loss reasons for closed deals
- Review aging deals regularly

### Pipeline Health
- Monitor conversion rates between stages
- Identify and address bottlenecks
- Track time in each stage
- Set goals for days to close

### Rep Performance
- Review individual rep metrics weekly
- Compare against team averages
- Identify coaching opportunities
- Recognize top performers

## Metrics Definitions

### Conversion Rates
- **Lead → Qualified**: Percentage of leads that become qualified opportunities
- **Qualified → Proposal**: Percentage that receive formal proposals
- **Proposal → Closed Won**: Percentage that close successfully
- **Overall Win Rate**: Percentage of all closed deals that were won

### Time Metrics
- **Days in Stage**: Time from entering to exiting a stage
- **Average Days to Close**: Time from lead creation to closed won
- **Aging**: Current days in present stage

### Value Metrics
- **Total Pipeline Value**: Sum of all estimated deal values
- **Weighted Forecast**: Probability-adjusted revenue forecast
- **Average Deal Size**: Mean estimated value across all leads

## Database Schema

### Tables Created

#### leads
- Stores all lead information
- Indexed on: tenant_id, current_stage, assigned_rep_id, lead_source, interest_level, created_at

#### lead_stage_history
- Tracks all stage transitions
- Foreign key to leads table
- Cascade delete when lead is deleted

#### sales_reps
- Sales representative information
- Quota and commission tracking

#### products
- Product catalog
- Used for lead interest tracking

## Security

- **Tenant Isolation**: All queries filtered by tenantId
- **Authentication**: Requires valid session
- **Authorization**: Users can only access their tenant's data
- **Input Validation**: All form inputs validated
- **SQL Injection Protection**: Parameterized queries

## Performance Considerations

### Indexing
- All frequently queried fields are indexed
- Composite indexes on common filter combinations
- Foreign keys for referential integrity

### Caching
- Consider implementing Redis for:
  - Metrics calculations
  - Frequently accessed lead lists
  - Sales rep and product lookups

### Optimization
- Pagination for large lead lists
- Lazy loading of stage history
- Debounced search inputs
- Memoized calculations

## Future Enhancements

### Planned Features
1. **Email Integration**: Send automated follow-ups
2. **Task Management**: Link tasks to leads
3. **Calendar Integration**: Schedule meetings
4. **Document Storage**: Attach proposals and contracts
5. **Advanced Analytics**:
   - Territory performance
   - Product mix analysis
   - Seasonal trends
   - Predictive win probability
6. **Mobile App**: On-the-go lead management
7. **Workflow Automation**:
   - Auto-assign leads
   - Stage reminders
   - Activity tracking
8. **Lead Scoring**: AI-powered qualification
9. **Integration**:
   - CRM sync
   - Marketing automation
   - Email providers
10. **Custom Fields**: Tenant-specific lead attributes

## Troubleshooting

### Common Issues

**Leads not appearing**
- Check tenant ID in session
- Verify database connection
- Check filter settings

**Drag-and-drop not working**
- Ensure JavaScript enabled
- Check browser compatibility
- Verify event handlers

**Metrics not calculating**
- Check date range filters
- Verify sufficient data exists
- Review console for errors

**Stage history missing**
- Verify foreign key constraints
- Check cascade delete settings
- Review transaction logs

## Support

For issues or questions:
1. Check this documentation
2. Review console errors
3. Check database logs
4. Contact development team

## Changelog

### Version 1.0.0 (Initial Release)
- Lead management system
- Kanban funnel board
- Conversion tracking
- Pipeline metrics
- Stage history
- Export functionality
- Win/loss tracking
- Rep performance analytics
- Weighted forecasting

---

**Last Updated**: 2025-10-26
**Version**: 1.0.0
**Status**: Production Ready
