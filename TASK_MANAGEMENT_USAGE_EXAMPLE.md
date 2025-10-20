# Task Management System - Usage Examples

## Integration into Sales Dashboard

### Server-Side Rendering Example

```typescript
// /src/app/sales/dashboard/page.tsx
import { cookies } from "next/headers";
import AssignedTasks from "./sections/AssignedTasks";
import CustomerHealthSummary from "./sections/CustomerHealthSummary";
import PerformanceMetrics from "./sections/PerformanceMetrics";

async function fetchAssignedTasks() {
  const cookieStore = cookies();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/sales/tasks/assigned?status=pending`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: 'no-store', // Always get fresh data
    }
  );

  if (!response.ok) {
    return { tasks: [], summary: { total: 0, pending: 0, completed: 0, overdue: 0 } };
  }

  return response.json();
}

export default async function DashboardPage() {
  const { tasks, summary } = await fetchAssignedTasks();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sales Dashboard</h1>

      {/* Assigned Tasks Section */}
      <AssignedTasks
        initialTasks={tasks}
        initialSummary={summary}
      />

      {/* Other dashboard sections */}
      <CustomerHealthSummary />
      <PerformanceMetrics />
    </div>
  );
}
```

### Client-Side Only Example

```typescript
'use client';

import { useEffect, useState } from 'react';
import AssignedTasks from './sections/AssignedTasks';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch('/api/sales/tasks/assigned');
        const data = await response.json();
        setTasks(data.tasks);
        setSummary(data.summary);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sales Dashboard</h1>
      <AssignedTasks initialTasks={tasks} initialSummary={summary} />
    </div>
  );
}
```

## Creating Tasks (Manager View)

### Create Task API Endpoint

```typescript
// /src/app/api/admin/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const {
      userId,      // Sales rep to assign to
      title,
      description,
      priority,    // 'LOW', 'MEDIUM', or 'HIGH'
      dueAt,
      customerId,  // Optional
    } = body;

    // Validation
    if (!userId || !title) {
      return NextResponse.json(
        { error: "userId and title are required" },
        { status: 400 }
      );
    }

    // Create task
    const task = await db.task.create({
      data: {
        tenantId,
        userId,                      // Assigned TO
        assignedById: session.user.id, // Assigned BY (manager)
        title,
        description,
        priority: priority || 'MEDIUM',
        dueAt: dueAt ? new Date(dueAt) : null,
        customerId: customerId || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json({ task });
  });
}
```

### Create Task Form Component

```typescript
'use client';

import { useState } from 'react';

type CreateTaskFormProps = {
  salesReps: Array<{ id: string; name: string }>;
  customers?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
};

export default function CreateTaskForm({
  salesReps,
  customers,
  onSuccess
}: CreateTaskFormProps) {
  const [formData, setFormData] = useState({
    userId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueAt: '',
    customerId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create task');

      alert('Task created successfully!');
      setFormData({
        userId: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueAt: '',
        customerId: '',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Assign To (Sales Rep)
        </label>
        <select
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Select a sales rep...</option>
          {salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Task Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Review quarterly goals"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Provide additional details..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Due Date
          </label>
          <input
            type="date"
            value={formData.dueAt}
            onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {customers && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Related Customer (Optional)
          </label>
          <select
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">None</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
```

## API Usage Examples

### Fetch All Tasks (No Filter)

```typescript
const response = await fetch('/api/sales/tasks/assigned');
const { tasks, summary } = await response.json();
```

### Fetch Pending Tasks Only

```typescript
const response = await fetch('/api/sales/tasks/assigned?status=pending');
const { tasks, summary } = await response.json();
```

### Fetch Overdue Tasks

```typescript
const response = await fetch('/api/sales/tasks/assigned?status=overdue');
const { tasks, summary } = await response.json();
```

### Mark Task Complete

```typescript
const response = await fetch(`/api/sales/tasks/${taskId}/complete`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
});

const { success, task } = await response.json();
```

## Database Query Examples

### Get Tasks Assigned BY a Manager

```typescript
// Find all tasks created by a specific manager
const tasksCreatedByManager = await db.task.findMany({
  where: {
    tenantId,
    assignedById: managerId,
  },
  include: {
    user: {
      select: {
        fullName: true,
        email: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

### Get High Priority Tasks

```typescript
const highPriorityTasks = await db.task.findMany({
  where: {
    tenantId,
    priority: 'HIGH',
    status: 'PENDING',
  },
  include: {
    user: true,
    assignedBy: true,
  },
});
```

### Get Overdue Tasks for All Reps

```typescript
const overdueTasks = await db.task.findMany({
  where: {
    tenantId,
    status: 'PENDING',
    dueAt: {
      lt: new Date(),
    },
  },
  include: {
    user: {
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    },
  },
  orderBy: {
    dueAt: 'asc',
  },
});
```

### Update Task Priority

```typescript
const updatedTask = await db.task.update({
  where: {
    id: taskId,
  },
  data: {
    priority: 'HIGH',
  },
});
```

## Testing Examples

### Unit Test for API Endpoint

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/sales/tasks/assigned/route';

describe('GET /api/sales/tasks/assigned', () => {
  it('should return tasks for authenticated user', async () => {
    const request = new Request('http://localhost/api/sales/tasks/assigned');
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('tasks');
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('total');
    expect(data.summary).toHaveProperty('pending');
    expect(data.summary).toHaveProperty('completed');
    expect(data.summary).toHaveProperty('overdue');
  });

  it('should filter by status', async () => {
    const request = new Request(
      'http://localhost/api/sales/tasks/assigned?status=pending'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.tasks.every(t => t.status === 'pending')).toBe(true);
  });
});
```

### Component Test

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssignedTasks from '@/app/sales/dashboard/sections/AssignedTasks';

describe('AssignedTasks Component', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Test Task',
      description: 'Test Description',
      priority: 'high',
      dueAt: '2025-10-25T00:00:00.000Z',
      status: 'pending',
      assignedBy: { id: '1', name: 'Manager', email: 'manager@test.com' },
      customer: null,
      createdAt: '2025-10-15T00:00:00.000Z',
    },
  ];

  const mockSummary = {
    total: 1,
    pending: 1,
    completed: 0,
    overdue: 0,
  };

  it('should render tasks', () => {
    render(
      <AssignedTasks initialTasks={mockTasks} initialSummary={mockSummary} />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should mark task as complete', async () => {
    render(
      <AssignedTasks initialTasks={mockTasks} initialSummary={mockSummary} />
    );

    const completeButton = screen.getByText('Mark Complete');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText('Completing...')).toBeInTheDocument();
    });
  });
});
```

## Common Patterns

### Refreshing Tasks After External Updates

```typescript
'use client';

import { useState } from 'react';
import AssignedTasks from './sections/AssignedTasks';

export default function DashboardWithRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh Tasks</button>
      <AssignedTasks key={refreshKey} />
    </div>
  );
}
```

### Showing Notification Badge

```typescript
export function TasksBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
      {count}
    </span>
  );
}

// Usage
<div className="flex items-center gap-2">
  <span>Tasks</span>
  <TasksBadge count={summary.overdue} />
</div>
```
