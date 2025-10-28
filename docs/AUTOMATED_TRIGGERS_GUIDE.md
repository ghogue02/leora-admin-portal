# Automated Triggers Guide

## Overview

Automated triggers create tasks automatically based on customer behavior and time-based rules. Never miss a follow-up, celebration, or opportunity again. Triggers ensure consistent customer engagement and maximize conversion from samples and orders.

## What Are Triggers?

Triggers are automated workflows that:
- Monitor customer activity (or lack thereof)
- Detect specific conditions (time passed, orders placed, samples given)
- Automatically create tasks for sales reps
- Send notifications and reminders
- Ensure consistent follow-up

**Example**: When a customer receives a sample but doesn't order within 7 days, automatically create a follow-up call task.

## Trigger Types

### 1. Sample No Order Trigger

**What it does**: Creates a follow-up task when a sample doesn't convert to an order

**Conditions**:
- Sample was given to a customer
- X days have passed (configurable, default: 7 days)
- Customer has NOT placed an order for that SKU
- No follow-up task already exists

**Recommended Settings**:
- **Days to wait**: 3-7 days (depending on product type)
- **Activity type**: Phone call or In-person visit
- **Task priority**: Medium
- **Task description**: "Follow up on [Product Name] sample tasting from [Date]"

**Use Cases**:
- Quick follow-up on premium products (3-5 days)
- Standard follow-up on regular products (7 days)
- Gentle nudge on value products (10-14 days)

**Example Workflow**:
```
Day 0: Rep gives sample of Chardonnay to Wine Bar ABC
Day 7: No order placed
→ Trigger fires
→ Task created: "Call Wine Bar ABC about Chardonnay sample"
→ Rep receives notification
Day 8: Rep makes call, logs activity
```

### 2. First Order Trigger

**What it does**: Creates a thank you task when a customer places their first order

**Conditions**:
- Customer places an order
- It's their FIRST order ever, OR
- It's their first order in X months (configurable)

**Recommended Settings**:
- **Days after order**: 1-2 days (strike while iron is hot)
- **Activity type**: Phone call or Email
- **Task priority**: High
- **Task description**: "Thank [Customer] for first order, confirm delivery expectations"

**Use Cases**:
- Welcome new customers warmly
- Set expectations for delivery and support
- Ask about their experience
- Upsell or cross-sell related products
- Request referrals

**Example Workflow**:
```
Day 0: New customer "Joe's Bistro" places first order ($850)
Day 1: Trigger fires
→ Task created: "Thank Joe's Bistro for first order"
→ Rep receives notification
Day 2: Rep calls, thanks them, confirms delivery
→ Customer feels appreciated
→ Sets tone for relationship
```

### 3. Customer Timing Trigger

**What it does**: Prompts contact based on customer's regular ordering pattern

**Conditions**:
- Customer has established ordering frequency
- Expected re-order date is approaching
- No recent contact in X days

**Recommended Settings**:
- **Days before expected order**: 3-5 days
- **Activity type**: Email or Phone call
- **Task priority**: Medium
- **Task description**: "Proactive outreach to [Customer] - re-order expected soon"

**Use Cases**:
- Bi-weekly customers: Reach out every 10-12 days
- Monthly customers: Contact 25-27 days after last order
- Seasonal customers: Contact as season approaches

**Example Workflow**:
```
Customer "Wine Emporium" orders every 14 days
Day 10: Trigger fires (4 days before expected re-order)
→ Task created: "Contact Wine Emporium - re-order due"
→ Rep reaches out proactively
→ Takes order before customer calls competitor
```

### 4. Burn Rate Trigger

**What it does**: Alerts when a customer's order frequency changes significantly

**Conditions**:
- Customer's order frequency decreases by X% (configurable)
- No order in X days beyond normal pattern
- Trend analysis shows declining engagement

**Recommended Settings**:
- **Threshold**: 30% decrease in frequency
- **Activity type**: In-person visit (serious situation)
- **Task priority**: High
- **Task description**: "Check in with [Customer] - ordering pattern has changed"

**Use Cases**:
- Detect customers at risk of churning
- Identify competitive threats
- Catch operational issues (new buyer, budget cuts)
- Maintain high-value relationships

**Example Workflow**:
```
Customer "Bistro 54" normally orders every 7 days
Day 14: No order (double normal frequency)
→ Trigger fires
→ High-priority task: "Visit Bistro 54 - significant order delay"
→ Rep visits, discovers new chef with different preferences
→ Rep samples appropriate products, wins chef over
→ Relationship saved
```

## Configuration

### Accessing Trigger Settings

1. Navigate to **Sales > Settings > Triggers**
2. Or: **Admin > Sales Automation > Triggers** (admin access required)

### Creating a New Trigger

1. Click **"Add Trigger"**
2. Select trigger type
3. Configure settings:
   - **Name**: Descriptive name for the trigger
   - **Enabled**: Active or inactive
   - **Conditions**: When it should fire
   - **Days**: Time delay before triggering
   - **Activity Type**: Type of task to create
   - **Priority**: Task priority level
   - **Assign To**: Sales rep (auto-assigns to account owner by default)
   - **Description Template**: Task description

4. Click **"Save"**

### Editing Existing Triggers

1. Navigate to **Sales > Settings > Triggers**
2. Click the trigger to edit
3. Modify settings
4. Click **"Update"**
5. Confirm that active tasks will not be affected (only future triggers)

### Disabling Triggers

1. Find the trigger in the list
2. Toggle **"Enabled"** to OFF
3. Confirm
4. Existing tasks remain, but no new tasks will be created

## Customization

### Adjusting Days

**Sample No Order Trigger**:
- **Premium wines**: 3-5 days (customers make quicker decisions)
- **Standard wines**: 7-10 days (allow time to consider)
- **Value wines**: 10-14 days (longer sales cycle)

**First Order Trigger**:
- **Large orders**: 1 day (immediate gratitude)
- **Small orders**: 2-3 days (still prompt, less urgent)

**Customer Timing Trigger**:
- **Frequent buyers**: 3-5 days before expected re-order
- **Monthly buyers**: 5-7 days before expected date
- **Quarterly buyers**: 10-14 days before expected date

### Activity Types

Choose the most appropriate activity type for each trigger:

**Phone Call**:
- Quick follow-ups
- Relationship maintenance
- Immediate response needed

**Email**:
- Less urgent contact
- Customers who prefer email
- Information sharing

**In-Person Visit**:
- High-value customers
- Problem situations
- New customer welcome

**Text/SMS**:
- Very quick follow-ups
- Customers who prefer texting
- Informal relationships

### Task Priorities

**High Priority**:
- First order thank you
- Burn rate alerts
- At-risk customer situations

**Medium Priority**:
- Sample follow-ups
- Routine timing triggers
- Standard check-ins

**Low Priority**:
- Long-term follow-ups
- Informational tasks
- Low-value accounts

### Description Templates

Use placeholders for dynamic content:

**Available Placeholders**:
- `{customer}`: Customer name
- `{product}`: Product name
- `{date}`: Original activity date
- `{days}`: Days since activity
- `{rep}`: Sales rep name

**Template Examples**:

**Sample No Order**:
```
Follow up on {product} sample from {date}.
It's been {days} days - gauge interest, address concerns,
close the sale.
```

**First Order**:
```
Thank {customer} for their first order! Confirm delivery
expectations, answer questions, and explore additional
product interest.
```

**Customer Timing**:
```
Proactive outreach to {customer}. Based on ordering
history, they typically re-order around now. Take order
before they call competitor.
```

**Burn Rate**:
```
URGENT: {customer} ordering pattern has changed
significantly. Visit ASAP to identify issues and
maintain relationship.
```

## Monitoring Triggered Tasks

### Viewing Triggered Tasks

1. Navigate to **Sales > Tasks**
2. Filter by **"Source: Automated"**
3. See all trigger-generated tasks

**Columns Displayed**:
- Task description
- Customer
- Type (phone, visit, email)
- Priority
- Due date
- Trigger source (which trigger created it)
- Status (pending, completed, canceled)

### Task Management

**Completing a Triggered Task**:
1. Click the task
2. Log the activity (call made, visit completed, email sent)
3. Add notes about outcome
4. Mark complete

**Canceling a Triggered Task**:
- If no longer relevant (customer already contacted)
- Click task > "Cancel"
- Add reason for cancellation
- Trigger won't re-create for same event

**Rescheduling**:
- Change due date if needed
- Add note explaining why
- Complete when action is taken

### Dashboard View

**Trigger Effectiveness Dashboard**:
1. Navigate to **Sales > Analytics > Triggers**
2. View metrics:
   - Triggers fired (by type)
   - Tasks created
   - Task completion rate
   - Conversion rate after triggered task
   - Average time to complete triggered tasks

## Effectiveness Measurement

### Key Metrics

**Trigger Fire Rate**:
- How often each trigger is activated
- Helps identify most common scenarios

**Task Completion Rate**:
- Percentage of triggered tasks completed
- Low rate may indicate too many triggers or low priority

**Conversion After Trigger**:
- For sample triggers: Did follow-up lead to order?
- For timing triggers: Did customer place expected order?

**Average Response Time**:
- How quickly reps complete triggered tasks
- Measure of team responsiveness

### Performance by Trigger Type

| Trigger Type | Fire Rate | Completion | Conversion | Avg Response |
|--------------|-----------|------------|------------|--------------|
| Sample No Order | High | 85% | 35% | 1.2 days |
| First Order | Medium | 95% | N/A | 0.8 days |
| Customer Timing | Medium | 78% | 60% | 2.1 days |
| Burn Rate | Low | 100% | 45% | 0.5 days |

**Interpreting**:
- **High fire rate + low completion**: Too aggressive, adjust days
- **High completion + low conversion**: Wrong timing or approach
- **High response time**: Reps not seeing notifications

### A/B Testing Triggers

**Test Scenario**: Does 5-day or 7-day sample follow-up convert better?

**Method**:
1. Create two triggers with different day settings
2. Randomly assign customers to each (or split by rep)
3. Run for 30-60 days
4. Compare conversion rates

**Example Results**:
- 5-day trigger: 42% conversion, 90% task completion
- 7-day trigger: 38% conversion, 85% task completion
- **Conclusion**: 5-day is more effective, implement widely

## Best Practices

### 1. Start Simple

**Don't activate all triggers at once**:
- Week 1: Enable "First Order" trigger only
- Week 2-3: Monitor and refine
- Week 4: Add "Sample No Order" trigger
- Month 2: Add remaining triggers

**Why**: Prevents overwhelming reps with too many tasks

### 2. Adjust Based on Rep Feedback

**Listen to your team**:
- "Too many tasks" → Increase days before trigger
- "Customers aren't ready" → Longer delay
- "Missing opportunities" → Shorter delay or new trigger type

### 3. Segment by Customer Type

**Different customers need different timing**:

**High-Touch Customers** (high value, frequent orders):
- Shorter trigger delays
- Higher task priority
- In-person activities

**Low-Touch Customers** (lower value, infrequent):
- Longer trigger delays
- Lower task priority
- Email activities

**Implementation**: Create separate triggers for each customer segment

### 4. Align with Sales Process

**Map triggers to your sales methodology**:

**If you follow a 3-touch rule**:
- Trigger 1: Day 5 sample follow-up (first touch)
- Trigger 2: Day 12 if no response (second touch)
- Trigger 3: Day 21 final attempt (third touch)

### 5. Prevent Trigger Fatigue

**Too many triggers = ignored tasks**

**Limits to set**:
- Max 1 triggered task per customer per week
- Max 5 triggered tasks per rep per day
- Suppress triggers during holidays or customer closures

**Configuration**:
1. Settings > Triggers > Advanced
2. Set "Maximum Triggers per Customer per Week": 1
3. Set "Maximum Triggers per Rep per Day": 5
4. Add holiday calendar exclusions

### 6. Use Triggers to Build Habits

**Consistency is key**:
- Triggers ensure every sample gets a follow-up
- No customer is forgotten
- New reps follow proven process
- Veteran reps stay consistent

**Training**:
- Show new reps the triggered task list
- Explain why each trigger exists
- Demonstrate how to complete and log tasks
- Monitor completion rates during onboarding

## Common Issues and Solutions

### "Too Many Tasks"

**Problem**: Reps overwhelmed by triggered tasks

**Solutions**:
1. Increase days before trigger (give more time)
2. Increase task priority threshold (only urgent tasks)
3. Limit triggers per day/week
4. Disable less effective triggers
5. Batch similar tasks together

### "Tasks Fire Too Early"

**Problem**: Customers not ready when rep follows up

**Solutions**:
1. Increase days for that trigger type
2. A/B test different day settings
3. Segment by product type (premium needs less time)
4. Review conversion timing data

### "Tasks Fire Too Late"

**Problem**: Customers already ordered from competitor

**Solutions**:
1. Decrease days for that trigger type
2. Review "time to conversion" analytics
3. Create urgency-based triggers (sample expensive products faster)

### "Triggers Not Creating Tasks"

**Problem**: Expected trigger didn't fire

**Checks**:
1. Is the trigger enabled?
2. Do the conditions match? (e.g., exact SKU, timeframe)
3. Was a task already created? (won't duplicate)
4. Check trigger logs: Admin > Triggers > Logs

### "Duplicate Tasks"

**Problem**: Multiple tasks for same customer/situation

**Solutions**:
1. System should prevent duplicates - check settings
2. Ensure triggers have different conditions
3. Review trigger logs to identify source
4. Contact support if issue persists

## Advanced Features

### Trigger Chains

**Upcoming Feature**: One trigger spawns another

**Example**:
```
Trigger 1: Sample No Order (Day 7) → Create call task
↓ (if task not completed in 3 days)
Trigger 2: Escalation → Create in-person visit task (higher priority)
↓ (if visit completed)
Trigger 3: Thank You → Create thank you email task
```

### AI-Optimized Triggers

**Upcoming Feature**: AI determines optimal trigger timing

**How it works**:
- Analyzes historical conversion data
- Identifies patterns by customer type, product, season
- Automatically adjusts trigger days for maximum conversion
- Continuously learns and improves

### Multi-Condition Triggers

**Upcoming Feature**: Triggers based on complex conditions

**Example**:
```
Trigger: Sample No Order + Customer Inactive
Conditions:
- Sample given
- No order in 7 days, AND
- No activity logged in 30 days
→ High-priority "Re-engage customer" task
```

## Related Documentation

- [Sample Management Guide](./SAMPLE_MANAGEMENT_GUIDE.md) - Sample tracking fundamentals
- [Sample Analytics Guide](./SAMPLE_ANALYTICS_GUIDE.md) - Measure trigger effectiveness
- [Samples Quick Reference](./SAMPLES_QUICK_REFERENCE.md) - Quick reference
- [API Reference](./API_REFERENCE.md) - Trigger API documentation

## Support

- **In-app help**: Click the ? icon
- **Training**: Trigger setup videos in Help Center
- **Customization**: Contact your admin for custom triggers
- **Technical support**: support@yourcompany.com
