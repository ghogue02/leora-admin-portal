# CARLA Account Selection - Testing Plan

## Test Cases

### 1. Account Selection Modal

#### TC-001: Open Selection Modal
**Steps**:
1. Navigate to `/sales/call-plan/carla`
2. Click "Select Accounts" button
**Expected**: Modal opens with full list of accounts

#### TC-002: Search Functionality
**Steps**:
1. Open selection modal
2. Type "ABC" in search box
3. Verify filtered results
4. Clear search
**Expected**:
- Only accounts with "ABC" in name/number show
- Clear button removes filter
- Account count updates

#### TC-003: Territory Filter
**Steps**:
1. Open selection modal
2. Click territory badge (e.g., "North")
3. Verify filtered results
4. Click badge again to deselect
**Expected**: Only accounts in selected territories show

#### TC-004: Account Type Filter
**Steps**:
1. Open modal
2. Select "Active" account type
3. Select "Target" account type
4. Deselect "Active"
**Expected**: Filters work independently and combine correctly

#### TC-005: Priority Filter
**Steps**:
1. Open modal
2. Select "High" priority
3. Verify only high priority accounts show
**Expected**: Filter applies correctly

#### TC-006: Combined Filters
**Steps**:
1. Open modal
2. Search: "Wine"
3. Territory: "North"
4. Type: "Active"
5. Priority: "High"
**Expected**: All filters combine with AND logic

#### TC-007: Select Single Account
**Steps**:
1. Open modal
2. Click checkbox for one account
3. Verify counter increases
**Expected**: Counter shows "1 / 75", account highlighted

#### TC-008: Select Multiple Accounts
**Steps**:
1. Open modal
2. Click 5 different account checkboxes
**Expected**: Counter shows "5 / 75", all highlighted

#### TC-009: Select All Visible
**Steps**:
1. Open modal with 50 accounts shown
2. Click "Select Visible" button
**Expected**: All 50 accounts selected, counter updates

#### TC-010: Deselect All Visible
**Steps**:
1. Have 20 accounts selected
2. Filter to show 10 of them
3. Click "Deselect Visible"
**Expected**: Those 10 deselected, 10 remain selected

#### TC-011: Clear All Selections
**Steps**:
1. Select 30 accounts
2. Click "Clear All"
**Expected**: All selections cleared, counter shows "0 / 75"

#### TC-012: Maximum Account Limit
**Steps**:
1. Select 75 accounts
2. Try to select one more
**Expected**: Alert shows "Maximum 75 accounts", selection prevented

#### TC-013: Save Selections
**Steps**:
1. Select 10 accounts
2. Click "Add 10 Accounts to Plan"
**Expected**:
- Toast: "Successfully added X accounts"
- Modal closes
- Weekly view shows selected accounts

#### TC-014: Cancel Selection
**Steps**:
1. Select 15 accounts
2. Click "Cancel" or X
**Expected**: Modal closes, no changes saved

#### TC-015: Persistent Selections Across Modal Opens
**Steps**:
1. Select 20 accounts
2. Save and close
3. Reopen modal
**Expected**: Same 20 accounts still selected

### 2. Weekly Accounts View

#### TC-016: Display Selected Accounts
**Steps**:
1. Select 5 accounts via modal
2. Save
**Expected**: WeeklyAccountsView shows all 5 accounts

#### TC-017: Empty State
**Steps**:
1. Navigate to CARLA page with no selections
**Expected**: "No accounts selected" message with instructions

#### TC-018: Mark Contact Outcome - Not Attempted
**Steps**:
1. Select account
2. Click "Not Attempted" button
**Expected**: Status updates, icon changes to gray circle

#### TC-019: Mark Contact Outcome - Left Message
**Steps**:
1. Click "Left Message" button on account
**Expected**:
- Status updates
- Blue MessageSquare icon shows
- Contacted count increases
- contactedAt timestamp saved

#### TC-020: Mark Contact Outcome - Spoke
**Steps**:
1. Click "Spoke with Contact" button
**Expected**: Green CheckCircle2 icon, contacted count +1

#### TC-021: Mark Contact Outcome - In-Person Visit
**Steps**:
1. Click "In-Person Visit" button
**Expected**:
- Purple CheckCircle2 icon
- Both contacted and visited counts increase

#### TC-022: Mark Contact Outcome - Email Sent
**Steps**:
1. Click "Email Sent" button
**Expected**: Yellow MessageSquare icon, contacted count +1

#### TC-023: Contact Outcome Persistence
**Steps**:
1. Mark account as "Spoke"
2. Refresh page
**Expected**: Status persists, still shows as "Spoke"

#### TC-024: Contacted Count Accuracy
**Steps**:
1. Select 10 accounts
2. Mark 3 as "Spoke", 2 as "In-Person", 1 as "Left Message"
**Expected**: Header shows "6 Contacted"

#### TC-025: Visited Count Accuracy
**Steps**:
1. Mark 5 accounts as "In-Person Visit"
**Expected**: Header shows "5 Visited"

#### TC-026: Remove Account from Plan
**Steps**:
1. Have 15 accounts selected
2. Click X on one account
**Expected**:
- Confirm prompt (optional)
- Account removed
- Counter shows "14 / 75"

#### TC-027: Show/Hide Notes
**Steps**:
1. Account has notes
2. Click "Show Notes"
3. Click "Hide Notes"
**Expected**: Notes expand and collapse

### 3. Header & Counter

#### TC-028: Counter Color - Red (< 60)
**Steps**:
1. Select 30 accounts
**Expected**: Counter shows red background, "Below target" text

#### TC-029: Counter Color - Yellow (60-69)
**Steps**:
1. Select 65 accounts
**Expected**: Counter shows yellow background, "Good progress" text

#### TC-030: Counter Color - Green (70-75)
**Steps**:
1. Select 72 accounts
**Expected**: Counter shows green background, "✓ Target range" text

#### TC-031: Limit Reached Badge
**Steps**:
1. Select exactly 75 accounts
**Expected**: Red "Limit Reached" badge shows

#### TC-032: Counter Updates Real-time
**Steps**:
1. Open modal, select 1 account at a time
**Expected**: Both modal and header counters update instantly

### 4. Week Navigation

#### TC-033: Previous Week
**Steps**:
1. On current week with 20 accounts
2. Click "Previous"
**Expected**:
- Week dates update
- Counter shows accounts for that week (likely 0)
- "This Week" button appears

#### TC-034: Next Week
**Steps**:
1. Click "Next" button
**Expected**: Week advances, counter for that week shown

#### TC-035: Return to This Week
**Steps**:
1. Navigate to previous week
2. Click "This Week"
**Expected**: Returns to current week, counter shows current selections

#### TC-036: Week-Specific Selections
**Steps**:
1. Current week: select 20 accounts
2. Next week: select 15 different accounts
3. Navigate between weeks
**Expected**: Each week maintains separate selections

#### TC-037: Current Week Badge
**Steps**:
1. Navigate to current week
**Expected**: "Current Week" badge shows in header

### 5. Data Persistence & API

#### TC-038: Save Creates CallPlan
**Steps**:
1. First-time selection for a week
2. Save 10 accounts
**Expected**:
- CallPlan record created
- 10 CallPlanAccount records created
- Correct weekStart date

#### TC-039: Save Updates Existing CallPlan
**Steps**:
1. Have existing plan with 20 accounts
2. Add 5 more accounts
**Expected**:
- Existing CallPlan updated
- 5 new CallPlanAccount records
- Total: 25 accounts

#### TC-040: Remove Account Deletes Record
**Steps**:
1. Remove account from plan
**Expected**: CallPlanAccount record deleted from database

#### TC-041: Contact Outcome Updates Record
**Steps**:
1. Mark account as "Spoke"
**Expected**:
- contactOutcome field updates to "SPOKE_WITH_CONTACT"
- contactedAt timestamp saved

#### TC-042: Multiple Users Don't Interfere
**Steps**:
1. User A selects 20 accounts
2. User B selects 30 accounts (same week)
**Expected**: Each user has separate plans, no conflicts

#### TC-043: Tenant Isolation
**Steps**:
1. Tenant A: 1,000 customers
2. Tenant B: 500 customers
**Expected**: Each sees only their own customers

### 6. Error Handling

#### TC-044: API Failure on Save
**Steps**:
1. Disconnect network
2. Try to save selections
**Expected**: Toast error: "Failed to save account selection"

#### TC-045: API Failure on Load
**Steps**:
1. Simulate 500 error
2. Try to load accounts
**Expected**: Toast error: "Failed to load accounts"

#### TC-046: Invalid Contact Outcome
**Steps**:
1. Send invalid contactOutcome value via API
**Expected**: 400 error with helpful message

#### TC-047: Duplicate Account Selection
**Steps**:
1. Try to add same account twice via API
**Expected**: No duplicate created (unique constraint)

### 7. Performance

#### TC-048: Load 1,907 Accounts
**Steps**:
1. Open modal with full customer list
**Expected**: Loads in < 2 seconds, scrolling smooth

#### TC-049: Filter 1,000+ Results
**Steps**:
1. Type in search with many results
**Expected**: Filters instantly (< 500ms)

#### TC-050: Save 75 Accounts
**Steps**:
1. Select maximum 75 accounts
2. Click save
**Expected**: Completes in < 3 seconds

## Test Data Setup

### Sample Accounts Needed
- 100 accounts across 5 territories
- Mix of PROSPECT, TARGET, ACTIVE types
- Mix of HIGH, MEDIUM, LOW priorities
- Various last order dates
- Some with/without account numbers

### Sample Week Scenarios
- Week 1: No existing plan
- Week 2: Existing plan with 50 accounts
- Week 3: Existing plan with 75 accounts (at limit)

## Automated Test Scripts

### Jest Unit Tests
```bash
npm test -- AccountSelectionModal.test.tsx
npm test -- WeeklyAccountsView.test.tsx
npm test -- CallPlanHeader.test.tsx
```

### API Integration Tests
```bash
npm test -- carla-api.test.ts
```

### E2E Tests (Playwright)
```bash
npx playwright test carla-account-selection.spec.ts
```

## Success Criteria

- ✅ All 50 test cases pass
- ✅ No console errors
- ✅ Page loads in < 3 seconds
- ✅ API responses < 2 seconds
- ✅ UI responsive on mobile
- ✅ Accessibility score > 90
- ✅ No memory leaks on repeated use

---

**Status**: Ready for QA
**Priority**: P0 (Critical - Core Feature)
**Assigned**: QA Team
