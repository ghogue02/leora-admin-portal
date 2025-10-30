# Dashboard Grid Implementation

## Overview

This implementation provides a drag-and-drop dashboard grid system for the Leora2 sales dashboard using `react-grid-layout`. The system allows users to customize their dashboard by adding, removing, and repositioning widgets.

## Architecture

### Components

#### 1. DashboardGrid (`/web/src/app/sales/dashboard/components/DashboardGrid.tsx`)

**Purpose**: Main container component that manages the grid layout and widget positioning.

**Key Features**:
- Responsive grid layout with 4 breakpoints (lg, md, sm, xs)
- Drag-and-drop widget repositioning
- Save/restore layout functionality
- Add/remove widgets dynamically
- Reset to default layout

**Props**:
```typescript
interface DashboardGridProps {
  widgets: Widget[];              // Currently displayed widgets
  availableWidgets: Widget[];     // Widgets available to add
  onAddWidget?: (widgetType: WidgetType) => void;
  onRemoveWidget?: (widgetId: string) => void;
  className?: string;
}
```

**Responsive Breakpoints**:
- `lg`: 1200px (12 columns)
- `md`: 996px (10 columns)
- `sm`: 768px (6 columns)
- `xs`: 480px (4 columns)

#### 2. WidgetLibrary (`/web/src/app/sales/dashboard/components/WidgetLibrary.tsx`)

**Purpose**: Registry of all available dashboard widgets.

**Key Features**:
- Centralized widget configuration
- Widget metadata (type, component, default size)
- Helper functions for widget management

**Available Widgets**:
1. `tasks-from-management` - Tasks assigned by management (6x3 grid)
2. `at-risk-customers` - Customers at risk of churn (6x3 grid)
3. `revenue-trend` - Revenue trend chart (6x4 grid)
4. `customer-health` - Customer health summary (6x3 grid)
5. `upcoming-events` - Upcoming events calendar (6x3 grid)
6. `performance-metrics` - Performance metrics overview (12x2 grid, full width)

### Widget Components

#### 1. TasksFromManagement (`/web/src/app/sales/dashboard/widgets/TasksFromManagement.tsx`)

**Purpose**: Display tasks assigned by management with priority and status indicators.

**Features**:
- Priority color coding (high/medium/low)
- Status icons (completed, in progress, pending)
- Drag handle for repositioning
- Remove button
- TOP position indicator (border-t-4)

**API Endpoint**: `GET /api/dashboard/widgets/tasks-from-management`

**Data Structure**:
```typescript
interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: string;
  priority: 'high' | 'medium' | 'low';
  assignedBy: string;
  customer?: { id: string; name: string } | null;
}
```

#### 2. AtRiskCustomers (`/web/src/app/sales/dashboard/widgets/AtRiskCustomers.tsx`)

**Purpose**: Monitor customers at risk of churn or revenue loss.

**Features**:
- Risk status badges (cadence, revenue, dormant)
- Days overdue tracking
- Revenue impact calculation
- Last order date display
- Average order interval

**API Endpoint**: `GET /api/dashboard/widgets/at-risk-customers`

**Data Structure**:
```typescript
interface AtRiskCustomer {
  id: string;
  name: string;
  riskStatus: 'at_risk_cadence' | 'at_risk_revenue' | 'dormant';
  lastOrderDate: string | null;
  daysOverdue: number;
  averageOrderIntervalDays: number | null;
  revenueImpact: number;
}
```

#### 3. RevenueTrend (`/web/src/app/sales/dashboard/widgets/RevenueTrend.tsx`)

**Purpose**: Visualize revenue trends over the last 8 weeks.

**Features**:
- Summary cards (total revenue, avg growth, target achievement)
- Weekly revenue bars with growth indicators
- Target vs actual comparison
- Trend direction indicators

**API Endpoint**: `GET /api/dashboard/widgets/revenue-trend`

**Data Structure**:
```typescript
interface RevenueData {
  period: string;
  revenue: number;
  target: number;
  growth: number;
}

interface Summary {
  totalRevenue: number;
  averageGrowth: number;
  targetAchievement: number;
}
```

## API Routes

### 1. Layout Management

#### GET `/api/dashboard/widgets/layout`
Retrieve saved dashboard layout for the current user.

**Response**:
```json
{
  "layouts": {
    "lg": [...],
    "md": [...],
    "sm": [...],
    "xs": [...]
  },
  "updatedAt": "2025-10-25T15:00:00Z"
}
```

#### POST `/api/dashboard/widgets/layout`
Save dashboard layout for the current user.

**Request Body**:
```json
{
  "layouts": {
    "lg": [
      { "i": "widget-id", "x": 0, "y": 0, "w": 6, "h": 3, "minW": 4, "minH": 2 }
    ],
    "md": [...],
    "sm": [...],
    "xs": [...]
  }
}
```

**Response**:
```json
{
  "success": true,
  "updatedAt": "2025-10-25T15:00:00Z"
}
```

### 2. Widget Data Endpoints

All widget endpoints require authentication and return data specific to the current sales rep.

#### GET `/api/dashboard/widgets/tasks-from-management`
- Returns tasks assigned by management
- Filtered by status (pending, in_progress)
- Ordered by priority (desc), due date (asc)
- Limited to 10 tasks

#### GET `/api/dashboard/widgets/at-risk-customers`
- Returns customers with risk status
- Includes revenue impact calculation
- Ordered by risk status, days overdue
- Limited to 15 customers

#### GET `/api/dashboard/widgets/revenue-trend`
- Returns revenue data for last 8 weeks
- Includes week-over-week growth
- Provides summary statistics
- Compares actual vs target

## Database Schema

### DashboardLayout Table

```prisma
model DashboardLayout {
  id        String   @id @default(cuid())
  userId    String   @unique
  layouts   Json     // Stores layout configuration
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### Task Table Updates

Add these fields to the existing Task model:

```prisma
model Task {
  // ... existing fields ...
  assignedByManagement Boolean @default(false)
  assignedBy          String?
  priority            String  @default("medium") // 'high' | 'medium' | 'low'
}
```

## Usage Example

```tsx
'use client';

import { useState } from 'react';
import { DashboardGrid } from './components/DashboardGrid';
import { WIDGET_REGISTRY, getAvailableWidgets } from './components/WidgetLibrary';

export default function CustomDashboard() {
  const [activeWidgets, setActiveWidgets] = useState([
    WIDGET_REGISTRY['tasks-from-management'],
    WIDGET_REGISTRY['at-risk-customers'],
    WIDGET_REGISTRY['revenue-trend']
  ]);

  const handleAddWidget = (widgetType: WidgetType) => {
    const widget = WIDGET_REGISTRY[widgetType];
    setActiveWidgets([...activeWidgets, widget]);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setActiveWidgets(activeWidgets.filter(w => w.id !== widgetId));
  };

  const availableWidgets = getAvailableWidgets(
    activeWidgets.map(w => w.id)
  );

  return (
    <DashboardGrid
      widgets={activeWidgets}
      availableWidgets={availableWidgets}
      onAddWidget={handleAddWidget}
      onRemoveWidget={handleRemoveWidget}
    />
  );
}
```

## Styling

The grid system uses Tailwind CSS and integrates with the existing shadcn/ui component library.

**Required CSS Imports**:
```typescript
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
```

**Drag Handle**:
All widgets include a drag handle with the class `.drag-handle` for repositioning.

## Performance Considerations

1. **Layout Persistence**: Layouts are saved to the database on user action (Save button)
2. **Lazy Loading**: Widgets load data independently via their own API calls
3. **Responsive**: Grid automatically adjusts to screen size
4. **Memoization**: Consider memoizing widget components for better performance

## Future Enhancements

1. **Widget Templates**: Pre-configured dashboard layouts for different roles
2. **Real-time Updates**: WebSocket integration for live data updates
3. **Export/Import**: Share dashboard configurations between users
4. **Analytics**: Track widget usage and effectiveness
5. **More Widgets**: Add widgets for:
   - Customer health summary
   - Upcoming events
   - Performance metrics
   - Product goals
   - Territory map

## Testing

### Unit Tests
```bash
# Test widget components
npm test -- TasksFromManagement.test.tsx
npm test -- AtRiskCustomers.test.tsx
npm test -- RevenueTrend.test.tsx

# Test grid layout
npm test -- DashboardGrid.test.tsx
```

### Integration Tests
```bash
# Test API endpoints
npm test -- api/dashboard/widgets
```

## Deployment Checklist

- [ ] Run database migration for DashboardLayout table
- [ ] Update Task model with new fields
- [ ] Test all widget API endpoints
- [ ] Verify responsive layout on all breakpoints
- [ ] Test save/restore layout functionality
- [ ] Verify drag-and-drop on touch devices
- [ ] Check accessibility (keyboard navigation)
- [ ] Performance test with 10+ widgets
- [ ] Review error handling and loading states

## Dependencies

```json
{
  "react-grid-layout": "^1.4.4",
  "@types/react-grid-layout": "^1.3.5"
}
```

## References

- [react-grid-layout Documentation](https://github.com/react-grid-layout/react-grid-layout)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
