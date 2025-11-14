# CRM-47: Major Change Notes Feature - Testing Guide

**Feature**: Permanent Major Change Notes Panel
**Status**: Ready for Testing
**Last Updated**: 2025-11-13

---

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Test Scenarios](#test-scenarios)
3. [Acceptance Criteria Checklist](#acceptance-criteria-checklist)
4. [Known Issues & Limitations](#known-issues--limitations)
5. [Rollback Instructions](#rollback-instructions)

---

## 🚀 Setup Instructions

### Step 1: Add ActivityType to Database

Run the SQL script to add the new "Major Change" activity type:

```bash
# From project root
psql $DATABASE_URL -f web/scripts/add-major-change-activity-type.sql
```

**Expected Output**:
```
INSERT 0 1
```

**Verification Query**:
```sql
SELECT id, name, icon, color_class
FROM "ActivityType"
WHERE name = 'Major Change';
```

**Expected Result**:
```
id | name         | icon           | color_class
---+--------------+----------------+-------------
13 | Major Change | fa-flag-banner | text-red-600
```

### Step 2: Seed Test Data

Run the seed script to create sample major change notes:

```bash
# From web directory
cd web
npx tsx scripts/seed-major-changes.ts
```

**Expected Output**:
```
🌱 Seeding major change notes...
✅ Seeded 3 major change notes for customer [ID]
✨ Done!
```

### Step 3: Verify Database

Check that the major changes were created:

```sql
-- View all major change activities
SELECT
  a.id,
  a.customer_id,
  a.notes,
  a.created_at,
  at.name as activity_type,
  u.name as created_by
FROM "Activity" a
JOIN "ActivityType" at ON a.activity_type_id = at.id
JOIN "User" u ON a.created_by = u.id
WHERE at.name = 'Major Change'
ORDER BY a.created_at DESC;
```

### Step 4: Start Development Server

```bash
cd web
npm run dev
```

Navigate to any customer detail page to begin testing.

---

## 🧪 Test Scenarios

### Test 1: Verify Major Change Notes Panel Display

**Objective**: Confirm that major change notes appear in the permanent panel.

**Steps**:
1. Navigate to a customer detail page with major changes
2. Locate the "Major Change Notes" panel above the activity form
3. Verify the panel displays

**Expected Results**:
- ✅ Panel appears above the activity form
- ✅ Panel has a white background with red border (`border-red-200`)
- ✅ Panel title shows "Major Change Notes" with flag icon
- ✅ All major changes are listed in reverse chronological order
- ✅ Each note shows:
  - Red flag icon
  - Formatted date (e.g., "Jan 15, 2024")
  - Creator's name
  - Full note text
  - "View in Timeline" link

**Screenshot Checklist**:
- [ ] Panel is visually distinct from activity timeline
- [ ] Red styling is consistent throughout
- [ ] Text is readable and well-formatted

---

### Test 2: Create a New Major Change Note

**Objective**: Test creating a major change note and verify it appears correctly.

**Steps**:
1. Scroll to the activity form at the bottom of the page
2. Select "Major Change" from the activity type dropdown
3. Enter test note: "Testing major change functionality - do not delete"
4. Click "Add Activity"
5. Wait for the page to reload/update

**Expected Results**:
- ✅ Note appears in the Major Change Notes panel
- ✅ Note appears at the top of the list (most recent first)
- ✅ Note shows current date and your user name
- ✅ Note text matches what you entered
- ✅ "View in Timeline" link is present

**Verification Query**:
```sql
SELECT * FROM "Activity"
WHERE notes LIKE '%Testing major change functionality%'
AND activity_type_id = 13;
```

---

### Test 3: View in Timeline - Scroll Functionality

**Objective**: Verify the "View in Timeline" link scrolls to the correct activity.

**Steps**:
1. Locate a major change note in the panel
2. Click the "View in Timeline" link
3. Observe the scroll behavior

**Expected Results**:
- ✅ Page smoothly scrolls to the activity in the timeline
- ✅ The corresponding activity is highlighted or flashes
- ✅ The activity in the timeline has special styling (red badge, border)
- ✅ Scroll position places the activity near the top of the viewport

**Edge Cases**:
- Test with the first major change (top of timeline)
- Test with the last major change (bottom of timeline)
- Test with a major change in the middle

---

### Test 4: Major Change Styling in Timeline

**Objective**: Confirm major changes have distinct visual styling in the activity timeline.

**Steps**:
1. Scroll through the activity timeline
2. Identify activities with "Major Change" type
3. Compare styling with other activity types

**Expected Results**:
- ✅ Major change activities have:
  - Red flag icon (`fa-flag-banner`)
  - Red badge with "Major Change" text
  - Red left border (`border-l-4 border-red-500`)
  - Subtle red background tint (`bg-red-50`)
- ✅ Styling is consistent across all major change entries
- ✅ Other activity types do NOT have this styling

**Visual Comparison**:
| Activity Type | Icon Color | Border | Background |
|--------------|------------|--------|------------|
| Major Change | Red        | Red    | Light Red  |
| Other Types  | Various    | None   | White      |

---

### Test 5: Multiple Major Changes

**Objective**: Test behavior with multiple major change notes.

**Steps**:
1. Create 5 new major change notes with different content:
   - "Price adjustment: increased by 10%"
   - "Payment terms changed to Net 60"
   - "New contact: John Smith added"
   - "Credit limit reduced to $5,000"
   - "Account status changed to Hold"
2. Observe the panel and timeline

**Expected Results**:
- ✅ All 5 notes appear in the Major Change Notes panel
- ✅ Notes are in reverse chronological order (newest first)
- ✅ Panel remains scrollable if content exceeds height
- ✅ All 5 notes appear in the timeline with special styling
- ✅ Each "View in Timeline" link works correctly

**Performance Check**:
- [ ] Panel loads within 1 second
- [ ] No layout shift or flashing
- [ ] Smooth scrolling between panel and timeline

---

### Test 6: Empty State

**Objective**: Verify behavior when no major changes exist.

**Steps**:
1. Navigate to a customer with no major change notes
2. Observe the activity form and timeline

**Expected Results**:
- ✅ Major Change Notes panel does NOT appear
- ✅ No empty state message is shown
- ✅ Activity form functions normally
- ✅ Timeline shows other activities without issues

**Verification**:
```typescript
// In React DevTools, check that:
// majorChanges.length === 0
// Panel component returns null
```

---

### Test 7: Mobile Responsive Design

**Objective**: Ensure the feature works on mobile devices.

**Steps**:
1. Open browser DevTools and switch to mobile view (iPhone 14 Pro)
2. Navigate to a customer with major changes
3. Test all interactions

**Expected Results**:
- ✅ Panel is full width on mobile
- ✅ Text is readable without horizontal scrolling
- ✅ "View in Timeline" links are tappable (44px touch target)
- ✅ Scroll to timeline works on touch devices
- ✅ Panel is positioned correctly above activity form

**Test Viewports**:
- [ ] Mobile: 375px (iPhone SE)
- [ ] Mobile: 390px (iPhone 14 Pro)
- [ ] Tablet: 768px (iPad)
- [ ] Desktop: 1024px (Standard)

---

## ✅ Acceptance Criteria Checklist

### AC1: Panel Display Above Activity Form
- [ ] Panel appears above activity form (not inside accordion)
- [ ] Panel has distinct visual styling (red border, white background)
- [ ] Panel title reads "Major Change Notes" with flag icon
- [ ] Panel does not interfere with activity form functionality

### AC2: Major Changes Listed in Panel
- [ ] All major change activities are displayed
- [ ] Notes are in reverse chronological order (newest first)
- [ ] Each note shows: icon, date, creator, full text, link
- [ ] Date format is human-readable (e.g., "Jan 15, 2024")

### AC3: Special Styling in Timeline
- [ ] Major change activities have red badge
- [ ] Major change activities have red left border
- [ ] Major change activities have subtle red background
- [ ] Styling is visually distinct from other activities

### AC4: "View in Timeline" Functionality
- [ ] Link is present on each major change note
- [ ] Clicking link scrolls to the activity in timeline
- [ ] Scroll behavior is smooth and accurate
- [ ] Activity is highlighted or visually indicated after scroll

### AC5: Panel Hidden When No Major Changes
- [ ] Panel does not appear when no major changes exist
- [ ] No empty state message or placeholder is shown
- [ ] Activity form and timeline function normally

### AC6: Mobile Responsiveness
- [ ] Panel is full width on mobile devices
- [ ] Text is readable without horizontal scrolling
- [ ] Touch targets are appropriately sized (≥44px)
- [ ] Layout does not break on small screens

### AC7: Performance
- [ ] Panel loads without visible delay (<1 second)
- [ ] No layout shift when panel appears
- [ ] Smooth scrolling between panel and timeline
- [ ] No performance impact on activity timeline rendering

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **No Pagination**: If a customer has 50+ major changes, all will be displayed in the panel. Consider adding pagination or "Show More" if this becomes an issue.

2. **No Editing**: Major change notes cannot be edited after creation (by design). Users must add a new note to correct or update information.

3. **Scroll Position**: After clicking "View in Timeline", the browser back button will return to the previous scroll position, not the panel.

4. **Print Styling**: The panel may not print optimally. Consider adding print-specific CSS if needed.

### Edge Cases to Monitor

- **Very Long Notes**: Notes with 500+ characters may cause layout issues
- **Special Characters**: Test with emoji, unicode, and HTML entities
- **Concurrent Updates**: Multiple users adding major changes simultaneously
- **Browser Compatibility**: Test on Safari, Firefox, Edge (not just Chrome)

---

## 🔄 Rollback Instructions

If issues are discovered and the feature needs to be rolled back:

### Step 1: Remove ActivityType from Database

```sql
-- First, delete all activities with this type
DELETE FROM "Activity"
WHERE activity_type_id = (
  SELECT id FROM "ActivityType" WHERE name = 'Major Change'
);

-- Then delete the activity type
DELETE FROM "ActivityType"
WHERE name = 'Major Change';
```

### Step 2: Revert Code Changes

```bash
# From project root
git log --oneline | grep -i "major change"
# Find the commit hash before the feature was added

git revert <commit-hash>
# Or for a hard reset:
git reset --hard <commit-hash>
```

### Step 3: Redeploy

```bash
# Rebuild and deploy
cd web
npm run build
# Deploy to production using your normal process
```

### Step 4: Verify Rollback

- [ ] Major Change option removed from activity type dropdown
- [ ] Major Change Notes panel no longer appears
- [ ] Existing major change activities are deleted from database
- [ ] No console errors or warnings
- [ ] Activity timeline displays normally

---

## 📊 Test Results Template

Use this template to document your test results:

```markdown
## Test Session: [Date]

**Tester**: [Your Name]
**Environment**: [Development/Staging/Production]
**Browser**: [Chrome/Safari/Firefox] [Version]

### Tests Passed: X/7
- [ ] Test 1: Panel Display
- [ ] Test 2: Create Major Change
- [ ] Test 3: View in Timeline
- [ ] Test 4: Timeline Styling
- [ ] Test 5: Multiple Changes
- [ ] Test 6: Empty State
- [ ] Test 7: Mobile Responsive

### Acceptance Criteria: X/7
- [ ] AC1: Panel Display
- [ ] AC2: Listed in Panel
- [ ] AC3: Special Styling
- [ ] AC4: View in Timeline
- [ ] AC5: Hidden When Empty
- [ ] AC6: Mobile Responsive
- [ ] AC7: Performance

### Issues Found:
1. [Issue description]
   - Severity: [Critical/Major/Minor]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

### Notes:
[Any additional observations or comments]

### Recommendation:
[ ] Approve for Production
[ ] Needs Minor Fixes
[ ] Needs Major Fixes
[ ] Reject
```

---

## 🎯 Quick Reference

### Key Files
- **SQL Script**: `web/scripts/add-major-change-activity-type.sql`
- **Seed Script**: `web/scripts/seed-major-changes.ts`
- **Main Component**: `web/app/customers/[id]/components/MajorChangeNotesPanel.tsx`
- **Customer Page**: `web/app/customers/[id]/page.tsx`

### Database Tables
- **ActivityType**: Stores the "Major Change" type definition
- **Activity**: Stores individual major change notes

### Key Visual Elements
- **Panel Border**: `border-red-200`
- **Badge Color**: `bg-red-100 text-red-800`
- **Left Border**: `border-l-4 border-red-500`
- **Background Tint**: `bg-red-50`

### Support
- **Questions?** Contact: [Your Team Lead]
- **Bugs?** Create Jira ticket: [Project]-XXX
- **Documentation**: `web/docs/implementation-plans/`

---

**Testing Checklist Complete!** ✅

If all tests pass and acceptance criteria are met, this feature is ready for production deployment.
