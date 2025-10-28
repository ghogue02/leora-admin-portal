# CARLA UI Components Documentation

## Overview

CARLA (Call Routing & List Assignment) is a comprehensive UI system for managing weekly call plans in the sales application. It allows sales representatives to select up to 75 accounts per week for their call plan.

## Components

### 1. CallPlanHeader

**Location:** `/src/app/sales/call-plan/carla/components/CallPlanHeader.tsx`

**Purpose:** Displays the week navigation controls, selection counter, and action buttons.

**Features:**
- Week navigation (Previous/Next/This Week)
- Running counter showing X/75 accounts selected
- "Create Plan" button (disabled when no accounts selected)
- "Export PDF" button (disabled when no accounts selected)
- Current week indicator badge
- Visual warning when limit (75 accounts) is reached

**Props:**
```typescript
interface CallPlanHeaderProps {
  weekStart: Date;
  weekEnd: Date;
  isCurrentWeek: boolean;
  selectedCount: number;
  maxAccounts: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  onCreatePlan: () => void;
  onExportPDF: () => void;
}
```

### 2. AccountList

**Location:** `/src/app/sales/call-plan/carla/components/AccountList.tsx`

**Purpose:** Displays all available accounts with selection checkboxes and account details.

**Features:**
- Checkbox for each account
- "Select All" / "Deselect All" functionality
- Account type badges (PROSPECT/TARGET/ACTIVE) with color coding:
  - Prospect: Purple outline
  - Target: Blue secondary
  - Active: Green primary
- Priority indicators (HIGH/MEDIUM/LOW) with color coding:
  - High: Red
  - Medium: Yellow
  - Low: Green
- Quick info display:
  - City, State (with MapPin icon)
  - Territory (with TrendingUp icon)
  - Last Order Date (with Calendar icon)
- Visual feedback for selected accounts (blue border and background)
- Empty state message when no accounts match filters

**Props:**
```typescript
interface AccountListProps {
  accounts: Account[];
  onAccountSelect: (accountId: string, selected: boolean) => void;
  onSelectAll: () => void;
}
```

### 3. TerritoryFilter

**Location:** `/src/app/sales/call-plan/carla/components/TerritoryFilter.tsx`

**Purpose:** Filters accounts by territory.

**Features:**
- Dropdown select for territories
- Multi-select capability
- Shows count of selected territories
- Badge chips for selected territories with remove (×) functionality
- "Clear all" button
- "All Territories" option

**Props:**
```typescript
interface TerritoryFilterProps {
  territories: string[];
  selectedTerritories: string[];
  onChange: (territories: string[]) => void;
}
```

### 4. AccountTypeSelector

**Location:** `/src/app/sales/call-plan/carla/components/AccountTypeSelector.tsx`

**Purpose:** Filters accounts by type (PROSPECT/TARGET/ACTIVE).

**Features:**
- Checkbox for each account type
- Color-coded badges:
  - Prospect: Purple
  - Target: Blue
  - Active: Green
- "Select All" / "Clear" toggle
- Shows count of selected types

**Props:**
```typescript
interface AccountTypeSelectorProps {
  selectedTypes: AccountType[];
  onChange: (types: AccountType[]) => void;
}
```

### 5. PriorityFilter

**Location:** `/src/app/sales/call-plan/carla/components/PriorityFilter.tsx`

**Purpose:** Filters accounts by priority level.

**Features:**
- Checkbox for each priority (HIGH/MEDIUM/LOW)
- Color-coded icons:
  - High: Red AlertCircle
  - Medium: Yellow AlertCircle
  - Low: Green AlertCircle
- "Select All" / "Clear" toggle
- Shows count of selected priorities

**Props:**
```typescript
interface PriorityFilterProps {
  selectedPriorities: Priority[];
  onChange: (priorities: Priority[]) => void;
}
```

### 6. SearchBar

**Location:** `/src/app/sales/call-plan/carla/components/SearchBar.tsx`

**Purpose:** Searches accounts by name or account number.

**Features:**
- Text input with search icon
- Clear button (X) that appears when text is entered
- Real-time filtering
- Placeholder: "Search by name or account #"

**Props:**
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}
```

### 7. Main Page Component

**Location:** `/src/app/sales/call-plan/carla/page.tsx`

**Purpose:** Orchestrates all components and manages state.

**Features:**
- Week navigation state management
- Account loading from API
- Filter state management (territory, account type, priority, search)
- Real-time filter application
- Account selection tracking
- Call plan creation
- PDF export (placeholder)

**State Management:**
```typescript
- currentWeekStart: Date
- accounts: Account[]
- filteredAccounts: Account[]
- loading: boolean
- selectedTerritories: string[]
- selectedAccountTypes: AccountType[]
- selectedPriorities: Priority[]
- searchQuery: string
```

## API Endpoints

### GET /api/sales/call-plan/carla/accounts

**Purpose:** Fetch all available accounts for the sales rep.

**Query Parameters:**
- `weekStart`: ISO date string (optional, for future use)

**Response:**
```typescript
{
  accounts: Account[];
  weekStart: string;
}
```

**Account Type Derivation:**
- `ACTIVE`: Customer has lastOrderDate
- `TARGET`: Customer has revenue but no orders
- `PROSPECT`: New customer with no orders/revenue

**Priority Derivation:**
- `HIGH`: Risk status is AT_RISK_CADENCE or AT_RISK_REVENUE
- `MEDIUM`: Risk status is DORMANT
- `LOW`: Risk status is HEALTHY or CLOSED

### POST /api/sales/call-plan/carla/create

**Purpose:** Create a new call plan with selected accounts.

**Request Body:**
```typescript
{
  weekStart: string; // ISO date
  accountIds: string[]; // Max 75
}
```

**Validations:**
- Minimum 1 account required
- Maximum 75 accounts allowed
- Cannot create duplicate plan for same week

**Response:**
```typescript
{
  success: boolean;
  callPlan: {
    id: string;
    name: string;
    weekStart: string;
    accountCount: number;
    tasksCreated: number;
  };
}
```

## Data Types

```typescript
export type AccountType = "PROSPECT" | "TARGET" | "ACTIVE";
export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface Account {
  id: string;
  name: string;
  accountNumber?: string;
  accountType: AccountType;
  priority: Priority;
  city?: string;
  state?: string;
  territory?: string;
  lastOrderDate?: string;
  selected?: boolean;
}
```

## UI Libraries Used

- **shadcn/ui components:**
  - Button
  - Card, CardContent, CardHeader, CardTitle
  - Badge
  - Checkbox
  - Input
  - Label
  - Select (with SelectContent, SelectItem, SelectTrigger, SelectValue)

- **Lucide React icons:**
  - Calendar
  - Download
  - Plus
  - ChevronLeft
  - ChevronRight
  - MapPin
  - TrendingUp
  - Building2
  - AlertCircle
  - Search
  - X

- **Utilities:**
  - `cn()` from `/src/lib/utils.ts` for className merging
  - `date-fns` for date manipulation

## Color Scheme

### Account Types
- **Prospect:** Purple (`purple-50`, `purple-200`, `purple-700`)
- **Target:** Blue (`blue-50`, `blue-200`, `blue-700`)
- **Active:** Green (`green-50`, `green-200`, `green-700`)

### Priority Levels
- **High:** Red (`red-50`, `red-200`, `red-600`)
- **Medium:** Yellow (`yellow-50`, `yellow-200`, `yellow-600`)
- **Low:** Green (`green-50`, `green-200`, `green-600`)

### UI States
- **Selected Account:** Blue (`blue-50`, `blue-300`)
- **Hover:** Gray (`gray-50`)
- **Borders:** Gray (`gray-200`)

## Responsive Design

The UI is built with responsive breakpoints:
- Mobile: Single column layout
- Tablet (md): 2-column filter grid
- Desktop (lg): 4-column filter grid

## Future Enhancements

1. **PDF Export:** Implement actual PDF generation
2. **Bulk Actions:** Add ability to assign activities to multiple accounts
3. **Smart Suggestions:** AI-powered account recommendations
4. **Route Optimization:** Geographic routing suggestions
5. **Activity Templates:** Pre-configured activity sets for different account types
6. **Historical View:** View past week's call plans
7. **Performance Metrics:** Show completion rates and outcomes

## Integration Points

- **Auth:** Uses `withSalesSession` for authentication
- **Database:** Prisma ORM with Customer, CallPlan, and Task models
- **State:** React hooks for local state management
- **Date Handling:** date-fns for week calculations
- **Styling:** Tailwind CSS with shadcn/ui components

## Testing Considerations

1. Test filter combinations (all filters simultaneously)
2. Test selection limits (75 account maximum)
3. Test week navigation edge cases
4. Test empty states (no accounts, no search results)
5. Test API error handling
6. Test duplicate plan prevention
7. Test responsive layouts across devices
