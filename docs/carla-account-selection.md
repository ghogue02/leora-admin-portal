# CARLA Account Selection System - Documentation

## Overview

The CARLA (Call Routing & List Assignment) account selection system enables sales reps to select 70-75 customer accounts for weekly call planning. This system provides a modern, user-friendly interface with comprehensive filtering, selection management, and contact tracking capabilities.

## Key Features

### 1. Account Selection Modal
- **Full-screen modal interface** for selecting accounts
- **Real-time search** by customer name or account number
- **Advanced filtering** by territory, account type, and priority
- **Bulk actions**: Select All, Deselect All, Clear All
- **Visual feedback**: Selected accounts highlighted with blue background
- **Account limit enforcement**: Maximum 75 accounts with warnings
- **Color-coded counter**:
  - Red (< 60 accounts): Below recommended minimum
  - Yellow (60-69 accounts): Good progress
  - Green (70-75 accounts): Target range

### 2. Weekly Call Plan View
- **List view** of selected accounts for the week
- **Contact tracking** with 5 outcome types:
  - Not Attempted
  - Left Message
  - Spoke with Contact
  - In-Person Visit
  - Email Sent
- **Visual status indicators**: Icons and colors for each outcome
- **Progress tracking**: Shows contacted count and visited count
- **Account removal**: Quick remove from plan
- **Notes display**: Expandable notes for each account

### 3. Enhanced Header
- **Color-coded account counter**: Real-time visual feedback
- **Week navigation**: Previous, Next, This Week buttons
- **Primary "Select Accounts" button**: Opens selection modal
- **Save Plan**: Auto-saves selections to database
- **Export PDF**: (Coming soon)

## Component Architecture

### New Components

#### 1. AccountSelectionModal.tsx
**Location**: `/web/src/app/sales/call-plan/carla/components/AccountSelectionModal.tsx`

**Props**:
```typescript
interface AccountSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  selectedAccountIds: Set<string>;
  onSave: (selectedIds: string[]) => void;
  maxAccounts?: number; // Default: 75
}
```

**Features**:
- Full-screen dialog with scrollable account list
- Search bar with clear button
- Filter chips for territory, account type, priority
- Real-time filtered account count
- Bulk selection actions
- Color-coded selection counter
- Responsive design for mobile

#### 2. WeeklyAccountsView.tsx
**Location**: `/web/src/app/sales/call-plan/carla/components/WeeklyAccountsView.tsx`

**Props**:
```typescript
interface WeeklyAccountsViewProps {
  accounts: SelectedAccount[];
  callPlanId?: string;
  onContactUpdate: (customerId: string, outcome: string, notes?: string) => void;
  onRemoveAccount?: (customerId: string) => void;
}
```

**Features**:
- Card-based layout for each selected account
- Contact outcome buttons (5 types)
- Visual status icons (Circle, MessageSquare, CheckCircle2)
- Contacted/Visited badges in header
- Expandable notes section
- Remove account button
- Empty state when no accounts selected

### Updated Components

#### 3. CallPlanHeader.tsx
**Enhanced with**:
- `onSelectAccounts` prop for modal trigger
- Color-coded account counter with helper text
- Visual feedback based on account count
- Larger "Select Accounts" primary button

### API Routes

#### 1. Account Management Route
**Location**: `/web/src/app/api/sales/call-plan/carla/accounts/manage/route.ts`

**Endpoints**:

**POST** - Add accounts to call plan
```typescript
Request Body:
{
  weekStart: string (ISO date),
  accountIds: string[]
}

Response:
{
  success: true,
  callPlan: {
    id: string,
    name: string,
    weekStart: string,
    totalAccounts: number,
    newAccountsAdded: number,
    existingAccounts: number
  }
}
```

**DELETE** - Remove accounts from call plan
```typescript
Request Body:
{
  weekStart: string (ISO date),
  accountIds: string[]
}

Response:
{
  success: true,
  accountsRemoved: number,
  remainingAccounts: number
}
```

**GET** - Get selected accounts for a week
```typescript
Query Params: weekStart (ISO date)

Response:
{
  selectedAccountIds: string[],
  accounts: SelectedAccount[],
  callPlan: {
    id: string,
    name: string,
    status: string,
    targetCount: number
  }
}
```

#### 2. Contact Tracking Route
**Location**: `/web/src/app/api/sales/call-plan/carla/accounts/contact/route.ts`

**PUT** - Update contact outcome
```typescript
Request Body:
{
  callPlanId: string,
  customerId: string,
  contactOutcome: "NOT_ATTEMPTED" | "LEFT_MESSAGE" | "SPOKE_WITH_CONTACT" | "IN_PERSON_VISIT" | "EMAIL_SENT",
  notes?: string
}

Response:
{
  success: true,
  account: {
    customerId: string,
    customerName: string,
    contactOutcome: string,
    contactedAt?: string,
    notes?: string
  }
}
```

## Database Schema

### CallPlanAccount Table (Existing)
```prisma
model CallPlanAccount {
  id             String          @id @default(dbgenerated("gen_random_uuid()"))
  tenantId       String
  callPlanId     String
  customerId     String
  objective      String?
  addedAt        DateTime        @default(now())
  contactOutcome ContactOutcome  @default(NOT_ATTEMPTED)
  contactedAt    DateTime?
  notes          String?

  @@unique([callPlanId, customerId])
}
```

**Contact Outcomes**:
- `NOT_ATTEMPTED` - Default state
- `LEFT_MESSAGE` - Left voicemail or message
- `SPOKE_WITH_CONTACT` - Had a phone conversation
- `IN_PERSON_VISIT` - Visited in person
- `EMAIL_SENT` - Sent email communication

## User Workflow

### 1. Selecting Accounts
1. Navigate to CARLA Call Plan page (`/sales/call-plan/carla`)
2. Click **"Select Accounts"** button in header
3. Modal opens with all available accounts (1,907 customers)
4. Use search bar to find specific accounts
5. Apply filters (territory, account type, priority)
6. Click checkboxes or use "Select Visible" for bulk selection
7. Watch counter update with color feedback
8. Click **"Add X Accounts to Plan"** to save
9. Modal closes, selections persist to database

### 2. Managing Weekly Plan
1. View selected accounts in WeeklyAccountsView component
2. See contacted/visited counts in header
3. Click outcome buttons to mark contact status:
   - **Not Attempted** (gray)
   - **Left Message** (blue)
   - **Spoke** (green)
   - **In-Person** (purple)
   - **Email Sent** (yellow)
4. Remove accounts by clicking X button
5. Plan auto-saves to database

### 3. Week Navigation
1. Use **Previous/Next** buttons to view other weeks
2. Click **"This Week"** to return to current week
3. Each week maintains separate account selections
4. Counter shows accounts for currently viewed week

## Color Coding System

### Account Counter
- **Red Background** (< 60 accounts): "Below target (60-75)"
- **Yellow Background** (60-69 accounts): "Good progress"
- **Green Background** (70-75 accounts): "✓ Target range"

### Contact Status
- **Gray** - Not Attempted (Circle icon)
- **Blue** - Left Message (MessageSquare icon)
- **Green** - Spoke with Contact (CheckCircle2 icon)
- **Purple** - In-Person Visit (CheckCircle2 icon)
- **Yellow** - Email Sent (MessageSquare icon)

## Testing Checklist

### Account Selection
- [ ] Open modal with "Select Accounts" button
- [ ] Search finds accounts by name and number
- [ ] Filters work correctly (territory, type, priority)
- [ ] Checkbox selection works
- [ ] "Select All" selects all visible accounts
- [ ] "Clear All" clears all selections
- [ ] Counter updates in real-time
- [ ] Cannot select more than 75 accounts
- [ ] Save persists to database
- [ ] Modal closes after save

### Weekly View
- [ ] Shows selected accounts after save
- [ ] Contact outcome buttons work
- [ ] Status updates persist to database
- [ ] Contacted/visited counts are accurate
- [ ] Remove account works
- [ ] Notes display correctly
- [ ] Empty state shows when no accounts

### Week Navigation
- [ ] Previous/Next buttons work
- [ ] "This Week" returns to current week
- [ ] Each week has separate selections
- [ ] Counter shows correct count for week

### Visual Feedback
- [ ] Counter shows correct color (red/yellow/green)
- [ ] Helper text updates with count
- [ ] Selected accounts highlighted in modal
- [ ] Contact status icons show correctly
- [ ] Toast notifications appear on actions

## Performance Considerations

1. **Lazy Loading**: Modal only loads when opened
2. **Memoization**: Filtered accounts use useMemo
3. **Optimistic Updates**: UI updates before server response
4. **Batch Operations**: Multiple selections saved in one request
5. **Indexed Queries**: Database queries use tenantId, callPlanId indexes

## Future Enhancements

1. **Health Status Filter**: Filter by customer risk status
2. **Last Contact Filter**: Filter by last contact date ranges
3. **Revenue Filter**: Filter by account revenue
4. **Multi-week Planning**: Copy selections to future weeks
5. **PDF Export**: Export call plan to PDF
6. **Mobile Optimization**: Enhanced mobile UI
7. **Drag & Drop**: Reorder accounts by priority
8. **Calendar View**: Show accounts on calendar grid
9. **Route Optimization**: Suggest optimal visit order by geography
10. **Analytics**: Track completion rates and effectiveness

## Troubleshooting

### Accounts Not Saving
- Check browser console for API errors
- Verify tenantId and userId are set
- Ensure weekStart date is valid
- Check database connection

### Counter Not Updating
- Verify loadSelectedAccounts() is called after save
- Check selectedAccountIds state
- Ensure API returns correct data format

### Modal Not Opening
- Check isModalOpen state
- Verify Button onClick handler
- Check for JavaScript errors in console

### Contact Status Not Persisting
- Ensure callPlanId is defined
- Verify API endpoint is correct
- Check contactOutcome values match schema

## Support

For issues or questions:
1. Check browser console for errors
2. Review API response in Network tab
3. Verify database schema matches documentation
4. Test with reduced account count (< 10)
5. Check toast notifications for error messages

---

**Last Updated**: October 26, 2025
**Version**: 1.0.0
**Status**: Production Ready
