# Task Management System - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SALES REP DASHBOARD                         │
│                     /sales/dashboard/page.tsx                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Server-Side Render
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AssignedTasks Component                        │
│          /src/app/sales/dashboard/sections/AssignedTasks.tsx       │
│                                                                      │
│  Props:                                                              │
│  - initialTasks: Task[]                                             │
│  - initialSummary: Summary                                          │
│                                                                      │
│  Features:                                                           │
│  ✓ Filter dropdown (All, Pending, Completed, Overdue)              │
│  ✓ Task cards with priority badges                                 │
│  ✓ Mark Complete button                                            │
│  ✓ Overdue highlighting                                            │
│  ✓ Summary statistics                                              │
└─────────────────────────────────────────────────────────────────────┘
                    │                            │
                    │ Fetch                      │ Mark Complete
                    ▼                            ▼
        ┌───────────────────────┐    ┌───────────────────────────┐
        │  GET /api/sales/      │    │  PUT /api/sales/tasks/    │
        │  tasks/assigned       │    │  {id}/complete            │
        │                       │    │                           │
        │ Query Params:         │    │ Body: { notes?: string }  │
        │ - status (optional)   │    │                           │
        └───────────────────────┘    └───────────────────────────┘
                    │                            │
                    │                            │
                    ▼                            ▼
        ┌─────────────────────────────────────────────────────────┐
        │              withSalesSession Middleware                 │
        │                  /lib/auth/sales.ts                      │
        │                                                           │
        │  ✓ Authenticate user                                     │
        │  ✓ Verify tenant                                         │
        │  ✓ Check permissions                                     │
        └─────────────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────┐
        │                    Prisma Database                       │
        │                                                           │
        │  Task Table:                                             │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │ id (UUID)                                        │   │
        │  │ tenantId (UUID) ───────┐                        │   │
        │  │ userId (UUID) ─────┐   │  (Assigned TO)        │   │
        │  │ assignedById (UUID)│───┼───┐  (Assigned BY)    │   │
        │  │ title              │   │   │                     │   │
        │  │ description        │   │   │                     │   │
        │  │ priority ──────────┼───┼───┼── TaskPriority    │   │
        │  │ dueAt              │   │   │                     │   │
        │  │ status             │   │   │                     │   │
        │  │ customerId (UUID)  │   │   │                     │   │
        │  │ createdAt          │   │   │                     │   │
        │  │ updatedAt          │   │   │                     │   │
        │  └────────────────────┼───┼───┼─────────────────────┘   │
        │                       │   │   │                          │
        │  ┌────────────────────▼───┼───┼─────────────────────┐   │
        │  │ User (Sales Rep)       │   │                     │   │
        │  │ - assignedTasks ───────┘   │                     │   │
        │  │ - createdTasks ────────────┘                     │   │
        │  └──────────────────────────────────────────────────┘   │
        │                                                           │
        │  TaskPriority Enum:                                      │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │ LOW, MEDIUM, HIGH                                │   │
        │  └──────────────────────────────────────────────────┘   │
        └─────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Fetch Assigned Tasks

```
Sales Rep Dashboard
       │
       │ 1. Load component
       ▼
 Server-Side Fetch
       │
       │ 2. GET /api/sales/tasks/assigned?status=pending
       ▼
 Authentication Check
       │
       │ 3. Verify session & tenant
       ▼
 Database Query
       │
       │ 4. SELECT * FROM Task WHERE userId = {currentUser.id}
       │    INCLUDE assignedBy, customer
       │    ORDER BY priority DESC, dueAt ASC
       ▼
 Format Response
       │
       │ 5. Transform to JSON with summary
       ▼
 Render Component
       │
       │ 6. Display tasks with filtering UI
       ▼
    Display to User
```

### 2. Mark Task Complete

```
User Clicks "Mark Complete"
       │
       │ 1. onClick handler
       ▼
 Client-Side Request
       │
       │ 2. PUT /api/sales/tasks/{id}/complete
       ▼
 Authentication Check
       │
       │ 3. Verify session & tenant
       ▼
 Database Update
       │
       │ 4. UPDATE Task SET status = 'COMPLETED'
       │    WHERE id = {taskId} AND tenantId = {tenantId}
       ▼
 Return Updated Task
       │
       │ 5. JSON response with success
       ▼
 Refresh Task List
       │
       │ 6. Re-fetch tasks from API
       ▼
    Update UI
```

## Component Architecture

```
AssignedTasks.tsx
├── State Management
│   ├── tasks (Task[])
│   ├── summary (Summary)
│   ├── filter (FilterOption)
│   ├── completingTaskId (string | null)
│   └── loading (boolean)
│
├── Event Handlers
│   ├── handleFilterChange()
│   ├── handleMarkComplete()
│   └── fetchTasks()
│
├── Render Tree
│   ├── Section Container
│   │   ├── Header
│   │   │   ├── Title & Description
│   │   │   └── Summary Badges
│   │   │
│   │   ├── Filter Dropdown
│   │   │
│   │   ├── Tasks List
│   │   │   └── For each task:
│   │   │       ├── Task Card
│   │   │       │   ├── Title
│   │   │       │   ├── Priority Badge (if high)
│   │   │       │   ├── Description
│   │   │       │   ├── Metadata
│   │   │       │   │   ├── Assigned By
│   │   │       │   │   ├── Due Date
│   │   │       │   │   ├── Status Badge
│   │   │       │   │   └── Customer Link
│   │   │       │   └── Actions
│   │   │       │       ├── Mark Complete Button
│   │   │       │       └── Checkmark (if completed)
│   │   │       └── Styling
│   │   │           ├── Overdue: Red background
│   │   │           ├── Completed: Grayed out
│   │   │           └── Pending: White background
│   │   │
│   │   └── Footer Summary
│   │       └── Statistics (Total, Pending, Completed, Overdue)
│   │
│   └── Conditional Renders
│       ├── Loading State
│       └── Empty State
```

## Database Schema Relationships

```
┌──────────────────┐
│     Tenant       │
│                  │
│  id: UUID        │
│  name: String    │
└────────┬─────────┘
         │
         │ 1:N
         │
┌────────▼─────────┐           ┌──────────────────┐
│      User        │           │     Customer     │
│                  │           │                  │
│  id: UUID        │◄────┐     │  id: UUID        │
│  tenantId: UUID  │     │     │  tenantId: UUID  │
│  fullName: String│     │     │  name: String    │
│  email: String   │     │     └────────┬─────────┘
└────────┬─────────┘     │              │
         │               │              │
         │ 1:N           │              │
         │ (assigned)    │ 1:N          │ 1:N
         │               │ (creator)    │
┌────────▼───────────────┴──────────────▼─────────┐
│                    Task                         │
│                                                  │
│  id: UUID                                       │
│  tenantId: UUID ─────────────────────────┐      │
│  userId: UUID ──────────┐ (assigned to)  │      │
│  assignedById: UUID ────┼──┐ (created by)│      │
│  customerId: UUID ──────┼──┼──┐ (related)│      │
│  title: String          │  │  │           │      │
│  description: String?   │  │  │           │      │
│  priority: TaskPriority │  │  │           │      │
│  dueAt: DateTime?       │  │  │           │      │
│  status: TaskStatus     │  │  │           │      │
│  createdAt: DateTime    │  │  │           │      │
│  updatedAt: DateTime    │  │  │           │      │
│                         │  │  │           │      │
│  Relations:             │  │  │           │      │
│  - tenant ──────────────┼──┼──┼───────────┘      │
│  - user (assignedTo) ───┘  │  │                  │
│  - assignedBy ─────────────┘  │                  │
│  - customer ──────────────────┘                  │
│                                                  │
│  Indexes:                                        │
│  - tenantId                                      │
│  - userId                                        │
│  - assignedById                                  │
└──────────────────────────────────────────────────┘

┌──────────────────────┐
│   TaskPriority       │
│   (Enum)             │
│                      │
│  - LOW               │
│  - MEDIUM (default)  │
│  - HIGH              │
└──────────────────────┘

┌──────────────────────┐
│   TaskStatus         │
│   (Enum)             │
│                      │
│  - PENDING (default) │
│  - IN_PROGRESS       │
│  - COMPLETED         │
│  - CANCELLED         │
└──────────────────────┘
```

## API Request/Response Flow

### GET /api/sales/tasks/assigned

```
Request:
┌─────────────────────────────────────────┐
│ GET /api/sales/tasks/assigned           │
│                                          │
│ Headers:                                 │
│   Cookie: session=xyz                    │
│                                          │
│ Query Params:                            │
│   status: "pending" | "completed" |      │
│           "overdue" | "all"              │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Authentication & Authorization          │
│                                          │
│ 1. Parse session cookie                 │
│ 2. Verify session is valid              │
│ 3. Get user & tenant                    │
│ 4. Check sales rep permissions          │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Build Database Query                    │
│                                          │
│ WHERE:                                   │
│   tenantId = {session.tenantId}         │
│   userId = {session.user.id}            │
│   status = {filter} (if not "all")      │
│                                          │
│ INCLUDE:                                 │
│   assignedBy { id, fullName, email }    │
│   customer { id, name }                 │
│                                          │
│ ORDER BY:                                │
│   priority DESC                          │
│   dueAt ASC                              │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Calculate Summary                       │
│                                          │
│ total = tasks.length                    │
│ pending = count(status === PENDING)     │
│ completed = count(status === COMPLETED) │
│ overdue = count(                         │
│   status === PENDING &&                  │
│   dueAt < now                           │
│ )                                        │
└─────────────────────────────────────────┘
                  │
                  ▼
Response:
┌─────────────────────────────────────────┐
│ {                                        │
│   "tasks": [                             │
│     {                                    │
│       "id": "uuid",                      │
│       "title": "Task title",             │
│       "description": "Details",          │
│       "priority": "high",                │
│       "dueAt": "2025-10-25T...",         │
│       "status": "pending",               │
│       "assignedBy": {                    │
│         "id": "uuid",                    │
│         "name": "Manager Name",          │
│         "email": "manager@..."           │
│       },                                 │
│       "customer": {                      │
│         "id": "uuid",                    │
│         "name": "Customer"               │
│       },                                 │
│       "createdAt": "2025-10-15T..."      │
│     }                                    │
│   ],                                     │
│   "summary": {                           │
│     "total": 5,                          │
│     "pending": 3,                        │
│     "completed": 2,                      │
│     "overdue": 1                         │
│   }                                      │
│ }                                        │
└─────────────────────────────────────────┘
```

## Security Layer

```
┌─────────────────────────────────────────────────────────────┐
│                     SECURITY BOUNDARIES                      │
└─────────────────────────────────────────────────────────────┘

1. Authentication Layer
   ┌────────────────────────────────────────┐
   │  withSalesSession Middleware           │
   │  - Verify session cookie exists        │
   │  - Validate session in database        │
   │  - Check session not expired           │
   │  - Extract user & tenant info          │
   └────────────────────────────────────────┘

2. Authorization Layer
   ┌────────────────────────────────────────┐
   │  Permission Checks                     │
   │  - User has sales rep role             │
   │  - Sales rep is active                 │
   │  - User belongs to tenant              │
   └────────────────────────────────────────┘

3. Data Isolation Layer
   ┌────────────────────────────────────────┐
   │  Tenant Scoping                        │
   │  - All queries filtered by tenantId    │
   │  - Users can only see own tasks        │
   │  - No cross-tenant data leakage        │
   └────────────────────────────────────────┘

4. Input Validation
   ┌────────────────────────────────────────┐
   │  Request Validation                    │
   │  - Query params sanitized              │
   │  - UUID format validation              │
   │  - Enum value validation               │
   └────────────────────────────────────────┘

5. Output Security
   ┌────────────────────────────────────────┐
   │  Response Protection                   │
   │  - React XSS protection                │
   │  - No sensitive data in responses      │
   │  - Proper error messages               │
   └────────────────────────────────────────┘
```

## Performance Optimization

```
Database Level:
┌────────────────────────────────────────┐
│  Indexes:                              │
│  - Task(tenantId)                      │
│  - Task(userId)        ← NEW           │
│  - Task(assignedById)  ← NEW           │
│                                        │
│  Query Optimization:                   │
│  - Single query with includes          │
│  - No N+1 queries                      │
│  - Proper index usage                  │
└────────────────────────────────────────┘

API Level:
┌────────────────────────────────────────┐
│  - Minimal data transfer               │
│  - JSON compression                    │
│  - Efficient filtering                 │
└────────────────────────────────────────┘

Client Level:
┌────────────────────────────────────────┐
│  - Server-side initial render          │
│  - Client-side filtering (instant)     │
│  - Optimistic UI updates               │
│  - Conditional re-renders              │
└────────────────────────────────────────┘
```

## File Organization

```
/Users/greghogue/Leora2/web/
│
├── src/
│   └── app/
│       ├── api/
│       │   └── sales/
│       │       └── tasks/
│       │           ├── assigned/
│       │           │   └── route.ts ← API endpoint
│       │           └── [taskId]/
│       │               └── complete/
│       │                   └── route.ts (existing)
│       │
│       └── sales/
│           └── dashboard/
│               └── sections/
│                   └── AssignedTasks.tsx ← Component
│
├── prisma/
│   ├── schema.prisma ← Modified
│   └── migrations/
│       └── 20251019_add_task_priority_and_assigned_by.sql ← Migration
│
└── Documentation/
    ├── README_TASK_MANAGEMENT.md ← Main README
    ├── TASK_MANAGEMENT_IMPLEMENTATION.md ← Details
    ├── TASK_MANAGEMENT_USAGE_EXAMPLE.md ← Examples
    ├── TASK_MANAGEMENT_SUMMARY.md ← Quick ref
    ├── TASK_MANAGEMENT_FILES.txt ← Inventory
    └── TASK_MANAGEMENT_ARCHITECTURE.md ← This file
```
