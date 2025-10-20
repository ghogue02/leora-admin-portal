# Upcoming Calendar Integration Guide

## Files Created

1. **API Endpoint**: `/src/app/api/sales/calendar/upcoming/route.ts`
2. **Component**: `/src/app/sales/dashboard/sections/UpcomingCalendar.tsx`

## Integration Instructions

To add the Upcoming Calendar to the sales dashboard, update the dashboard page:

### Step 1: Import the Component

In `/src/app/sales/dashboard/page.tsx`, add the import:

```typescript
import UpcomingCalendar from "./sections/UpcomingCalendar";
```

### Step 2: Add to the Layout

Add the component to the dashboard layout. For example, you could replace one of the existing sections or add it as a new full-width section:

```typescript
return (
  <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
    <PerformanceMetrics salesRep={salesRep} metrics={metrics} />

    <div className="grid gap-6 lg:grid-cols-2">
      <WeeklyRevenueChart
        currentWeekRevenue={metrics.currentWeek.revenue}
        lastWeekRevenue={metrics.lastWeek.revenue}
        revenueChangePercent={metrics.comparison.revenueChangePercent}
      />
      <CustomerHealthSummary customerHealth={customerHealth} />
    </div>

    {/* Add the Upcoming Calendar here */}
    <UpcomingCalendar />

    <CustomersDueList customers={customersDue} />

    <div className="grid gap-6 lg:grid-cols-2">
      <UpcomingEvents events={upcomingEvents} />
      <TasksList tasks={tasks} />
    </div>
  </main>
);
```

## Features Implemented

### Component Features
- Displays next 7-10 days of scheduled activities
- Color-coded by activity type (Blue: Visits, Purple: Tastings, Green: Calls, Yellow: Events)
- Click to view activity details in a modal
- Quick link to add activities via the Call Plan
- Responsive design with Tailwind CSS
- Loading states and empty states
- Customer name links to customer detail pages

### API Endpoint Features
- GET endpoint at `/api/sales/calendar/upcoming`
- Query parameter: `days` (default: 10, max: 14)
- Filters by current user (session.user.id)
- Only shows pending and in-progress tasks
- Includes customer information
- Groups activities by date
- Sorts by time within each day
- Automatically infers activity type from task title

## Data Flow

1. Component loads and fetches from `/api/sales/calendar/upcoming?days=10`
2. API queries the `Task` table with filters:
   - `tenantId` (from session)
   - `userId` (from session)
   - `dueAt` (between today and +10 days)
   - `status` (PENDING or IN_PROGRESS)
3. API groups tasks by date and returns structured response
4. Component renders activities grouped by day with color coding

## Response Format

```typescript
{
  "days": [
    {
      "date": "2025-10-21",
      "dayName": "Monday",
      "dayOfMonth": "21",
      "month": "Oct",
      "activities": [
        {
          "id": "uuid",
          "time": "09:00",
          "title": "Customer Visit",
          "customer": "Regiis Ova Bar",
          "customerId": "uuid",
          "type": "visit",
          "status": "pending",
          "description": "Quarterly check-in"
        }
      ]
    }
  ],
  "totalActivities": 5
}
```

## Activity Type Detection

The API automatically detects activity types based on task title keywords:
- Contains "visit" → type: "visit" (Blue)
- Contains "tasting" → type: "tasting" (Purple)
- Contains "call" → type: "call" (Green)
- Contains "event" → type: "event" (Yellow)
- Default → type: "call" (Green)

## Styling

All styling uses Tailwind CSS classes consistent with the existing dashboard:
- Card component with border and shadow
- Color-coded badges for activity types
- Hover effects on interactive elements
- Responsive grid layout
- Loading skeleton states

## Testing

To test the component:

1. Ensure you have tasks in the database with `dueAt` dates in the next 10 days
2. Navigate to the sales dashboard
3. The calendar should display your upcoming activities
4. Click on an activity to see details
5. Click "Add Activity" to navigate to the call plan
