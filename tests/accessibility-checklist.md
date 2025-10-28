# Accessibility Testing Checklist (WCAG 2.1 AA)

## 🎯 Purpose

Ensure Leora CRM is accessible to all users, including those with disabilities. This checklist covers WCAG 2.1 Level AA compliance requirements.

---

## ♿ WCAG 2.1 Principles

### 1. Perceivable
Information and user interface components must be presentable to users in ways they can perceive.

### 2. Operable
User interface components and navigation must be operable.

### 3. Understandable
Information and the operation of the user interface must be understandable.

### 4. Robust
Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies.

---

## 🧪 Testing Tools

### Automated Testing Tools
- **axe DevTools** (Chrome extension): https://www.deque.com/axe/devtools/
- **WAVE** (Web Accessibility Evaluation Tool): https://wave.webaim.org/
- **Lighthouse** (Chrome DevTools): Built into Chrome
- **Pa11y**: Command-line accessibility testing

### Manual Testing Tools
- **Screen Readers**:
  - **NVDA** (Windows, free): https://www.nvaccess.org/
  - **JAWS** (Windows, paid): https://www.freedomscientific.com/products/software/jaws/
  - **VoiceOver** (macOS/iOS, built-in): Cmd+F5 to activate
  - **TalkBack** (Android, built-in)
- **Keyboard Navigation**: Test with keyboard only (no mouse)
- **Color Contrast Checker**: https://contrast-ratio.com/

---

## ✅ Accessibility Checklist

### 1. Perceivable - Text Alternatives

#### Images & Icons
- [ ] All images have `alt` text
- [ ] Decorative images have `alt=""` (empty alt)
- [ ] Icons have accessible labels (aria-label or sr-only text)
- [ ] SVG icons have `<title>` element
- [ ] Logo has descriptive alt text

**Test**: View page with images disabled. Is content still understandable?

**Tools**: axe DevTools, WAVE

**Notes**: _______________

---

#### Audio & Video (if applicable)
- [ ] Audio has transcripts
- [ ] Videos have captions
- [ ] Videos have audio descriptions (if needed)

**Test**: Play media with sound off. Is content understandable?

**Notes**: _______________

---

### 2. Perceivable - Color & Contrast

#### Color Contrast
- [ ] Text has 4.5:1 contrast ratio (normal text)
- [ ] Large text has 3:1 contrast ratio (18pt+, or 14pt+ bold)
- [ ] UI components have 3:1 contrast ratio (buttons, borders)
- [ ] Focus indicators have 3:1 contrast ratio

**Test**: Use contrast checker on all text and UI elements.

**Color Combinations to Check**:
| Element | Foreground | Background | Ratio | Pass/Fail |
|---------|------------|------------|-------|-----------|
| Body text | #333 | #fff | _____ | ✅ / ❌ |
| Headings | #000 | #fff | _____ | ✅ / ❌ |
| Links | #0066cc | #fff | _____ | ✅ / ❌ |
| Buttons (primary) | #fff | #0066cc | _____ | ✅ / ❌ |
| Buttons (secondary) | #333 | #f5f5f5 | _____ | ✅ / ❌ |
| Error messages | #d32f2f | #fff | _____ | ✅ / ❌ |
| Success messages | #388e3c | #fff | _____ | ✅ / ❌ |
| Table headers | #fff | #333 | _____ | ✅ / ❌ |
| Risk status badges | _____ | _____ | _____ | ✅ / ❌ |

**Tools**: Contrast Ratio Checker, Lighthouse, axe

**Notes**: _______________

---

#### Color Usage
- [ ] Color is not the only visual means of conveying information
- [ ] Links are distinguishable without relying solely on color
- [ ] Charts use patterns or labels in addition to colors
- [ ] Status indicators have text or icons, not just color

**Test**: View page in grayscale. Can you still understand all information?

**Examples to Check**:
- Risk status badges (ACTIVE, TARGET, PROSPECT) - should have text, not just color
- Chart legends - should have patterns or labels
- Error/success states - should have icons or text

**Tools**: Chrome DevTools (Rendering > Emulate vision deficiencies)

**Notes**: _______________

---

### 3. Perceivable - Adaptable Content

#### Semantic HTML
- [ ] Headings used correctly (h1, h2, h3, etc.) in hierarchical order
- [ ] No skipped heading levels (h1 → h2 → h3, not h1 → h3)
- [ ] Lists use `<ul>`, `<ol>`, `<li>` elements
- [ ] Tables use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` elements
- [ ] Table headers have `scope` attribute
- [ ] Forms use `<label>` elements for inputs
- [ ] Buttons use `<button>` element (not `<div>` with click handlers)
- [ ] Links use `<a>` element

**Test**: View page outline with browser extension (e.g., HeadingsMap).

**Heading Structure Example**:
```
h1: My Customers (page title)
  h2: Summary Stats
  h2: Filters
  h2: Customer List
    h3: Customer Name (in table - if applicable)
```

**Tools**: HeadingsMap, WAVE, axe

**Notes**: _______________

---

#### Responsive & Reflow
- [ ] Page is usable at 200% zoom
- [ ] No horizontal scrolling at 200% zoom (except data tables)
- [ ] Content reflows correctly on mobile (320px width)
- [ ] No content is lost when zooming or resizing

**Test**: Zoom to 200% in browser. Check all pages.

**Pages to Test**:
- [ ] Customer list
- [ ] Customer detail
- [ ] CARLA call plan
- [ ] Dashboard
- [ ] Samples page
- [ ] Sample analytics

**Tools**: Browser zoom (Cmd/Ctrl + +), Responsive design mode

**Notes**: _______________

---

### 4. Operable - Keyboard Navigation

#### Keyboard Access
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical (follows visual order)
- [ ] No keyboard traps (can tab out of all elements)
- [ ] Dropdown menus work with keyboard
- [ ] Modals can be closed with Escape key
- [ ] Forms can be submitted with Enter key

**Test**: Navigate entire site using only keyboard (Tab, Shift+Tab, Enter, Space, Arrow keys).

**Keyboard Shortcuts to Test**:
| Action | Key | Works? |
|--------|-----|--------|
| Navigate forward | Tab | ✅ / ❌ |
| Navigate backward | Shift+Tab | ✅ / ❌ |
| Activate button/link | Enter or Space | ✅ / ❌ |
| Close modal | Escape | ✅ / ❌ |
| Open dropdown | Enter/Space | ✅ / ❌ |
| Navigate dropdown | Arrow keys | ✅ / ❌ |
| Select dropdown item | Enter | ✅ / ❌ |

**Tools**: Keyboard only (no mouse)

**Notes**: _______________

---

#### Focus Indicators
- [ ] All focusable elements have visible focus indicator
- [ ] Focus indicator is clearly visible (3:1 contrast)
- [ ] Focus indicator is not removed with `outline: none` (unless replaced)
- [ ] Focus order is logical and predictable

**Test**: Tab through all interactive elements. Can you see where focus is?

**Elements to Check**:
- [ ] Buttons
- [ ] Links
- [ ] Form inputs (text, select, checkbox, radio)
- [ ] Dropdown menus
- [ ] Table rows (if clickable)
- [ ] Modal close buttons

**Tools**: Keyboard navigation, axe

**Notes**: _______________

---

#### Skip Links
- [ ] "Skip to main content" link is present
- [ ] Skip link is visually hidden but accessible to screen readers
- [ ] Skip link becomes visible on focus
- [ ] Skip link works (jumps to main content)

**Test**: Tab from page load. First focusable element should be skip link.

**Tools**: Keyboard navigation

**Notes**: _______________

---

### 5. Operable - Timing

#### No Time Limits
- [ ] No time limits on interactions (or can be extended)
- [ ] Session timeout warnings allow user to extend session
- [ ] Auto-refresh can be paused or disabled (if applicable)

**Test**: Check for any timed interactions (session timeout, auto-refresh).

**Notes**: _______________

---

### 6. Operable - Navigation

#### Page Titles
- [ ] Each page has a unique, descriptive title
- [ ] Title describes page content
- [ ] Title format is consistent (e.g., "Page Name - Leora CRM")

**Test**: Check `<title>` element on each page.

**Page Titles to Check**:
| Page | Expected Title | Actual Title | Pass/Fail |
|------|----------------|--------------|-----------|
| Customer List | "My Customers - Leora CRM" | _____ | ✅ / ❌ |
| Customer Detail | "[Customer Name] - Leora CRM" | _____ | ✅ / ❌ |
| CARLA Call Plan | "CARLA Call Plan - Leora CRM" | _____ | ✅ / ❌ |
| Dashboard | "Sales Dashboard - Leora CRM" | _____ | ✅ / ❌ |
| Samples | "Sample Management - Leora CRM" | _____ | ✅ / ❌ |
| Analytics | "Sample Analytics - Leora CRM" | _____ | ✅ / ❌ |

**Tools**: Browser tab title, View Source

**Notes**: _______________

---

#### Link Purpose
- [ ] Link text describes destination (no "click here")
- [ ] Links to same destination have consistent text
- [ ] Links are distinguishable from non-link text

**Test**: Read link text out of context. Is purpose clear?

**Examples**:
- ❌ "Click here" → ✅ "View customer details"
- ❌ "Read more" → ✅ "Read more about [topic]"
- ❌ "Edit" (without context) → ✅ "Edit customer [name]"

**Tools**: Screen reader, axe

**Notes**: _______________

---

#### Multiple Ways to Navigate
- [ ] Multiple ways to find pages (menu, search, breadcrumbs)
- [ ] Search function is available (if applicable)
- [ ] Sitemap is available (if applicable)

**Test**: Try to find a specific page using different methods.

**Navigation Methods Available**:
- [ ] Main navigation menu
- [ ] Search (customer search)
- [ ] Breadcrumbs (if applicable)
- [ ] Footer links (if applicable)

**Notes**: _______________

---

### 7. Understandable - Readable

#### Language
- [ ] Page language is set (`<html lang="en">`)
- [ ] Language changes are marked (`<span lang="fr">`)
- [ ] Text is written in clear, simple language

**Test**: Check HTML for `lang` attribute.

**Tools**: View Source, axe

**Notes**: _______________

---

### 8. Understandable - Predictable

#### Consistent Navigation
- [ ] Navigation menu is in same location on all pages
- [ ] Navigation items are in same order on all pages
- [ ] Common UI elements (logo, search) are in same location

**Test**: Navigate through multiple pages. Is navigation consistent?

**Notes**: _______________

---

#### Consistent Identification
- [ ] UI components with same function have same labels
- [ ] Icons with same meaning have same alt text
- [ ] Buttons with same action have same text

**Test**: Check for consistency across pages.

**Examples**:
- "Edit" button should always say "Edit" (not "Modify" on some pages)
- "Delete" button should always say "Delete" (not "Remove" on some pages)

**Notes**: _______________

---

### 9. Understandable - Input Assistance

#### Form Labels
- [ ] All form inputs have labels
- [ ] Labels are associated with inputs (for/id or aria-labelledby)
- [ ] Labels are visible (not placeholder-only)
- [ ] Required fields are indicated (not just with color)

**Test**: Click on label. Does input receive focus?

**Forms to Check**:
- [ ] Customer search
- [ ] CARLA call plan creation
- [ ] Sample assignment modal
- [ ] Activity creation
- [ ] Login form (if applicable)

**Tools**: axe, WAVE

**Notes**: _______________

---

#### Error Identification & Suggestions
- [ ] Errors are clearly identified
- [ ] Error messages are associated with inputs (aria-describedby)
- [ ] Error messages describe what's wrong and how to fix it
- [ ] Errors are announced to screen readers

**Test**: Submit form with errors. Are errors clear and helpful?

**Error Message Examples**:
- ❌ "Invalid input" → ✅ "Email address must include @ symbol"
- ❌ "Error" → ✅ "Quantity must be a positive number"
- ❌ "Required" → ✅ "Customer name is required"

**Tools**: Screen reader, axe

**Notes**: _______________

---

#### Error Prevention
- [ ] Destructive actions require confirmation (delete, cancel)
- [ ] Forms can be reviewed before submission (if critical)
- [ ] Changes can be undone or corrected

**Test**: Try to delete a customer or cancel an order. Is confirmation required?

**Actions to Check**:
- [ ] Delete customer (should confirm)
- [ ] Delete call plan (should confirm)
- [ ] Cancel order (should confirm)
- [ ] Assign sample (should allow correction before submit)

**Notes**: _______________

---

### 10. Robust - Compatible

#### Valid HTML
- [ ] HTML is valid (no errors)
- [ ] ARIA attributes are used correctly
- [ ] IDs are unique on each page
- [ ] Elements are properly nested

**Test**: Validate HTML with W3C Validator.

**Tools**: W3C HTML Validator (https://validator.w3.org/), axe

**Notes**: _______________

---

#### ARIA Usage
- [ ] ARIA roles are used correctly (role="button", role="dialog", etc.)
- [ ] ARIA labels provide context (aria-label, aria-labelledby)
- [ ] ARIA states are updated dynamically (aria-expanded, aria-hidden)
- [ ] ARIA is not used when native HTML is available

**Test**: Inspect ARIA attributes with screen reader or axe.

**ARIA Attributes to Check**:
| Element | ARIA Attribute | Value | Correct? |
|---------|----------------|-------|----------|
| Modal | role="dialog" | _____ | ✅ / ❌ |
| Modal overlay | aria-hidden="true" | _____ | ✅ / ❌ |
| Dropdown button | aria-expanded | "true" / "false" | ✅ / ❌ |
| Loading spinner | aria-busy="true" | _____ | ✅ / ❌ |
| Alert message | role="alert" | _____ | ✅ / ❌ |

**Tools**: axe, screen reader

**Notes**: _______________

---

## 📱 Mobile Accessibility

### Touch Targets
- [ ] All touch targets are at least 44×44px
- [ ] Touch targets have adequate spacing (8px minimum)
- [ ] No accidental taps due to small targets

**Test**: Use mobile device or mobile emulator. Try to tap all buttons.

**Tools**: Chrome DevTools (Device Mode), Lighthouse

**Notes**: _______________

---

### Zoom & Scaling
- [ ] Pinch-to-zoom is not disabled (avoid `user-scalable=no`)
- [ ] Content is readable without zooming
- [ ] Maximum scale is not restricted (avoid `maximum-scale=1.0`)

**Test**: Try to zoom on mobile device.

**Notes**: _______________

---

## 🎧 Screen Reader Testing

### VoiceOver (macOS)

**How to Activate**: Cmd+F5

#### Test Steps:
1. Navigate to customer list page
2. Activate VoiceOver
3. Navigate page using:
   - VO+Right Arrow: Next item
   - VO+Left Arrow: Previous item
   - VO+U: Rotor (headings, links, forms)
   - Tab: Next focusable element

#### What to Listen For:
- [ ] Page title is announced
- [ ] Headings are announced with level (e.g., "Heading level 1, My Customers")
- [ ] Links are announced as links ("Link, Customer Name")
- [ ] Buttons are announced as buttons ("Button, Create Call Plan")
- [ ] Form labels are read before inputs
- [ ] Table headers are announced for cells
- [ ] Error messages are announced
- [ ] Loading states are announced (aria-busy)

**Pages to Test**:
- [ ] Customer list
- [ ] Customer detail
- [ ] CARLA call plan
- [ ] Dashboard
- [ ] Sample assignment modal

**Notes**: _______________

---

### NVDA (Windows)

**How to Activate**: Ctrl+Alt+N (or download from nvaccess.org)

#### Test Steps:
1. Navigate to customer list page
2. Activate NVDA
3. Navigate page using:
   - Down Arrow: Next item
   - Up Arrow: Previous item
   - H: Next heading
   - Tab: Next focusable element

#### What to Listen For:
- Same as VoiceOver (see above)

**Notes**: _______________

---

## 🧰 Automated Testing Results

### axe DevTools Scan

**How to Run**:
1. Install axe DevTools extension in Chrome
2. Open DevTools (F12)
3. Go to axe DevTools tab
4. Click "Scan ALL of my page"

**Results**:
- **Critical Issues**: _______________
- **Serious Issues**: _______________
- **Moderate Issues**: _______________
- **Minor Issues**: _______________

**Top Issues to Fix**:
1. _______________
2. _______________
3. _______________

---

### Lighthouse Accessibility Audit

**How to Run**:
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility" category
4. Click "Generate report"

**Results**:
- **Accessibility Score**: _____ / 100
- **Target**: 90+

**Issues Found**:
1. _______________
2. _______________
3. _______________

---

### WAVE Scan

**How to Run**:
1. Install WAVE extension in Chrome
2. Navigate to page
3. Click WAVE icon
4. Review errors, alerts, and features

**Results**:
- **Errors**: _______________
- **Alerts**: _______________
- **Features**: _______________

**Issues Found**:
1. _______________
2. _______________
3. _______________

---

## 📊 Accessibility Test Summary

### Overall Results
- **Total Issues Found**: _______________
- **Critical Issues**: _______________
- **High Priority Issues**: _______________
- **Medium Priority Issues**: _______________
- **Low Priority Issues**: _______________

### Compliance Status
- [ ] ✅ WCAG 2.1 AA Compliant (no critical or high issues)
- [ ] ⚠️ Mostly Compliant (minor issues only)
- [ ] ❌ Not Compliant (critical issues exist)

### Issues to Fix

#### Critical (Must Fix)
1. **Issue**: _______________
   **Page**: _______________
   **How to Fix**: _______________

#### High Priority (Should Fix)
1. **Issue**: _______________
   **Page**: _______________
   **How to Fix**: _______________

#### Medium Priority (Nice to Fix)
1. **Issue**: _______________
   **Page**: _______________
   **How to Fix**: _______________

### Recommendations
1. _______________
2. _______________
3. _______________

---

**Tested by**: _______________
**Date**: _______________
**Tools Used**: axe DevTools / WAVE / Lighthouse / Screen Reader (specify)
