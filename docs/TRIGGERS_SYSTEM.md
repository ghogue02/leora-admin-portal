# Automated Triggers System

## Overview

The Automated Triggers system automatically creates tasks based on customer behavior, sample tracking, and ordering patterns. This reduces manual follow-up work and ensures no opportunities are missed.

## Features

- **4 Trigger Types**: Sample follow-ups, first order thank you, customer timing, and burn rate alerts
- **Configurable Rules**: Each trigger can be customized with timing, priority, and task templates
- **Statistics Tracking**: Monitor task creation, completion rates, and trigger performance
- **Background Processing**: Scheduled job runs automatically to evaluate triggers
- **Admin UI**: Complete interface for managing triggers and viewing triggered tasks

## Architecture

### Database Schema

**AutomatedTrigger Model:**
```prisma
model AutomatedTrigger {
  id          String      @id @default(uuid())
  tenantId    String
  triggerType TriggerType
  name        String
  description String?
  isActive    Boolean     @default(true)
  config      Json        // Configuration for trigger behavior
  createdAt   DateTime
  updatedAt   DateTime
}
```

**TriggeredTask Model:**
```prisma
model TriggeredTask {
  id          String    @id @default(uuid())
  tenantId    String
  triggerId   String
  taskId      String
  customerId  String
  triggeredAt DateTime  @default(now())
  completedAt DateTime?
}
```

**Customer Addition:**
- `doNotContactUntil DateTime?` - Prevents tasks until specified date

### Trigger Types

#### 1. SAMPLE_NO_ORDER
**Purpose:** Follow up on samples that haven't resulted in orders

**Configuration:**
```json
{
  "daysAfter": 7,
  "priority": "MEDIUM",
  "taskTitle": "Follow up on sample tasting",
  "taskDescription": "Customer tasted a sample but hasn't ordered yet"
}
```

**Logic:**
- Finds samples tasted X days ago
- No follow-up yet (`followedUpAt` is null)
- No resulting order (`resultedInOrder` is false)
- Creates task assigned to customer's sales rep
- Marks sample as followed up

#### 2. FIRST_ORDER_FOLLOWUP
**Purpose:** Thank customers after their first order

**Configuration:**
```json
{
  "daysAfter": 1,
  "priority": "HIGH",
  "taskTitle": "Thank you call for first order",
  "taskDescription": "First order delivered - call to ensure satisfaction"
}
```

**Logic:**
- Finds orders marked as `isFirstOrder: true`
- Delivered X days ago
- Creates high-priority thank you task
- Builds customer relationship

#### 3. CUSTOMER_TIMING
**Purpose:** Respect customer contact preferences

**Configuration:**
```json
{
  "priority": "MEDIUM",
  "taskTitle": "Contact customer",
  "taskDescription": "Customer's 'do not contact until' date has passed"
}
```

**Logic:**
- Finds customers with `doNotContactUntil <= today`
- Creates contact task
- Clears the `doNotContactUntil` date
- Prevents duplicate tasks

#### 4. BURN_RATE_ALERT
**Purpose:** Proactive reorder reminders based on customer patterns

**Configuration:**
```json
{
  "percentageThreshold": 20,
  "priority": "MEDIUM",
  "taskTitle": "Reorder check-in",
  "taskDescription": "Customer may be due for reorder"
}
```

**Logic:**
- Uses `averageOrderIntervalDays` and `nextExpectedOrderDate`
- Calculates grace period (e.g., 20% of interval)
- Alerts when customer is past expected date + grace period
- Prevents duplicate alerts within 30 days

### Core Service (`/src/lib/automated-triggers.ts`)

**Main Functions:**

```typescript
// Process all active triggers
processTriggers(db, tenantId): Promise<ProcessResult[]>

// Process individual trigger types
processSampleNoOrderTrigger(db, trigger): Promise<number>
processFirstOrderFollowup(db, trigger): Promise<number>
processCustomerTimingTrigger(db, trigger): Promise<number>
processBurnRateAlert(db, trigger): Promise<number>

// Create triggered task
createTriggeredTask(db, trigger, customerId, taskData): Promise<Task>

// Get statistics
getTriggerStatistics(db, tenantId, triggerId): Promise<Statistics>
```

### Background Job (`/src/jobs/process-triggers.ts`)

**Usage:**

```bash
# Process specific tenant
ts-node src/jobs/process-triggers.ts <tenantId>

# Process all tenants
ts-node src/jobs/process-triggers.ts
```

**Recommended Schedule:**
- Run every 6 hours (via cron or scheduler)
- Or daily at off-peak hours

**Example Cron:**
```bash
# Every 6 hours
0 */6 * * * cd /path/to/app && ts-node src/jobs/process-triggers.ts
```

## API Endpoints

### List Triggers
```
GET /api/admin/triggers
Response: { triggers: AutomatedTrigger[], total: number }
```

### Create Trigger
```
POST /api/admin/triggers
Body: {
  triggerType: "SAMPLE_NO_ORDER",
  name: "Sample Follow-up (7 days)",
  description: "...",
  config: { daysAfter: 7, priority: "MEDIUM" },
  isActive: true
}
Response: AutomatedTrigger
```

### Get Trigger
```
GET /api/admin/triggers/[id]
Response: AutomatedTrigger with statistics
```

### Update Trigger
```
PATCH /api/admin/triggers/[id]
Body: { name?, description?, config?, isActive? }
Response: AutomatedTrigger
```

### Deactivate Trigger
```
DELETE /api/admin/triggers/[id]
Response: { message, trigger }
```

### List Triggered Tasks
```
GET /api/admin/triggers/[id]/tasks?status=PENDING&limit=50&offset=0
Response: { tasks: TriggeredTask[], pagination: {...} }
```

### Manual Trigger Processing
```
POST /api/jobs/process-triggers?tenantId=<id>
Response: {
  success: boolean,
  tenantsProcessed: number,
  totalTasksCreated: number,
  results: ProcessResult[]
}
```

## Admin UI

### Triggers Page (`/sales/admin/triggers`)

**Features:**
- List all active and inactive triggers
- View trigger statistics (tasks created, completion rate)
- Create new triggers
- Edit trigger configuration
- Enable/disable triggers
- View triggered tasks
- Manually run trigger processing

**Components:**

1. **TriggerCard** - Display trigger with statistics and actions
2. **TriggerForm** - Create/edit trigger configuration
3. **TriggerConfigEditor** - Edit trigger-specific config (days, priority, templates)
4. **TriggeredTasksList** - View all tasks created by a trigger

## Seed Data

### Default Triggers

Run to create 4 default triggers:

```bash
ts-node scripts/seed-default-triggers.ts <tenantId>
```

**Creates:**
1. Sample Follow-up (7 days) - MEDIUM priority
2. Sample Follow-up (30 days) - LOW priority
3. First Order Thank You (1 day) - HIGH priority
4. Reorder Check-in (20% threshold) - MEDIUM priority

### Feedback Templates

The seed script also creates 13 sample feedback templates:

**Positive:**
- Loved it
- Great quality
- Perfect for menu
- Good value
- Customers will love this

**Negative:**
- Too expensive
- Not their style
- Quality concerns
- Already have similar

**Neutral:**
- Will consider
- Need to think about it
- Maybe for next season
- Interested but timing not right

## Testing

### Unit Tests (`/src/lib/__tests__/automated-triggers.test.ts`)

**Coverage:**
- Sample no order trigger logic
- First order follow-up detection
- Customer timing trigger
- Burn rate calculations
- Statistics calculations
- Duplicate prevention

**Run Tests:**
```bash
npm test automated-triggers
```

## Usage Examples

### Creating a Custom Trigger

```typescript
const response = await fetch('/api/admin/triggers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    triggerType: 'SAMPLE_NO_ORDER',
    name: 'Quick Sample Follow-up (3 days)',
    description: 'Faster follow-up for premium samples',
    config: {
      daysAfter: 3,
      priority: 'HIGH',
      taskTitle: 'Premium sample follow-up',
      taskDescription: 'Follow up on premium wine sample'
    },
    isActive: true
  })
});
```

### Setting Customer Contact Timing

```typescript
await prisma.customer.update({
  where: { id: customerId },
  data: {
    doNotContactUntil: new Date('2025-12-01') // Wait until December
  }
});
```

### Manually Processing Triggers

```typescript
const response = await fetch('/api/jobs/process-triggers', {
  method: 'POST'
});
const result = await response.json();
console.log(`Created ${result.totalTasksCreated} tasks`);
```

## Performance Considerations

### Duplicate Prevention
- Each trigger checks for existing TriggeredTask records
- Prevents multiple tasks for the same event
- Uses indexed queries for fast lookups

### Efficient Queries
- Indexed on `tenantId`, `triggerId`, `customerId`, `triggeredAt`
- Date range filters to limit dataset size
- Batch processing with pagination support

### Scalability
- Process per-tenant to isolate failures
- Configurable batch sizes
- Async processing with job queue support

## Audit Logging

All trigger actions are logged:

- Trigger creation/updates/deletion
- Task creation via triggers
- Job execution results
- Error tracking

## Best Practices

1. **Start Conservative**: Begin with longer timeframes (7+ days) and adjust based on results
2. **Monitor Completion Rates**: Low completion rates may indicate too many tasks
3. **Use Appropriate Priorities**: Reserve HIGH for time-sensitive actions
4. **Customize Templates**: Personalize task titles and descriptions for your workflow
5. **Test Before Activating**: Create triggers as inactive, test, then activate
6. **Review Statistics**: Regularly check trigger performance and adjust configs

## Troubleshooting

### No Tasks Being Created

**Check:**
1. Trigger is active (`isActive: true`)
2. Configuration is correct (days, thresholds)
3. Background job is running
4. Customer data meets trigger conditions
5. No duplicate TriggeredTask records

### Too Many Tasks

**Solutions:**
1. Increase `daysAfter` values
2. Lower priority to reduce urgency
3. Add filters to trigger logic
4. Deactivate overly aggressive triggers

### Tasks Not Assigned

**Verify:**
1. Customer has `salesRepId` set
2. Sales rep has valid `userId`
3. User account is active

## Future Enhancements

- [ ] Email notifications for triggered tasks
- [ ] Trigger conditions builder UI
- [ ] A/B testing different trigger configs
- [ ] Predictive analytics for optimal timing
- [ ] Custom trigger types via plugins
- [ ] Workflow automation integration
- [ ] Mobile app notifications

## Related Documentation

- [Sample Tracking System](./SAMPLES_TRACKING.md)
- [Task Management](./TASKS.md)
- [Customer Analytics](./CUSTOMER_ANALYTICS.md)
- [API Reference](./API_REFERENCE.md)
