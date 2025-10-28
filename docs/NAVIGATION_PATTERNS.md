# Navigation Patterns - Leora Application

## Overview
This document describes the consistent navigation patterns used across the Leora application to ensure a cohesive user experience.

---

## Global Navigation Structure

### 1. Admin Portal (`/admin`)

**Pattern:** Vertical Sidebar Navigation + Breadcrumbs

**Components:**
- **Sidebar** (`/web/src/app/admin/components/Sidebar.tsx`)
  - Fixed left sidebar (desktop)
  - Collapsible drawer (mobile)
  - Always visible navigation items
  - Active state highlighting

- **Breadcrumbs** (`/web/src/app/admin/components/Breadcrumbs.tsx`)
  - Shows hierarchical location
  - Clickable navigation trail
  - Auto-generated from URL path
  - Home icon links to `/admin`

- **Header** (`/web/src/app/admin/components/AdminHeader.tsx`)
  - Global search
  - User menu
  - Mobile menu toggle

**Navigation Items:**
```
├── Dashboard (/admin)
├── Customers (/admin/customers)
├── Sales Reps & Territories (/admin/sales-reps)
├── Orders & Invoices (/admin/orders)
├── Accounts & Users (/admin/accounts)  ← NOTE: Not /admin/users
├── Inventory & Products (/admin/inventory)
├── Audit Logs (/admin/audit-logs)
├── Bulk Operations (/admin/bulk-operations)
└── Data Integrity (/admin/data-integrity)
```

**Layout Implementation:**
```tsx
<div className="flex h-screen">
  <Sidebar />
  <div className="flex-1">
    <AdminHeader />
    <main>
      <Breadcrumbs />
      {children}
    </main>
  </div>
</div>
```

---

### 2. Sales Portal (`/sales`)

**Pattern:** Top Navigation Bar + Breadcrumbs

**Components:**
- **SalesNav** (`/web/src/app/sales/_components/SalesNav.tsx`)
  - Fixed top navigation bar
  - Horizontal menu items
  - Responsive dropdown (mobile)
  - Context-aware actions

- **Breadcrumbs** (`/web/src/components/shared/Breadcrumbs.tsx`)
  - Shows hierarchical location
  - Auto-generated from URL path
  - "Sales Dashboard" home link

**Navigation Areas:**
```
├── Dashboard (/sales/dashboard)
├── Customers (/sales/customers)
│   └── [Customer Detail] (/sales/customers/[id])
├── Orders (/sales/orders)
├── Samples (/sales/samples)
├── Call Plan (/sales/call-plan)
├── Calendar (/sales/calendar)
├── Territory (/sales/territory)
├── Reports (/sales/reports)
└── Settings (/sales/settings)
```

**Layout Implementation:**
```tsx
<div className="min-h-screen">
  <SalesNav />
  <main className="pt-24">
    <Breadcrumbs homeHref="/sales" homeLabel="Sales Dashboard" />
    {children}
  </main>
</div>
```

---

## Breadcrumb Component

**Shared Component:** `/web/src/components/shared/Breadcrumbs.tsx`

### Features:
- ✅ Auto-generation from URL path
- ✅ Custom breadcrumb items support
- ✅ Configurable home route
- ✅ Mobile responsive
- ✅ Smart label formatting

### Usage:

**Auto-generated:**
```tsx
<Breadcrumbs
  homeHref="/admin"
  homeLabel="Admin Portal"
/>
```

**Custom items:**
```tsx
<Breadcrumbs
  homeHref="/sales"
  items={[
    { label: 'Customers', href: '/sales/customers' },
    { label: customerName, href: null } // Current page
  ]}
/>
```

### Label Formatting Rules:
- Hyphens → Spaces: `call-plan` → "Call Plan"
- Camel case: `salesReps` → "Sales Reps"
- Special cases: `sales-reps` → "Sales Reps & Territories"
- UUIDs → "Details"
- Numbers → "#123"

---

## Navigation Consistency Rules

### ✅ DO:
1. **Use consistent terminology**
   - "Accounts & Users" (not "User Accounts")
   - Route: `/admin/accounts` (not `/admin/users`)

2. **Show breadcrumbs on all pages**
   - Except: Login pages, home/dashboard pages
   - Include on: All detail pages, list pages, settings

3. **Maintain navigation hierarchy**
   - Admin: Sidebar → Breadcrumbs → Content
   - Sales: Top Nav → Breadcrumbs → Content

4. **Provide clear visual feedback**
   - Active states for current page
   - Hover states for interactive elements
   - Disabled states when appropriate

5. **Enable keyboard navigation**
   - Tab through navigation items
   - Enter to activate links
   - Escape to close menus

### ❌ DON'T:
1. Mix navigation patterns within a section
2. Use different route names for the same resource
3. Hide breadcrumbs on nested pages
4. Create orphaned pages without navigation
5. Use inconsistent labeling

---

## Mobile Responsive Patterns

### Admin (Breakpoint: `lg` = 1024px)

**Desktop (≥1024px):**
- Sidebar visible, fixed left
- Full breadcrumb trail
- Expanded navigation items

**Tablet/Mobile (<1024px):**
- Hamburger menu in header
- Sidebar as drawer overlay
- Condensed breadcrumbs (last 2 items)
- Touch-friendly tap targets (min 44px)

**Implementation:**
```tsx
<div className="hidden lg:block">
  <Sidebar />
</div>

{/* Mobile Sidebar */}
{sidebarOpen && (
  <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
    <Sidebar />
  </div>
)}
```

### Sales (Breakpoint: `md` = 768px)

**Desktop (≥768px):**
- Horizontal navigation bar
- Full menu items visible
- Dropdown menus

**Mobile (<768px):**
- Collapsed hamburger menu
- Full-screen navigation overlay
- Vertical menu stack

---

## Recent Activity Feed

**Location:** Admin Dashboard (`/admin`)

**Implementation:**
- API: `/api/admin/audit-logs/recent`
- Component: Inline in `AdminDashboard`
- Updates: Real-time on page load
- Limit: Last 10 activities

**Display Format:**
```
[Icon] [Description]
       [User Name] • [Timestamp] • [Entity Type]
```

**Features:**
- Links to full audit log
- Loading state
- Empty state
- Action type icons (CREATE ➕, UPDATE ✏️, DELETE 🗑️)

---

## Quick Action Cards

**Pattern:** Grid of clickable cards on dashboard pages

**Layout:**
- 2 columns on mobile
- 3 columns on tablet
- 3 columns on desktop

**Card Structure:**
```tsx
<Link href={href}>
  <h3>{title}</h3>
  <p>{description}</p>
</Link>
```

**Correct Route Mappings:**
- "User Accounts" → `/admin/accounts`
- "Sales Reps & Territories" → `/admin/sales-reps`
- "Orders & Invoices" → `/admin/orders`
- "Audit Logs" → `/admin/audit-logs`

---

## Accessibility

### ARIA Labels:
```tsx
<nav aria-label="Breadcrumb">
  <Link aria-label="Admin home">...</Link>
</nav>
```

### Keyboard Navigation:
- `Tab` - Navigate between items
- `Enter` - Activate link
- `Escape` - Close mobile menu
- `Cmd/Ctrl + K` - Global search (Admin)

### Screen Readers:
- Semantic HTML (`<nav>`, `<main>`)
- Descriptive labels
- Skip to main content link
- Current page indication

---

## Testing Checklist

### Navigation Verification:
- [ ] All pages have breadcrumbs (except home/login)
- [ ] Breadcrumbs clickable and functional
- [ ] Active states visible on current page
- [ ] Mobile menu toggles correctly
- [ ] All quick action links work
- [ ] No broken/orphaned routes
- [ ] Consistent terminology across UI

### Route Verification:
- [ ] `/admin/accounts` (not `/admin/users`)
- [ ] All admin sidebar links resolve
- [ ] All sales nav links resolve
- [ ] Dynamic routes work (`/customers/[id]`)

### Responsive Testing:
- [ ] Mobile (<768px): Navigation accessible
- [ ] Tablet (768-1024px): Proper layout
- [ ] Desktop (≥1024px): Full features visible
- [ ] Touch targets ≥44px on mobile
- [ ] No horizontal scrolling

### Accessibility:
- [ ] Keyboard navigation works
- [ ] ARIA labels present
- [ ] Focus visible
- [ ] Screen reader friendly

---

## Future Enhancements

### Planned:
1. **Search in breadcrumbs** - Quick jump to any page
2. **Breadcrumb dropdown** - Show siblings in current level
3. **Recently visited** - Quick access to recent pages
4. **Favorites** - Pin frequently used pages
5. **Global shortcuts** - Keyboard shortcuts for common actions

### Under Consideration:
- Command palette (Cmd+K)
- Navigation analytics
- Personalized navigation
- Multi-level mega menus

---

## Related Files

**Admin:**
- Layout: `/web/src/app/admin/layout.tsx`
- Sidebar: `/web/src/app/admin/components/Sidebar.tsx`
- Breadcrumbs: `/web/src/app/admin/components/Breadcrumbs.tsx`
- Header: `/web/src/app/admin/components/AdminHeader.tsx`

**Sales:**
- Layout: `/web/src/app/sales/layout.tsx`
- Nav: `/web/src/app/sales/_components/SalesNav.tsx`

**Shared:**
- Breadcrumbs: `/web/src/components/shared/Breadcrumbs.tsx`

**API:**
- Recent Activity: `/web/src/app/api/admin/audit-logs/recent/route.ts`

---

## Version History

- **v1.0** (2025-10-26): Initial documentation
  - Defined admin and sales navigation patterns
  - Documented breadcrumb implementation
  - Added mobile responsive guidelines
  - Created testing checklist

---

## Support

For questions or issues with navigation:
1. Check this documentation
2. Review related component files
3. Test on multiple screen sizes
4. Verify route mappings in sidebar/nav configs
