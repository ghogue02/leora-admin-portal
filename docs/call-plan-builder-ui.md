# Call Plan Builder UI - Implementation Documentation

## Overview

The Call Plan Builder interface allows sales representatives to create and manage weekly call plans by selecting accounts from CARLA (Customer Analytics, Risk, and List Assignment) and setting objectives and priorities for each account.

**Created:** October 25, 2025
**Location:** `/src/app/sales/call-plan/components/`
**Phase:** Phase 2 - Call Plan Management

---

## Components Created

### 1. ObjectiveInput.tsx

**Purpose:** Inline objective entry with character limit and pre-populated suggestions

**Features:**
- ✅ 25-character limit for 3-5 word objectives
- ✅ Real-time character counter with visual warning near limit
- ✅ Suggestion popover based on customer type (ACTIVE, TARGET, PROSPECT)
- ✅ Auto-save on blur
- ✅ Accessible keyboard navigation

**Customer Type Suggestions:**

```typescript
ACTIVE: [
  "Upsell new products",
  "Increase order frequency",
  "Expand product mix",
  "Review pricing tier",
  "Discuss promotions"
]

TARGET: [
  "Reactivate account",
  "Win back business",
  "Address concerns",
  "Present new offerings",
  "Schedule tasting"
]

PROSPECT: [
  "Initial introduction",
  "Needs assessment",
  "Product presentation",
  "Schedule tasting",
  "Build relationship"
]
```

**Usage:**

```tsx
<ObjectiveInput
  value={objective}
  onChange={(value) => setObjective(value)}
  onSave={(value) => saveObjective(value)}
  customerType="ACTIVE"
  placeholder="Enter call objective..."
/>
```

---

### 2. CallPlanBuilder.tsx

**Purpose:** Main builder interface for creating and editing weekly call plans

**Features:**
- ✅ Display selected accounts from CARLA
- ✅ Running count vs target (e.g., "54/75 accounts")
- ✅ Progress bar with visual feedback
- ✅ Over-target warning indicator
- ✅ Objective input for each account
- ✅ Priority assignment per account (LOW, MEDIUM, HIGH)
- ✅ Multiple view modes:
  - All accounts (flat list)
  - By Territory (grouped by location)
  - By Priority (grouped HIGH → MEDIUM → LOW)
  - By Type (grouped by account type)

**View Modes:**

1. **All View:** Simple list of all accounts
2. **Territory View:** Accounts grouped by territory/location
3. **Priority View:** Accounts grouped by priority level
4. **Type View:** Accounts grouped by ACTIVE/TARGET/PROSPECT

**Props:**

```typescript
interface CallPlanBuilderProps {
  selectedAccounts: CallPlanAccount[];
  targetCount?: number;           // Default: 75
  weekNumber: number;
  year: number;
  callPlanId?: string;            // For editing existing plans
  onSave?: (callPlan: SavedCallPlan) => void;
}
```

**Usage:**

```tsx
<CallPlanBuilder
  selectedAccounts={accounts}
  targetCount={75}
  weekNumber={42}
  year={2025}
  callPlanId={existingPlanId}
  onSave={(plan) => console.log('Saved:', plan)}
/>
```

---

### 3. CallPlanSummary.tsx

**Purpose:** Summary view and export interface for completed call plans

**Features:**
- ✅ Statistics display:
  - Total account count
  - Breakdown by account type
  - Breakdown by priority
  - Breakdown by territory (top 5)
- ✅ Detailed account table (sorted by priority)
- ✅ Export to PDF button (placeholder)
- ✅ Print functionality (CSS optimized)
- ✅ Email list export (CSV format)
- ✅ Back to editor navigation

**Statistics Displayed:**

```
By Account Type:
- ACTIVE: X accounts
- TARGET: Y accounts
- PROSPECT: Z accounts

By Priority:
- HIGH: X accounts
- MEDIUM: Y accounts
- LOW: Z accounts

By Territory:
- Territory 1: X accounts
- Territory 2: Y accounts
- ... (top 5)
```

**Export Features:**

1. **Print:** Browser print with optimized CSS
2. **CSV Export:** Downloads account list with name, account #, priority
3. **PDF Export:** Placeholder for future implementation

**Props:**

```typescript
interface CallPlanSummaryProps {
  accounts: Array<CallPlanAccount & {
    objective: string;
    priority: "LOW" | "MEDIUM" | "HIGH"
  }>;
  weekNumber: number;
  year: number;
  onBack?: () => void;
}
```

---

## API Integration

### API Client Library

**Location:** `/src/lib/api/call-plans.ts`

**Available Methods:**

```typescript
// List and retrieve
callPlanAPI.list(query?: ListCallPlansQuery)
callPlanAPI.get(id: string)

// Create and update
callPlanAPI.create(data: CreateCallPlanInput)
callPlanAPI.update(id: string, data: UpdateCallPlanInput)
callPlanAPI.delete(id: string)

// Account management
callPlanAPI.getAccounts(id: string, page?, pageSize?)
callPlanAPI.addAccount(callPlanId: string, data: AddAccountToCallPlanInput)
callPlanAPI.addAccounts(callPlanId: string, accounts: AddAccountToCallPlanInput[])
callPlanAPI.updateAccount(callPlanId: string, accountId: string, data: UpdateCallPlanAccountInput)
callPlanAPI.removeAccount(callPlanId: string, accountId: string)

// Bulk operations
callPlanAPI.categorize(data: CategorizeCustomersInput)
callPlanAPI.saveComplete(completeCallPlanData)
```

### Example API Usage

**Creating a Call Plan:**

```typescript
import { callPlanAPI } from "@/lib/api/call-plans";

// Create call plan with accounts
const callPlan = await callPlanAPI.saveComplete({
  week: 42,
  year: 2025,
  name: "Week 42 Territory Northwest",
  accounts: [
    {
      customerId: "customer-uuid-1",
      objective: "Upsell new products",
      priority: "HIGH"
    },
    {
      customerId: "customer-uuid-2",
      objective: "Reactivate account",
      priority: "MEDIUM"
    }
  ]
});
```

**Updating Objectives:**

```typescript
await callPlanAPI.updateAccount(
  callPlanId,
  accountId,
  {
    objective: "Discuss promotions",
    priority: "HIGH"
  }
);
```

---

## Types and Schemas

**Location:** `/src/types/call-plan.ts`

**Key Types:**

```typescript
// Request types
CreateCallPlanInput
UpdateCallPlanInput
AddAccountToCallPlanInput
UpdateCallPlanAccountInput
CategorizeCustomersInput
ListCallPlansQuery

// Response types
CallPlanSummary
CallPlanAccount
CallPlanDetail
CallPlanListResponse
CallPlanAccountsResponse
```

All types include Zod schemas for runtime validation.

---

## UI/UX Design Patterns

### shadcn/ui Components Used

- **Card, CardHeader, CardTitle, CardContent, CardDescription** - Layout
- **Button** - Actions and triggers
- **Badge** - Status indicators
- **Select, SelectTrigger, SelectContent, SelectItem** - Priority selection
- **Tabs, TabsList, TabsTrigger, TabsContent** - View mode switching
- **Progress** - Account count visualization
- **Input, Label** - Form fields
- **Popover, PopoverTrigger, PopoverContent** - Suggestion menu
- **Table** - Summary data display
- **Checkbox** - Account selection (in CARLA)

### Color Scheme

**Priority Colors:**
- HIGH: Red (`text-red-600 bg-red-50 border-red-200`)
- MEDIUM: Yellow (`text-yellow-600 bg-yellow-50 border-yellow-200`)
- LOW: Green (`text-green-600 bg-green-50 border-green-200`)

**Badge Variants:**
- ACTIVE accounts: `default` (primary color)
- TARGET/PROSPECT: `outline` (border only)

---

## User Workflow

### Creating a Call Plan

1. **Select Accounts in CARLA** (`/sales/call-plan/carla`)
   - Filter by territory, type, priority
   - Search for specific accounts
   - Select target accounts (up to target count)

2. **Build Call Plan** (CallPlanBuilder component)
   - Review selected accounts
   - Set objective for each account (3-5 words)
   - Assign priority (HIGH/MEDIUM/LOW)
   - Group by territory/priority/type as needed

3. **Review Summary** (CallPlanSummary component)
   - View statistics
   - Export to PDF/CSV
   - Print for reference

4. **Save Plan**
   - API creates call plan record
   - Accounts linked with objectives/priorities
   - Plan available for weekly execution

---

## Integration Points

### Backend API Routes

**Expected to be created by backend-dev agent:**

```
POST   /api/call-plans                    - Create call plan
GET    /api/call-plans                    - List call plans
GET    /api/call-plans/:id                - Get call plan details
PUT    /api/call-plans/:id                - Update call plan
DELETE /api/call-plans/:id                - Delete call plan

GET    /api/call-plans/:id/accounts       - Get call plan accounts
POST   /api/call-plans/:id/accounts       - Add account
POST   /api/call-plans/:id/accounts/bulk  - Add multiple accounts
PUT    /api/call-plans/:id/accounts/:accountId - Update account
DELETE /api/call-plans/:id/accounts/:accountId - Remove account

POST   /api/call-plans/categorize         - Categorize customers
```

**Check memory key:** `phase2/call-plan-api` for backend implementation details

---

## Testing Recommendations

### Unit Tests

- ObjectiveInput character limit enforcement
- ObjectiveInput suggestion filtering by customer type
- CallPlanBuilder account grouping logic
- CallPlanSummary statistics calculations
- API client error handling

### Integration Tests

- Complete call plan creation flow
- Account objective updates
- CSV export functionality
- Print functionality

### E2E Tests

- CARLA → Builder → Summary workflow
- Save and reload call plan
- Export features

---

## Future Enhancements

### Short-term (Phase 2)
- ✅ PDF export implementation
- ✅ Email integration for sending plans
- ✅ Drag-and-drop account reordering
- ✅ Templates for common objectives

### Long-term (Phase 3+)
- AI-suggested objectives based on account history
- Bulk objective assignment
- Call plan templates by territory
- Integration with calendar for scheduling
- Mobile app for field reps

---

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels for screen readers
- ✅ Focus management in popovers
- ✅ Color contrast WCAG AA compliant
- ✅ Print-optimized layouts

---

## Performance Considerations

- Component memoization for large account lists
- Virtual scrolling for 100+ accounts
- Debounced objective input
- Optimistic UI updates
- API request batching for bulk operations

---

## Maintenance Notes

- Update objective suggestions seasonally
- Monitor character limit effectiveness
- Track most-used objectives for template creation
- Review API performance with large call plans (100+ accounts)

---

## Files Created

```
/src/app/sales/call-plan/components/
  ├── ObjectiveInput.tsx           (145 lines)
  ├── CallPlanBuilder.tsx          (380 lines)
  └── CallPlanSummary.tsx          (318 lines)

/src/lib/api/
  └── call-plans.ts                (260 lines)

/docs/
  └── call-plan-builder-ui.md      (This file)
```

**Total:** 4 files, ~1,100+ lines of production code

---

## Support

For questions or issues:
- Check API integration docs in backend memory (`phase2/call-plan-api`)
- Review type definitions in `/src/types/call-plan.ts`
- See CARLA components for account selection patterns

**Last Updated:** October 25, 2025
