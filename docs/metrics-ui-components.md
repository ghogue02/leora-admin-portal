# Metrics Administration UI Components

**Phase:** 1.1 - Metrics Definition System
**Status:** ✅ Complete
**Created:** 2025-10-25

## Overview

This document describes the UI components for the Metrics Administration interface, allowing administrators to define, manage, and version customer metrics for sales operations.

## Components Created

### 1. Main Page (`page.tsx`)

**Location:** `/web/src/app/sales/admin/metrics/page.tsx`

**Features:**
- Tab-based interface for different views (List, Editor, History)
- Create new metric button
- State management for selected metric and active tab
- Refresh trigger for list updates after save
- Clean navigation flow between tabs

**State Management:**
```typescript
- activeTab: 'list' | 'editor' | 'history'
- selectedMetric: MetricDefinition | null
- refreshTrigger: number (incremented to trigger re-fetch)
```

### 2. MetricsList Component

**Location:** `/web/src/app/sales/admin/metrics/MetricsList.tsx`

**Features:**
- Paginated table of all metric definitions
- Real-time search across code, name, and description
- Toggle to show/hide deprecated metrics
- Action menu for each metric (Edit, View History, Deprecate)
- Status badges (Active/Deprecated)
- Version display
- Responsive loading and error states

**Props:**
```typescript
interface MetricsListProps {
  onEdit: (metric: MetricDefinition) => void;
  onViewHistory: (metric: MetricDefinition) => void;
  refreshTrigger?: number;
}
```

**API Integration:**
- `metricsApi.list()` - Get paginated metrics with search
- `metricsApi.deprecate()` - Soft delete a metric

**UI Components Used:**
- Table (shadcn/ui)
- Badge (shadcn/ui)
- DropdownMenu (shadcn/ui)
- Card (shadcn/ui)
- Input (shadcn/ui)
- Button (shadcn/ui)

### 3. MetricEditor Component

**Location:** `/web/src/app/sales/admin/metrics/MetricEditor.tsx`

**Features:**
- Dual mode: Create new or Edit existing metric
- Form validation with react-hook-form
- Auto-versioning for updates (creates new version)
- Code field disabled for edits (immutable)
- Optional formula builder (basic, for Phase 1)
- Dirty state tracking
- Comprehensive error handling

**Props:**
```typescript
interface MetricEditorProps {
  metric: MetricDefinition | null; // null = create mode
  onSave: () => void;
  onCancel: () => void;
}
```

**Form Fields:**
- `code` - Metric identifier (required, immutable after creation)
- `name` - Display name (required)
- `description` - Full definition (required)
- `formulaField` - Optional formula field
- `formulaOperator` - Optional formula operator
- `formulaValue` - Optional formula value

**Validation Rules:**
- Code: lowercase, numbers, underscores only, max 100 chars
- Name: required, max 200 chars
- Description: required, max 2000 chars
- Formula: all three fields required if any is provided

**API Integration:**
- `metricsApi.create()` - Create new metric
- `metricsApi.update()` - Update existing (creates new version)

**UI Components Used:**
- Card (shadcn/ui)
- Input (shadcn/ui)
- Label (shadcn/ui)
- Button (shadcn/ui)
- Form validation (react-hook-form)

### 4. MetricHistory Component

**Location:** `/web/src/app/sales/admin/metrics/MetricHistory.tsx`

**Features:**
- Timeline view of all metric versions
- Expandable version details
- Current version highlighted
- Deprecated version indicators
- Full version comparison
- Formula display for each version
- Effective date tracking

**Props:**
```typescript
interface MetricHistoryProps {
  metricCode: string;
  currentMetric: MetricDefinition;
}
```

**Display Information:**
- Version number with badge
- Effective date
- Current/Deprecated status
- Full description
- Formula details
- Creation timestamp

**API Integration:**
- `metricsApi.get(code, includeHistory=true)` - Get metric with full history

**UI Components Used:**
- Card (shadcn/ui)
- Badge (shadcn/ui)
- Table (shadcn/ui)
- Expandable panels

### 5. API Client Utility

**Location:** `/web/src/lib/api/metrics.ts`

**Features:**
- Type-safe API client for all metric endpoints
- Custom error handling with `MetricsApiError`
- Consistent response handling
- URL parameter building

**Methods:**
```typescript
metricsApi.list(params?) → MetricDefinitionListResponse
metricsApi.get(code, includeHistory?) → MetricDefinition | MetricDefinitionWithHistory
metricsApi.create(data) → MetricDefinition
metricsApi.update(code, data) → MetricDefinition
metricsApi.deprecate(code) → MetricDefinition
```

**Error Handling:**
- `MetricsApiError` - Custom error class with status code
- Automatic error message extraction from API responses
- Toast notifications for all errors

## Integration Details

### API Routes Used

All routes from Phase 1.1 Metrics API:

```
GET    /api/metrics/definitions          - List with search/pagination
POST   /api/metrics/definitions          - Create new metric
GET    /api/metrics/definitions/[code]   - Get specific metric + history
PATCH  /api/metrics/definitions/[code]   - Update (creates new version)
DELETE /api/metrics/definitions/[code]   - Deprecate (soft delete)
```

### Authentication

All components assume admin authentication is handled by Next.js middleware. The API routes use `withAdminSession` middleware.

### Shadcn/UI Components Available

✅ Installed and Used:
- Table
- Card
- Button
- Input
- Label
- Select
- Dialog
- Dropdown Menu
- Badge
- Tabs
- Sonner (toast notifications)
- Form

### Additional Dependencies

- `react-hook-form` - Form validation and state management
- `date-fns` - Date formatting
- `sonner` - Toast notifications
- `lucide-react` - Icons

## User Workflows

### 1. Create New Metric

1. Click "New Metric" button
2. Enter metric code (lowercase, underscores)
3. Enter display name
4. Enter description
5. Optionally add formula
6. Click "Create Metric"
7. Success toast shown
8. Redirected to list view

### 2. Edit Existing Metric

1. Click "..." menu on metric row
2. Select "Edit"
3. Modify name, description, or formula
4. Click "Update (New Version)"
5. New version created with incremented version number
6. Success toast shown
7. Redirected to list view

### 3. View Version History

1. Click "..." menu on metric row
2. Select "View History"
3. See all versions sorted by version number
4. Click any version to expand details
5. Compare changes between versions

### 4. Deprecate Metric

1. Click "..." menu on metric row
2. Select "Deprecate"
3. Confirm deprecation
4. Metric marked as deprecated (soft delete)
5. Still visible when "Show Deprecated" is toggled

### 5. Search Metrics

1. Type in search box
2. Real-time search across code, name, description
3. Results filtered automatically
4. Pagination resets to page 1

## Error Handling

### Loading States
- Spinner with message during initial load
- Button disabled states during operations
- Form submit button shows "Saving..." text

### Error States
- Alert message with error icon
- Clear error description
- Toast notifications for all errors
- "Try Again" button for recoverable errors
- Inline form validation errors

### Edge Cases Handled
- Empty states (no metrics defined)
- No search results
- Network errors
- Validation errors
- Concurrent edits (via versioning)
- Permission errors (from API)

## Performance Considerations

### Optimization Techniques
- Pagination (20 items per page)
- Debounced search (via React state updates)
- Conditional history loading (only when needed)
- Refresh trigger pattern (avoid unnecessary re-fetches)

### Future Optimizations
- Add debounce to search input
- Implement virtual scrolling for large lists
- Add optimistic updates for better UX
- Cache API responses with SWR or React Query

## Testing Checklist

### Manual Testing
- [ ] Create metric with valid data
- [ ] Create metric with invalid data (validation)
- [ ] Edit metric and verify new version created
- [ ] View version history
- [ ] Deprecate metric
- [ ] Search for metrics
- [ ] Paginate through metrics
- [ ] Toggle show/hide deprecated
- [ ] Cancel operations
- [ ] Error recovery flows

### Integration Testing
- [ ] API routes return correct data
- [ ] Authentication works properly
- [ ] Tenant isolation enforced
- [ ] Versioning creates new records
- [ ] Soft delete preserves data

## Next Steps (Phase 1.2)

The following enhancements are planned for Phase 1.2:

1. **Advanced Formula Builder**
   - Visual formula editor
   - Support for complex conditions (AND/OR)
   - Nested conditions
   - Formula validation
   - Formula testing/preview

2. **Metric Templates**
   - Pre-built metric templates
   - Industry-specific metrics
   - Quick create from template

3. **Bulk Operations**
   - Import/export metrics
   - Bulk deprecation
   - Batch updates

4. **Enhanced Search**
   - Filter by status
   - Filter by date range
   - Filter by version
   - Advanced query builder

5. **Audit Trail**
   - Who created/updated each version
   - Change diff viewer
   - Rollback capability

## File Structure

```
/web/src/app/sales/admin/metrics/
├── page.tsx              # Main metrics admin page
├── MetricsList.tsx       # List all metrics table
├── MetricEditor.tsx      # Create/edit form
└── MetricHistory.tsx     # Version history viewer

/web/src/lib/api/
└── metrics.ts            # API client utility

/web/src/types/
└── metrics.ts            # TypeScript interfaces (already exists)

/docs/
└── metrics-ui-components.md  # This documentation
```

## API Documentation Reference

See `/docs/metrics-api-documentation.md` for complete API documentation.

## Memory Key

All implementation details stored in memory with key: `phase1/metrics-ui`

---

**Documentation Version:** 1.0
**Last Updated:** 2025-10-25
