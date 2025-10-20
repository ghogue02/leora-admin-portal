# Upcoming Calendar Component - Feature Summary

## File Locations

### API Endpoint
**Path**: `/src/app/api/sales/calendar/upcoming/route.ts`
**Lines**: 101 lines
**Size**: 2.8 KB

### React Component
**Path**: `/src/app/sales/dashboard/sections/UpcomingCalendar.tsx`
**Lines**: 316 lines
**Size**: 12 KB

## Component Architecture

### Key Features

1. **Automatic Data Loading**
   - Fetches upcoming activities on component mount
   - Shows loading skeleton during fetch
   - Handles error states gracefully

2. **Smart Activity Grouping**
   - Groups activities by date
   - Only shows days that have activities
   - Sorts activities by time within each day

3. **Color-Coded Activity Types**
   - **Blue** (bg-blue-500): Customer Visits
   - **Purple** (bg-purple-500): Tastings
   - **Green** (bg-green-500): Calls
   - **Yellow** (bg-yellow-500): Events

4. **Interactive Elements**
   - Click any activity to see full details in modal
   - Customer names link to customer detail pages
   - "Add Activity" button navigates to Call Plan
   - "View in Call Plan" link in activity modal

5. **Responsive Design**
   - Mobile-first approach
   - Adapts to different screen sizes
   - Touch-friendly interaction areas

6. **Empty States**
   - Shows helpful message when no activities
   - Provides quick link to plan activities

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ Upcoming Calendar              [5 activities] [Add] │
│ Next 7-10 days of scheduled activities             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Monday, Oct 21                                      │
│ ─────────────────────────────────────────────────── │
│ ● 09:00  [Visit]  Customer Visit                   │
│         Regiis Ova Bar                              │
│                                                     │
│ ● 14:00  [Tasting]  Wine Tasting Event             │
│         Wine & More                                 │
│                                                     │
│ Tuesday, Oct 22                                     │
│ ─────────────────────────────────────────────────── │
│ ● 10:00  [Call]  Follow-up Call                    │
│         ABC Liquor                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ● Visits  ● Tastings  ● Calls  ● Events            │
└─────────────────────────────────────────────────────┘
```

## Activity Modal

```
┌─────────────────────────────────┐
│ Customer Visit              [×] │
│                                 │
│ Time: 09:00                     │
│ Type: [Visit]                   │
│ Customer: Regiis Ova Bar        │
│ Notes: Quarterly check-in       │
│                                 │
│ [View in Call Plan]    [Close]  │
└─────────────────────────────────┘
```

## API Endpoint Details

### Request
```
GET /api/sales/calendar/upcoming?days=10
```

### Query Parameters
- `days` (optional): Number of days to fetch (default: 10, max: 14)

### Response Structure
```json
{
  "days": [
    {
      "date": "2025-10-21",
      "dayName": "Monday",
      "dayOfMonth": "21",
      "month": "Oct",
      "activities": [
        {
          "id": "task-uuid",
          "time": "09:00",
          "title": "Customer Visit",
          "customer": "Regiis Ova Bar",
          "customerId": "customer-uuid",
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

### Security
- Uses `withSalesSession` middleware for authentication
- Filters by `tenantId` to ensure data isolation
- Only returns tasks for the authenticated user
- Only shows pending and in-progress tasks

## Database Query

The endpoint queries the `Task` table with these filters:

```typescript
{
  where: {
    tenantId: session.tenant.id,
    userId: session.user.id,
    dueAt: {
      gte: today,           // Start of today
      lte: today + 10 days  // End of day 10
    },
    status: {
      in: ["PENDING", "IN_PROGRESS"]
    }
  }
}
```

## Type Safety

Both files use TypeScript with full type definitions:
- API uses Prisma types for database models
- Component defines clear interfaces for props and state
- No `any` types in production code (only in legacy mapping)

## Performance Optimizations

1. **Efficient Data Loading**
   - Single database query with joins
   - Client-side grouping to minimize data transfer

2. **Smart Rendering**
   - Only renders days with activities
   - Conditional rendering for optional fields

3. **Minimal Re-renders**
   - useState for local state management
   - Event handlers properly memoized

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Clear focus indicators
- ARIA labels where needed
- Proper button types

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses standard ES6+ features with Next.js polyfills

## Future Enhancement Ideas

1. Drag-and-drop to reschedule activities
2. Inline editing of activity details
3. Filter by activity type
4. Export calendar to iCal/Google Calendar
5. Recurring activity support
6. Time zone support for multi-region teams
7. Activity reminders/notifications
8. Bulk actions (complete multiple, reschedule batch)

## Maintenance Notes

- Component is self-contained with no external dependencies beyond standard React/Next.js
- Uses existing authentication and database patterns
- Follows project's Tailwind CSS conventions
- Compatible with existing Call Plan functionality
