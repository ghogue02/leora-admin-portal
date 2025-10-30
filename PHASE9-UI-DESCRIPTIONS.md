# Phase 9: Data Integrity & Validation - UI Descriptions

## Dashboard Layout (`/admin/data-integrity`)

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ Data Integrity Dashboard                                    │
│ Monitor and resolve data quality issues                     │
└─────────────────────────────────────────────────────────────┘
```

### Summary Cards Row
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Quality Score│ Total Issues │Critical Issue│ Last Checked │
│              │              │              │              │
│  [📊 Icon]   │  [🔔 Icon]   │  [❌ Icon]   │  [✅ Icon]   │
│              │              │              │              │
│   87.5%      │     42       │     15       │  10:30 AM    │
│  (Yellow)    │              │   (Red)      │  (Cached)    │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Color Coding**:
- Green: 90-100
- Yellow: 70-89
- Red: 0-69

### Action Button
```
┌──────────────────────────────────┐
│  [🔄] Run Check Now              │
│  (Blue button, shows spinner     │
│   when running)                  │
└──────────────────────────────────┘
```

### Alert Cards Section

**High Severity Alert (Red Background)**
```
┌────────────────────────────────────────────────────────────┐
│ [❌]  Customers Without Sales Rep          [15] [HIGH]     │
│                                                             │
│ Active customers that do not have an assigned sales        │
│ representative                                              │
│                                                             │
│ [ View & Fix → ]                                           │
└────────────────────────────────────────────────────────────┘
```

**Medium Severity Alert (Yellow Background)**
```
┌────────────────────────────────────────────────────────────┐
│ [⚠️]  Sales Reps with No Customers      [8] [MEDIUM]      │
│                                                             │
│ Active sales representatives with no assigned customers    │
│                                                             │
│ [ View Details → ]                                         │
└────────────────────────────────────────────────────────────┘
```

**Low Severity Alert (Blue Background)**
```
┌────────────────────────────────────────────────────────────┐
│ [ℹ️]  Out of Stock in Price Lists       [3] [LOW]         │
│                                                             │
│ SKUs with zero inventory but still in active price lists   │
│                                                             │
│ [ View Details → ]                                         │
└────────────────────────────────────────────────────────────┘
```

**No Issues State (Green Background)**
```
┌────────────────────────────────────────────────────────────┐
│                      [✅ Large Icon]                        │
│                                                             │
│                    No Issues Found                          │
│                                                             │
│  Your data is in excellent condition.                      │
│  All validation checks passed!                             │
└────────────────────────────────────────────────────────────┘
```

---

## Issue Detail Page (`/admin/data-integrity/[ruleId]`)

### Header
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Dashboard]                                        │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [❌]  Customers Without Sales Rep  [15] [HIGH]          ││
│ │                                                          ││
│ │ Active customers that do not have an assigned           ││
│ │ sales representative                                     ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Bulk Actions Bar (White Background)
```
┌─────────────────────────────────────────────────────────────┐
│ [☑] Select All (3 selected)              [🔧] Fix Selected │
│                                                  (3)         │
└─────────────────────────────────────────────────────────────┘
```

### Records Table
```
┌────┬──────────┬────────────────────────────────────────────┐
│ ☑  │ Type     │ Details                                    │
├────┼──────────┼────────────────────────────────────────────┤
│ ☑  │ Customer │ Name: ABC Wine Shop                        │
│    │          │ Account Number: CUST-001                   │
│    │          │ Billing Email: orders@abcwine.com          │
│    │          │ Last Order Date: Oct 15, 2025              │
├────┼──────────┼────────────────────────────────────────────┤
│ ☐  │ Customer │ Name: XYZ Liquor Store                     │
│    │          │ Account Number: CUST-002                   │
│    │          │ Billing Email: manager@xyzliquor.com       │
│    │          │ Last Order Date: Oct 12, 2025              │
├────┼──────────┼────────────────────────────────────────────┤
│ ☑  │ Customer │ Name: Downtown Spirits                     │
│    │          │ Account Number: CUST-003                   │
│    │          │ Billing Email: info@downtownspirits.com    │
│    │          │ Last Order Date: Oct 18, 2025              │
└────┴──────────┴────────────────────────────────────────────┘
```

### Pagination (Gray Background)
```
┌─────────────────────────────────────────────────────────────┐
│ Showing page 1 of 1 (15 total)        [Previous] [Next]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Fix Action Flow

### 1. Select Records
```
User clicks checkboxes:
[☑] Customer 1
[☑] Customer 2
[☐] Customer 3

Selected count updates: "2 selected"
```

### 2. Click Fix Button
```
[🔧 Fix Selected (2)] ← Button enabled
```

### 3. Parameter Input (if needed)
```
┌────────────────────────────────────┐
│ Enter Sales Rep ID to assign:     │
│ [________________________]         │
│                                    │
│ [ Cancel ]        [ OK ]           │
└────────────────────────────────────┘
```

### 4. Processing State
```
[⏳ Fixing...] ← Button shows spinner
```

### 5. Success Message
```
┌────────────────────────────────────┐
│ ✓ Successfully fixed 2 record(s)   │
└────────────────────────────────────┘
```

### 6. Auto-Refresh
```
Page reloads automatically
Fixed records removed from list
Issue count decreases
```

---

## Color Scheme

### Severity Colors

**High Severity**:
- Background: `bg-red-50` (#FEF2F2)
- Border: `border-red-200` (#FECACA)
- Text: `text-red-600` (#DC2626)
- Icon: Red X Circle

**Medium Severity**:
- Background: `bg-yellow-50` (#FEFCE8)
- Border: `border-yellow-200` (#FEF08A)
- Text: `text-yellow-600` (#CA8A04)
- Icon: Yellow Warning Triangle

**Low Severity**:
- Background: `bg-blue-50` (#EFF6FF)
- Border: `border-blue-200` (#BFDBFE)
- Text: `text-blue-600` (#2563EB)
- Icon: Blue Info Circle

**Success State**:
- Background: `bg-green-50` (#F0FDF4)
- Border: `border-green-200` (#BBF7D0)
- Text: `text-green-600` (#16A34A)
- Icon: Green Check Circle

### Action Colors

**Primary Button** (Run Check, Fix):
- Background: `bg-blue-600` (#2563EB)
- Hover: `bg-blue-700` (#1D4ED8)
- Text: White

**Secondary Button** (View Details, Back):
- Background: White
- Border: `border-gray-300`
- Hover: `bg-gray-100`
- Text: `text-gray-900`

**Disabled State**:
- Background: `bg-gray-400`
- Cursor: Not Allowed
- Opacity: Reduced

---

## Responsive Behavior

### Desktop (> 768px)
```
Summary cards: 4 columns
Alert cards: Full width
Table: Full width with all columns
```

### Tablet (768px)
```
Summary cards: 2 columns
Alert cards: Full width
Table: Horizontal scroll if needed
```

### Mobile (< 768px)
```
Summary cards: 1 column (stack)
Alert cards: Full width (stack)
Table: Horizontal scroll
Buttons: Full width
```

---

## Loading States

### Dashboard Loading
```
┌─────────────────────────────────────┐
│ [Animated pulse]                    │
│ ████████████ (Gray bar)             │
│ ████████ (Gray bar)                 │
│                                     │
│ [Three gray boxes in row]           │
└─────────────────────────────────────┘
```

### Running Check
```
[🔄 (Spinning)] Run Check Now...
```

### Fixing Records
```
[⏳ (Pulsing)] Fixing...
```

---

## Error States

### Network Error
```
┌────────────────────────────────────┐
│ [❌] Error: Network error occurred │
│                                    │
│ [ Retry ]                          │
└────────────────────────────────────┘
```

### API Error
```
┌────────────────────────────────────┐
│ [❌] Error: Failed to fetch data   │
│                                    │
│ [ Back to Dashboard ]              │
└────────────────────────────────────┘
```

---

## Interactive Elements

### Checkbox States
```
Unchecked: [ ]
Checked:   [✓]
Indeterminate: [-] (for select all when some selected)
```

### Button States
```
Normal:   [Button Text]
Hover:    [Button Text] (darker background)
Active:   [Button Text] (depressed)
Disabled: [Button Text] (gray, no hover)
Loading:  [⏳ Button Text] (spinner + disabled)
```

### Badge Styles
```
Count Badge:    [15] (White background, black text, rounded)
Severity Badge: [HIGH] (White background, colored text, pill shape)
```

---

## Typography

### Headers
- H1: 3xl (30px), Bold, Gray-900
- H2: 2xl (24px), Semibold, Gray-900
- H3: xl (20px), Semibold, Gray-900

### Body
- Regular: Base (16px), Normal, Gray-700
- Small: sm (14px), Normal, Gray-600
- Tiny: xs (12px), Normal, Gray-500

### Labels
- Form: sm (14px), Medium, Gray-600
- Uppercase: xs (12px), Medium, Uppercase, Letter spacing

---

## Spacing

### Cards
- Padding: 24px (6 units)
- Gap between: 24px
- Border radius: 8px (lg)

### Sections
- Margin between: 32px (8 units)

### Table
- Row padding: 16px vertical, 24px horizontal
- Cell spacing: Tight (divide-y)

---

## Icons

Using Lucide React icons:
- AlertTriangle: Warning/Medium severity
- XCircle: Error/High severity
- Info: Information/Low severity
- CheckCircle: Success
- RefreshCw: Refresh/Reload
- ArrowLeft: Back navigation
- Wrench: Fix action
- TrendingUp: Positive trend
- TrendingDown: Negative trend

---

## Animations

### Transitions
```css
transition: all 0.2s ease-in-out
```

### Hover Effects
```css
transform: scale(1.02)
box-shadow: 0 4px 6px rgba(0,0,0,0.1)
```

### Loading Spinners
```css
animation: spin 1s linear infinite
```

---

## Accessibility

### ARIA Labels
- Buttons: `aria-label` describes action
- Checkboxes: `aria-checked` state
- Loading: `aria-busy="true"`
- Alerts: `role="alert"`

### Keyboard Navigation
- Tab: Move between interactive elements
- Space: Toggle checkboxes
- Enter: Activate buttons
- Escape: Close modals

### Screen Reader
- All icons have text alternatives
- Tables have proper headers
- Form inputs have labels
- Error messages announced

---

## Comparison: Before vs After Fix

### Before Fix
```
┌────────────────────────────────────┐
│ [❌] Customers Without Sales Rep   │
│ 15 issues                          │
│                                    │
│ Quality Score: 72% (Yellow)        │
└────────────────────────────────────┘
```

### After Fix
```
┌────────────────────────────────────┐
│ [✅] Customers Without Sales Rep   │
│ 0 issues                           │
│                                    │
│ Quality Score: 95% (Green)         │
└────────────────────────────────────┘
```

---

## Quick Reference

### Dashboard Elements
1. Title & Subtitle
2. Summary Cards (4)
3. Action Button
4. Alert Cards (filterable)
5. No Issues State (when clean)

### Detail Page Elements
1. Back Button
2. Rule Header Card
3. Bulk Actions Bar
4. Records Table
5. Pagination
6. No Records State

### Action Flow
1. View → 2. Select → 3. Fix → 4. Success → 5. Refresh

---

This UI design prioritizes:
- **Clarity**: Clear labels and descriptions
- **Efficiency**: Quick actions and bulk operations
- **Feedback**: Loading states and success messages
- **Accessibility**: Keyboard navigation and screen readers
- **Responsiveness**: Works on all device sizes
- **Consistency**: Matches existing admin portal style
