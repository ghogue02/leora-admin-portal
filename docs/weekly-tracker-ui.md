# Weekly Execution Tracker - X/Y/Blank Marking System

## Overview

The Weekly Execution Tracker provides a simple visual system for sales reps to mark account contact outcomes throughout the week, following Travis's specification from the Loom video transcript.

## Components

### 1. ContactOutcomeButtons.tsx

Visual button group for marking contact outcomes on each account.

**Features:**
- **X Button (Blue)**: Mark as "Contacted" - Email, phone, text
- **Y Button (Green)**: Mark as "Visited" - In-person visit
- **Blank Button (Gray)**: Clear any marking
- Date stamp when marked
- Quick notes popup for context
- Toggle behavior: Click same button twice to clear

**Visual States:**
```
Not Marked:  [ X ]  [ Y ]
Contacted:   [🔵 X 1/15]  [ Y ]  [×]
Visited:     [ X ]  [🟢 Y 1/16]  [×]
```

### 2. WeeklyTracker.tsx

Main grid showing all accounts in the current week's call plan.

**Features:**
- Lists all accounts scheduled for the week
- Contact outcome buttons for each account
- Real-time progress updates
- Notes display under each account
- Optimistic UI updates
- Loading states

**Layout:**
```
┌─────────────────────────────────────────┐
│ Weekly Execution Tracker                │
├─────────────────────────────────────────┤
│ ABC Wine Shop                [X] [Y]    │
│ Portland, OR                            │
│ "Discussed new Pinot releases"          │
├─────────────────────────────────────────┤
│ XYZ Liquor                   [X] [Y]    │
│ Seattle, WA                             │
└─────────────────────────────────────────┘
```

### 3. WeeklyProgress.tsx

Progress tracking and visualization component.

**Features:**
- Overall completion percentage
- Breakdown by outcome type (X/Y/Not Reached)
- Visual progress bar
- Management view with team performance
- Color-coded statistics

**Display:**
```
Progress: ████████░░ 80%

Contacted (X): 12  |  Visited (Y): 8  |  Not Reached: 5
    48%                   32%                20%
```

### 4. API Endpoints

#### GET `/api/sales/call-plan/tracker`

Fetch all accounts in current week with outcomes.

**Query Parameters:**
- `weekStart`: ISO date string (e.g., "2024-01-15")

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "name": "ABC Wine Shop",
      "city": "Portland",
      "state": "OR",
      "outcome": "contacted",
      "markedAt": "2024-01-15T10:30:00Z",
      "notes": "Discussed new releases",
      "taskId": "task-uuid"
    }
  ],
  "callPlanId": "plan-uuid",
  "weekStart": "2024-01-15T00:00:00Z",
  "weekEnd": "2024-01-21T23:59:59Z"
}
```

#### POST `/api/sales/call-plan/tracker/outcome`

Update contact outcome for an account.

**Request Body:**
```json
{
  "accountId": "uuid",
  "weekStart": "2024-01-15",
  "outcome": "contacted" | "visited" | null,
  "notes": "Optional notes",
  "markedAt": "2024-01-15T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "task": { /* updated task object */ }
}
```

## Data Storage

Currently using Task description field with embedded markers:

```
Format: [outcome:contacted:2024-01-15T10:30:00Z] Notes go here
```

**Future Enhancement:** Add dedicated fields to Task model:
```prisma
model Task {
  // ... existing fields
  contactOutcome String?  // "contacted" | "visited"
  outcomeMarkedAt DateTime?
  outcomeNotes String?
}
```

## User Workflow

1. **View Week**: Rep sees list of all accounts scheduled this week
2. **Mark Contact**:
   - Click X for phone/email/text contact
   - Click Y for in-person visit
   - Optional: Add quick notes in popup
3. **Track Progress**: Visual progress bar shows % completion
4. **Clear if Needed**: Click same button again or use × to clear
5. **Management View**: Managers see all reps' progress side-by-side

## Integration with Call Plan

The weekly tracker integrates with existing CallPlan and Task models:

- Reads from `CallPlan.tasks` for the current week
- Updates `Task.description` with outcome markers
- Sets `Task.status` to COMPLETED when marked
- Preserves existing activity type and customer data

## Visual Design

**Color Scheme:**
- Contacted (X): Blue (#3B82F6)
- Visited (Y): Green (#10B981)
- Not Reached: Gray (#6B7280)
- Progress Bar: Blue-to-Green gradient

**Icons:**
- Phone icon for "Contacted"
- Users icon for "Visited"
- Circle icon for "Not Reached"

## Management Features

For sales managers, the WeeklyProgress component includes:

1. **Team Overview**: See all reps' progress at once
2. **Performance Metrics**: Contact/visit counts per rep
3. **Completion Rates**: Percentage progress for each rep
4. **Visual Comparison**: Side-by-side progress bars

## Testing Notes

Test scenarios:
1. Mark account as contacted → Shows X with date
2. Mark account as visited → Shows Y with date
3. Add notes → Notes appear below buttons
4. Clear marking → Returns to blank state
5. Switch marking → Changes from X to Y or vice versa
6. Weekly rollover → New week shows fresh tracker

## Performance Considerations

- Optimistic UI updates for instant feedback
- Batch progress calculations
- Debounced auto-save for notes
- Cached account lists per week

## Future Enhancements

1. **Database Schema**: Add dedicated contact outcome fields to Task
2. **Activity Feed**: Log all outcome changes with timestamps
3. **Notifications**: Alert managers when reps fall behind
4. **Analytics**: Trend analysis on contact patterns
5. **Mobile App**: Touch-friendly X/Y buttons for field use
6. **Bulk Actions**: Mark multiple accounts at once
7. **Reminders**: Push notifications for unmarked accounts

## Phase 2.3 Completion

✅ ContactOutcomeButtons component created
✅ WeeklyTracker component created
✅ WeeklyProgress component created
✅ API endpoints for tracking implemented
✅ Types defined for contact outcomes
✅ Hooks integration ready
✅ Management view included
✅ Documentation complete

This completes Phase 2.3 of the call planning implementation as specified in Travis's Loom video.
