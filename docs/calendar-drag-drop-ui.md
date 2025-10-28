# Calendar Drag-Drop UI Implementation

## Overview

Built a complete calendar drag-drop interface for scheduling call plan accounts onto calendar slots with FullCalendar integration and real-time updates.

## Architecture

### Components Structure

```
/src/app/sales/calendar/
├── page.tsx                    # Main calendar page with state management
├── components/
│   ├── CalendarView.tsx        # FullCalendar integration with drag-drop
│   ├── CallPlanSidebar.tsx     # Account list with filters and stats
│   └── DraggableAccount.tsx    # Individual draggable account card
```

### API Routes

```
/src/app/api/
├── calendar/events/
│   ├── route.ts                # GET/POST calendar events
│   └── [eventId]/route.ts      # GET/PATCH/DELETE individual event
└── call-plans/active/accounts/
    └── route.ts                # GET current week's call plan accounts
```

### Type Definitions

```
/src/types/calendar.ts          # Calendar event types and drag-drop interfaces
```

## Features Implemented

### 1. CalendarView Component

**Location**: `/src/app/sales/calendar/components/CalendarView.tsx`

**Features**:
- Weekly/monthly calendar views using FullCalendar
- Time grid view (8am-6pm configurable)
- Drag-and-drop from external elements (accounts)
- Event resizing and dragging to reschedule
- Color-coded events by type:
  - Purple: Tastings
  - Blue: Visits
  - Green: Meetings
  - Amber: Calls
- Custom event rendering with customer name and location
- Click to view event details

**Key Methods**:
- `handleDrop()`: Processes account drops onto calendar
- `handleEventChange()`: Updates event times on drag/resize
- `handleEventClick()`: Opens event details
- `handleDateSelect()`: Creates new event on empty slot click

### 2. CallPlanSidebar Component

**Location**: `/src/app/sales/calendar/components/CallPlanSidebar.tsx`

**Features**:
- Live statistics dashboard:
  - Total accounts
  - Scheduled count
  - Unscheduled count
  - High priority count
- Search accounts by name or account number
- Filter controls:
  - Show/hide scheduled accounts
  - Show/hide unscheduled accounts
  - Filter by priority (HIGH/MEDIUM/LOW)
- Scrollable account list
- Visual feedback for empty states

**State Management**:
- `searchQuery`: Text search filter
- `showScheduled`/`showUnscheduled`: Status filters
- `selectedPriorities`: Priority filters

### 3. DraggableAccount Component

**Location**: `/src/app/sales/calendar/components/DraggableAccount.tsx`

**Features**:
- Drag handle with visual feedback
- Color-coded left border by priority:
  - Red: HIGH priority
  - Yellow: MEDIUM priority
  - Green: LOW priority
- Shows account information:
  - Customer name
  - Account number
  - Objective (call plan goal)
  - Location
  - Last order date
- Disabled state for already scheduled accounts
- Visual indicator when account is scheduled
- Hover and active states for better UX

**Drag Behavior**:
- Draggable only if not already scheduled
- Cursor changes: grab → grabbing
- Data transfer includes full account object
- Opacity reduced for scheduled accounts

### 4. Main Calendar Page

**Location**: `/src/app/sales/calendar/page.tsx`

**State Management**:
- `accounts`: Call plan accounts with schedule status
- `events`: Calendar events
- `draggedAccount`: Currently dragging account
- `loading`: Loading state

**Data Flow**:
1. Fetches active call plan accounts on mount
2. Fetches calendar events for current period
3. Marks accounts as scheduled if they have events
4. Updates UI optimistically on event creation
5. Syncs with backend APIs

**Event Handlers**:
- `handleEventCreate()`: Creates new calendar event
- `handleEventUpdate()`: Updates event times
- `handleEventClick()`: Shows event details (TODO: modal)
- `handleDragStart()`: Tracks dragged account

## API Implementation

### GET /api/calendar/events

**Query Parameters**:
- `start` (optional): Filter events after this date
- `end` (optional): Filter events before this date

**Response**:
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Visit: Acme Corp",
      "startTime": "2025-10-25T10:00:00Z",
      "endTime": "2025-10-25T11:00:00Z",
      "eventType": "visit",
      "customerId": "uuid",
      "customerName": "Acme Corp",
      "location": "123 Main St",
      "description": "Product tasting"
    }
  ]
}
```

### POST /api/calendar/events

**Request Body**:
```json
{
  "title": "Visit: Acme Corp",
  "startTime": "2025-10-25T10:00:00Z",
  "endTime": "2025-10-25T11:00:00Z",
  "eventType": "visit",
  "customerId": "uuid",
  "location": "123 Main St",
  "description": "Product tasting"
}
```

**Auto-populated Fields**:
- `tenantId`: From user session
- `userId`: From user session
- `createdAt`: Server timestamp

### PATCH /api/calendar/events/[eventId]

**Request Body** (all fields optional):
```json
{
  "title": "Updated title",
  "startTime": "2025-10-25T11:00:00Z",
  "endTime": "2025-10-25T12:00:00Z"
}
```

### DELETE /api/calendar/events/[eventId]

**Response**:
```json
{
  "success": true
}
```

### GET /api/call-plans/active/accounts

**Description**: Fetches current week's call plan accounts

**Response**:
```json
{
  "accounts": [
    {
      "id": "uuid",
      "customerId": "uuid",
      "customerName": "Acme Corp",
      "accountNumber": "A-12345",
      "accountType": "ACTIVE",
      "priority": "HIGH",
      "objective": "Introduce new product line",
      "lastOrderDate": "2025-10-15T00:00:00Z",
      "location": "123 Main St, City"
    }
  ]
}
```

## Drag-Drop Implementation

### Data Transfer

When dragging an account card:

```typescript
const accountData: DraggableAccountData = {
  id: string;
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  accountType: string | null;
  priority: string;
  objective: string | null;
  lastOrderDate: string | null;
  location: string | null;
};

// Set on drag start
e.dataTransfer.setData("application/json", JSON.stringify(accountData));
```

### Drop Handler

```typescript
// In CalendarView component
const handleDrop = async (info: any) => {
  const accountData = draggedAccount;
  const start = info.date;
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

  await onEventCreate(start, end, accountData);
};
```

### Event Creation Flow

1. User drags account from sidebar
2. Drops on calendar time slot
3. `handleDrop()` called with drop location and time
4. POST to `/api/calendar/events` with:
   - Account customer ID
   - Drop time as start time
   - Default 1-hour duration
   - Account objective as description
   - Account location
5. Event created in database
6. UI updated optimistically
7. Account marked as scheduled in sidebar

## Visual Feedback

### Drag States
- **Default**: Cursor shows `grab`
- **Dragging**: Cursor shows `grabbing`, shadow increases
- **Drop Target**: Calendar slot highlights on hover
- **Scheduled**: Card opacity 50%, cursor `not-allowed`

### Color Coding

**Priority Border Colors**:
- HIGH: Red (`border-red-500`)
- MEDIUM: Yellow (`border-yellow-500`)
- LOW: Green (`border-green-500`)

**Event Type Colors**:
- Tasting: Purple (`#8b5cf6`)
- Visit: Blue (`#3b82f6`)
- Meeting: Green (`#10b981`)
- Call: Amber (`#f59e0b`)

**Status Indicators**:
- Scheduled: Green checkmark icon
- Unscheduled: Orange warning icon in stats

## Future Enhancements

### Google Calendar / Outlook Sync

**TODO Markers Added**:
- `/api/calendar/events/route.ts` - POST handler
- `/api/calendar/events/[eventId]/route.ts` - PATCH and DELETE handlers

**Integration Points**:
```typescript
// After creating event
if (user.hasGoogleCalendarSync) {
  await syncToGoogleCalendar(event);
}

if (user.hasOutlookSync) {
  await syncToOutlook(event);
}
```

**Required**:
1. OAuth tokens storage in User model
2. Calendar sync service module
3. Webhook handlers for external changes
4. Conflict resolution logic

### Event Details Modal

**TODO**: Implement modal on `handleEventClick()`

**Suggested Features**:
- Edit event details
- View customer profile
- Add notes
- Reschedule
- Cancel/delete
- Mark as completed
- Record outcome

### Recurring Events

**Future Enhancement**:
- Weekly customer visits
- Monthly tastings
- Quarterly reviews

**Database Changes Needed**:
- Add `recurrenceRule` field to CalendarEvent
- Add `parentEventId` for recurring instances

## Dependencies

### NPM Packages Installed

```json
{
  "@fullcalendar/react": "^6.x",
  "@fullcalendar/daygrid": "^6.x",
  "@fullcalendar/timegrid": "^6.x",
  "@fullcalendar/interaction": "^6.x"
}
```

### Existing Dependencies Used

- `@radix-ui/react-checkbox` - Filter checkboxes
- `lucide-react` - Icons
- `date-fns` - Date formatting (already in project)
- UI components from `/components/ui`:
  - Input
  - Label
  - Checkbox

## Database Schema

### CalendarEvent Model (Existing)

```prisma
model CalendarEvent {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  eventType   String?  // "tasting", "visit", "meeting", "call"
  customerId  String?
  location    String?
  createdAt   DateTime @default(now())

  tenant   Tenant
  user     User
  customer Customer?
}
```

**Indexes**:
- `(tenantId, userId, startTime)` - Main query pattern
- `(userId, startTime)` - User's events sorted

## Testing Recommendations

### Unit Tests
1. DraggableAccount rendering
2. Filter logic in CallPlanSidebar
3. Event color mapping
4. Date calculations

### Integration Tests
1. Drag-drop event creation
2. Event time updates
3. Filter combinations
4. Search functionality

### E2E Tests
1. Complete drag-drop flow
2. Multi-day event creation
3. Event editing
4. Account scheduling status updates

## Performance Considerations

### Optimizations Implemented
1. **Memoized Filters**: `useMemo` for filtered accounts
2. **Memoized Stats**: Calculated once per accounts change
3. **Optimistic Updates**: UI updates before API confirmation
4. **Conditional Rendering**: Lazy load calendar when data ready

### Future Optimizations
1. Virtual scrolling for large account lists (100+ accounts)
2. Event pagination for long time ranges
3. Debounced search input
4. Cache calendar events in localStorage

## Error Handling

### Client-Side
- Toast notifications for all errors
- Revert calendar changes on API failure
- Loading states during API calls
- Validation before drag-drop

### Server-Side
- Authentication checks on all endpoints
- Tenant isolation enforcement
- Input validation with Zod schemas
- Database transaction rollbacks on error

## Accessibility

### Keyboard Support
- Tab navigation through accounts
- Enter to toggle filters
- Arrow keys in calendar (FullCalendar default)

### Screen Readers
- ARIA labels on drag handles
- Status announcements for filters
- Event descriptions

### Visual
- High contrast color scheme
- Focus indicators
- Large click targets (44px minimum)

## Browser Compatibility

**Tested/Supported**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Drag-Drop APIs**:
- HTML5 Drag and Drop API
- FullCalendar's drop plugin

## File Structure Summary

```
/Users/greghogue/Leora2/web/
├── src/
│   ├── types/
│   │   └── calendar.ts                           # Type definitions
│   ├── app/
│   │   ├── sales/calendar/
│   │   │   ├── page.tsx                          # Main page
│   │   │   └── components/
│   │   │       ├── CalendarView.tsx              # Calendar component
│   │   │       ├── CallPlanSidebar.tsx           # Sidebar component
│   │   │       └── DraggableAccount.tsx          # Account card
│   │   └── api/
│   │       ├── calendar/events/
│   │       │   ├── route.ts                      # Events CRUD
│   │       │   └── [eventId]/route.ts            # Single event
│   │       └── call-plans/active/accounts/
│   │           └── route.ts                      # Active call plan
│   └── lib/
│       └── utils/calendar-sync.ts                # TODO: Calendar sync
└── docs/
    └── calendar-drag-drop-ui.md                  # This file
```

## Usage Instructions

### For End Users

1. **View Calendar**: Navigate to `/sales/calendar`
2. **Filter Accounts**: Use sidebar filters to find accounts
3. **Drag to Schedule**: Drag account card to calendar time slot
4. **Reschedule**: Drag existing event to new time
5. **Resize Event**: Drag event edges to change duration
6. **View Details**: Click event to view (modal TODO)

### For Developers

1. **Add New Event Type**:
   - Update `eventType` enum in `calendar.ts`
   - Add color mapping in `CalendarView.tsx`

2. **Customize Time Range**:
   - Modify `slotMinTime` and `slotMaxTime` in CalendarView

3. **Add Calendar Sync**:
   - Create `/lib/utils/calendar-sync.ts`
   - Implement OAuth flows
   - Call sync functions in API routes

## Monitoring and Logging

### Logged Events
- Calendar event creation (success/failure)
- Drag-drop operations
- Filter changes
- API errors

### Metrics to Track
- Events created per user per week
- Drag-drop success rate
- Average events per call plan
- Filter usage patterns

## Security Considerations

### Implemented
1. **Authentication**: All API routes require valid session
2. **Tenant Isolation**: All queries scoped by tenantId
3. **Authorization**: Users can only modify their own events
4. **Input Validation**: Zod schemas on all inputs

### Future Enhancements
1. Rate limiting on event creation
2. Audit logging for event changes
3. Permission levels for shared calendars
4. Data encryption for sensitive locations

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2025-10-25
**Next Steps**: Calendar sync integration, event details modal
