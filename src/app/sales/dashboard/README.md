# Sales Dashboard - Drag & Drop Grid System

## Quick Start

### 1. Install Dependencies
```bash
npm install react-grid-layout @types/react-grid-layout
```

### 2. Run Database Migration
```bash
cd web
npx prisma migrate dev --name add-dashboard-layout
```

### 3. Use the Dashboard Grid

```tsx
import { DashboardGridExample } from './components/DashboardGridExample';

export default function DashboardPage() {
  return <DashboardGridExample />;
}
```

## File Structure

```
/web/src/app/sales/dashboard/
├── components/
│   ├── DashboardGrid.tsx          # Main grid component
│   ├── WidgetLibrary.tsx          # Widget registry
│   └── DashboardGridExample.tsx   # Usage examples
├── widgets/
│   ├── TasksFromManagement.tsx    # TOP position widget
│   ├── AtRiskCustomers.tsx        # Risk monitoring
│   └── RevenueTrend.tsx           # Revenue chart
└── page.tsx                       # Main dashboard page

/web/src/app/api/dashboard/widgets/
├── layout/route.ts                # Save/load layout
├── tasks-from-management/route.ts
├── at-risk-customers/route.ts
└── revenue-trend/route.ts
```

## Available Widgets

1. **Tasks from Management** (6x3) - TOP position widget
   - Priority color coding
   - Status indicators
   - Assigned by manager

2. **At-Risk Customers** (6x3)
   - Risk status badges
   - Revenue impact
   - Days overdue

3. **Revenue Trend** (6x4)
   - 8-week revenue chart
   - Growth indicators
   - Target comparison

4. **Customer Health** (6x3) - Coming soon
5. **Upcoming Events** (6x3) - Coming soon
6. **Performance Metrics** (12x2) - Coming soon

## Features

✅ Drag-and-drop repositioning
✅ Responsive breakpoints (lg, md, sm, xs)
✅ Save/restore layouts
✅ Add/remove widgets
✅ Reset to default layout
✅ Individual widget data loading
✅ Error handling and loading states

## API Endpoints

### Layout Management
- `GET /api/dashboard/widgets/layout` - Load saved layout
- `POST /api/dashboard/widgets/layout` - Save layout

### Widget Data
- `GET /api/dashboard/widgets/tasks-from-management`
- `GET /api/dashboard/widgets/at-risk-customers`
- `GET /api/dashboard/widgets/revenue-trend`

## Grid Configuration

**Breakpoints**:
- Large (lg): 1200px - 12 columns
- Medium (md): 996px - 10 columns
- Small (sm): 768px - 6 columns
- Extra Small (xs): 480px - 4 columns

**Grid Settings**:
- Row height: 100px
- Margin: 16px
- Container padding: 24px horizontal

## Customization

### Add a New Widget

1. Create widget component in `/widgets/YourWidget.tsx`
2. Register in `WidgetLibrary.tsx`:
```tsx
export const WIDGET_REGISTRY: Record<WidgetType, Widget> = {
  // ... existing widgets
  'your-widget': {
    id: 'your-widget',
    type: 'your-widget',
    component: YourWidget,
    defaultSize: { w: 6, h: 3, minW: 4, minH: 2 }
  }
};
```
3. Create API route in `/api/dashboard/widgets/your-widget/route.ts`
4. Update `WidgetType` union type

### Widget Component Template

```tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

interface YourWidgetProps {
  onRemove?: () => void;
}

export function YourWidget({ onRemove }: YourWidgetProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Your Widget</CardTitle>
        </div>
        {onRemove && (
          <CardAction>
            <Button variant="ghost" size="icon-sm" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {/* Your content here */}
      </CardContent>
    </Card>
  );
}
```

## Testing

```bash
# Run all tests
npm test

# Test specific widget
npm test -- TasksFromManagement.test.tsx

# Test API endpoints
npm test -- api/dashboard/widgets
```

## Documentation

Full documentation: `/docs/dashboard-grid-implementation.md`

## Next Steps

1. Run database migration
2. Test drag-and-drop functionality
3. Verify responsive layout on all breakpoints
4. Test save/restore layout
5. Add more widgets as needed
6. Customize widget data sources

## Support

For issues or questions, see:
- Main documentation: `/docs/dashboard-grid-implementation.md`
- Component examples: `components/DashboardGridExample.tsx`
