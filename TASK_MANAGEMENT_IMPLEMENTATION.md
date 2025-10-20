# Task Management System for Sales Reps

## Overview
This implementation adds a comprehensive task assignment and tracking system for sales representatives, allowing managers to assign tasks with priorities and due dates.

## Implementation Details

### 1. Database Schema Changes

#### New Fields Added to Task Model
- `assignedById` (UUID, optional) - References the User who assigned the task (manager)
- `priority` (TaskPriority enum) - Task priority level (LOW, MEDIUM, HIGH)

#### New Enum Type
```prisma
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}
```

#### Updated Relations
- `Task.user` → Renamed relation to "AssignedTasks" - User the task is assigned TO
- `Task.assignedBy` → New relation "CreatedTasks" - User who created/assigned the task
- Added indexes on `userId` and `assignedById` for query performance

#### Migration File
Location: `/prisma/migrations/20251019_add_task_priority_and_assigned_by.sql`

To apply the migration:
```bash
# If using Prisma
npx prisma migrate deploy

# Or run the SQL directly
psql -d your_database < prisma/migrations/20251019_add_task_priority_and_assigned_by.sql
```

### 2. API Endpoint

#### GET /api/sales/tasks/assigned
Fetches tasks assigned to the current user with filtering and summary statistics.

**Query Parameters:**
- `status` (optional): Filter by status
  - `all` - All tasks (default)
  - `pending` - Only pending tasks
  - `completed` - Only completed tasks
  - `overdue` - Only overdue pending tasks

**Response Format:**
```typescript
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Review Q4 product goals",
      "description": "Check progress on new product line",
      "priority": "high",
      "dueAt": "2025-10-25T00:00:00.000Z",
      "status": "pending",
      "assignedBy": {
        "id": "uuid",
        "name": "Manager Name",
        "email": "manager@example.com"
      },
      "customer": {
        "id": "uuid",
        "name": "Customer Name"
      } | null,
      "createdAt": "2025-10-15T00:00:00.000Z"
    }
  ],
  "summary": {
    "total": 5,
    "pending": 3,
    "completed": 2,
    "overdue": 1
  }
}
```

**Features:**
- Automatic filtering by current user (userId)
- Includes assignedBy user information
- Sorted by priority (desc) and due date (asc)
- Calculates summary statistics
- Properly formats response with lowercase enum values

**Authentication:**
- Uses `withSalesSession` middleware
- Requires valid sales session
- Automatically scoped to user's tenant

### 3. AssignedTasks Component

#### Location
`/src/app/sales/dashboard/sections/AssignedTasks.tsx`

#### Features

**Display:**
- Card-based layout for each task
- Priority badges (High/Medium/Low) with color coding:
  - High: Red (bg-red-100, text-red-800)
  - Medium: Yellow (bg-yellow-100, text-yellow-800)
  - Low: Blue (bg-blue-100, text-blue-800)
- Overdue task highlighting (red background)
- Completed tasks grayed out with checkmark icon
- Status badges for all task states
- Customer links (if associated)
- Due date display with overdue indicator
- Assigned by manager name

**Filtering:**
- Dropdown filter with options:
  - All Tasks
  - Pending
  - Completed
  - Overdue
- Client-side and server-side filtering
- Real-time updates when filter changes

**Actions:**
- "Mark Complete" button for pending tasks
- Loading states during API calls
- Automatic refresh after completion
- Error handling with user feedback

**Summary Statistics:**
- Total tasks count
- Pending tasks count
- Completed tasks count
- Overdue tasks count (with badge if > 0)
- Footer summary display

**Visual Design:**
- Responsive card layout
- Consistent with existing dashboard sections
- Color-coded priority system
- Clear visual hierarchy
- Loading and empty states

#### Props
```typescript
type AssignedTasksProps = {
  initialTasks: Task[];
  initialSummary: Summary;
};
```

The component accepts initial data for server-side rendering and can fetch updates client-side.

### 4. Integration with Existing Features

#### Mark Complete Endpoint
Uses existing endpoint: `PUT /api/sales/tasks/{id}/complete`
- Already implemented in `/src/app/api/sales/tasks/[taskId]/complete/route.ts`
- Works seamlessly with the new priority and assignedBy fields
- Updates task status to COMPLETED
- Returns updated task data

#### Component Pattern
Follows the same patterns as:
- `CustomerHealthSummary.tsx` - For card layout and summary display
- `WeeklyCallPlanGrid.tsx` - For task completion functionality
- `TasksList.tsx` - For task display patterns

### 5. Usage Example

#### In a Dashboard Page
```typescript
import AssignedTasks from "./sections/AssignedTasks";

export default async function DashboardPage() {
  // Fetch assigned tasks on server
  const tasksResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/sales/tasks/assigned?status=pending`,
    {
      headers: {
        Cookie: cookies().toString(),
      },
    }
  );

  const { tasks, summary } = await tasksResponse.json();

  return (
    <div>
      <AssignedTasks
        initialTasks={tasks}
        initialSummary={summary}
      />
    </div>
  );
}
```

### 6. Task Creation (Manager Side)

To create tasks with the new fields, managers can use the existing task creation endpoints with:

```typescript
// Example task creation
await db.task.create({
  data: {
    tenantId,
    userId: salesRepId,        // Who the task is assigned TO
    assignedById: managerId,   // Who assigned it (manager)
    title: "Review Q4 Goals",
    description: "Check progress on new products",
    priority: "HIGH",          // LOW, MEDIUM, or HIGH
    dueAt: new Date("2025-10-25"),
    status: "PENDING",
    customerId: optionalCustomerId, // Optional
  },
});
```

## Priority Logic

### Color Coding
- **High Priority:** Red background, shown prominently
- **Medium Priority:** Yellow background (default)
- **Low Priority:** Blue background

### Display Rules
- High priority tasks show a "High Priority" badge
- Medium and low priority visible in task metadata
- All priorities sorted with HIGH first in the list

## Overdue Detection

A task is considered overdue when:
- `status === 'pending'` AND
- `dueAt < current date/time`

Overdue tasks:
- Highlighted with red border and background
- Show "(Overdue)" text next to due date
- Counted in summary statistics
- Can be filtered separately

## Security Considerations

1. **Tenant Isolation:** All queries filtered by tenantId
2. **User Scope:** Users can only see tasks assigned TO them
3. **Authentication:** Requires valid sales session
4. **Authorization:** Uses existing sales role permissions
5. **XSS Protection:** All user input properly escaped in React

## Performance Optimizations

1. **Database Indexes:**
   - Index on `userId` for fast user task lookup
   - Index on `assignedById` for manager queries
   - Existing `tenantId` index for tenant isolation

2. **Query Optimization:**
   - Single query with includes for related data
   - Efficient ordering by priority and due date
   - Limited result sets (can add pagination if needed)

3. **Client-Side:**
   - Initial server-side render with cached data
   - Client-side filtering for immediate feedback
   - Optimistic UI updates during task completion

## Testing Checklist

- [ ] Task creation with priority and assignedBy
- [ ] Fetching assigned tasks with filters
- [ ] Marking tasks complete
- [ ] Overdue task detection
- [ ] Priority sorting
- [ ] Filter functionality (all, pending, completed, overdue)
- [ ] Summary statistics calculation
- [ ] Customer linking (optional field)
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsiveness

## Future Enhancements

1. **Pagination:** Add pagination for large task lists
2. **Search:** Full-text search across task titles/descriptions
3. **Notifications:** Email/push notifications for new tasks
4. **Comments:** Allow comments/updates on tasks
5. **Attachments:** Add file attachments to tasks
6. **Recurring Tasks:** Support for repeating tasks
7. **Task Templates:** Pre-defined task templates for common activities
8. **Bulk Actions:** Bulk complete or update multiple tasks
9. **Analytics:** Task completion metrics and reports
10. **Reminders:** Automatic reminders before due dates

## Files Modified/Created

### Created Files
1. `/src/app/api/sales/tasks/assigned/route.ts` - API endpoint
2. `/src/app/sales/dashboard/sections/AssignedTasks.tsx` - React component
3. `/prisma/migrations/20251019_add_task_priority_and_assigned_by.sql` - Database migration
4. `/TASK_MANAGEMENT_IMPLEMENTATION.md` - This documentation

### Modified Files
1. `/prisma/schema.prisma` - Updated Task model and User relations
   - Added `assignedById` field
   - Added `priority` field with TaskPriority enum
   - Updated User relations to include assignedTasks and createdTasks
   - Added indexes for performance

### Existing Files Used
1. `/src/app/api/sales/tasks/[taskId]/complete/route.ts` - Mark complete endpoint
2. `/src/lib/auth/sales.ts` - Authentication middleware
3. `/src/app/sales/dashboard/sections/CustomerHealthSummary.tsx` - Design reference
4. `/src/app/sales/call-plan/sections/WeeklyCallPlanGrid.tsx` - Functionality reference

## Dependencies

No new dependencies required. Uses existing:
- Next.js 14+ (App Router)
- Prisma ORM
- React 18+
- date-fns (for date formatting)
- Tailwind CSS (for styling)

## Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` - PostgreSQL connection string
- Standard Next.js configuration
