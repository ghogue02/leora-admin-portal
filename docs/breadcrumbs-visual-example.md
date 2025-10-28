# Admin Breadcrumbs Visual Examples

## How Breadcrumbs Appear on Admin Pages

### Example 1: Customers Page (`/admin/customers`)

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar │ Main Content Area                                   │
│         │                                                      │
│         │ 🏠 Admin Portal  >  Customers                       │
│         │    (clickable)       (current - bold)               │
│         │                                                      │
│         │ ┌───────────────────────────────────────────────┐   │
│         │ │ Customers                                     │   │
│         │ │ View and manage customers...                  │   │
│         │ └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**HTML Structure**:
```html
<nav class="flex items-center gap-2 text-sm text-gray-600" aria-label="Breadcrumb">
  <a href="/admin" class="flex items-center hover:text-gray-900 transition">
    <Home class="h-4 w-4" /> <!-- Home icon -->
  </a>
  <div class="flex items-center gap-2">
    <ChevronRight class="h-4 w-4 text-gray-400" />
    <span class="font-medium text-gray-900">Customers</span>
  </div>
</nav>
```

---

### Example 2: Sales Reps Page (`/admin/sales-reps`)

```
🏠 Admin Portal  >  Sales Reps & Territories
   (clickable)      (current - bold)
```

**HTML Structure**:
```html
<nav class="flex items-center gap-2 text-sm text-gray-600">
  <a href="/admin">🏠</a>
  <div class="flex items-center gap-2">
    <ChevronRight />
    <span class="font-medium text-gray-900">Sales Reps & Territories</span>
  </div>
</nav>
```

---

### Example 3: Customer Detail Page (`/admin/customers/12345`)

```
🏠 Admin Portal  >  Customers  >  #12345
   (clickable)      (clickable)    (current - bold)
```

**HTML Structure**:
```html
<nav class="flex items-center gap-2 text-sm text-gray-600">
  <a href="/admin">🏠</a>
  <div class="flex items-center gap-2">
    <ChevronRight />
    <a href="/admin/customers">Customers</a>
  </div>
  <div class="flex items-center gap-2">
    <ChevronRight />
    <span class="font-medium text-gray-900">#12345</span>
  </div>
</nav>
```

---

### Example 4: Inventory Pricing Detail (`/admin/inventory/pricing/789`)

```
🏠 Admin Portal  >  Inventory  >  Pricing  >  #789
   (clickable)      (clickable)    (clickable)  (current)
```

**HTML Structure**:
```html
<nav class="flex items-center gap-2 text-sm text-gray-600">
  <a href="/admin">🏠</a>
  <div class="flex items-center gap-2">
    <ChevronRight />
    <a href="/admin/inventory">Inventory</a>
  </div>
  <div class="flex items-center gap-2">
    <ChevronRight />
    <a href="/admin/inventory/pricing">Pricing</a>
  </div>
  <div class="flex items-center gap-2">
    <ChevronRight />
    <span class="font-medium text-gray-900">#789</span>
  </div>
</nav>
```

---

### Example 5: Admin Dashboard (`/admin`)

```
(No breadcrumbs shown - this is the home page)
```

**Behavior**: When `pathname === homeHref`, breadcrumbs return `null` and don't render.

---

## Visual Styling

### Colors
- **Links**: `text-gray-600` (default), `hover:text-gray-900` (hover)
- **Current Page**: `text-gray-900` (darker, bold)
- **Separator**: `text-gray-400` (lighter gray)

### Typography
- **Size**: `text-sm` (small)
- **Weight**: `font-medium` (current page only)

### Spacing
- **Gap between items**: `gap-2` (0.5rem)
- **Icon size**: `h-4 w-4` (1rem)

### Hover States
- Links have `transition` and change to `text-gray-900` on hover
- Smooth color transition

---

## Complete Page Layout

```
┌───────────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌─────────────────────────────────────────────┐  │
│ │         │ │ AdminHeader                                 │  │
│ │         │ └─────────────────────────────────────────────┘  │
│ │         │                                                   │
│ │ Sidebar │ ┌─────────────────────────────────────────────┐  │
│ │         │ │ Main Content (px-6 py-6)                    │  │
│ │         │ │                                             │  │
│ │         │ │ 🏠 Admin Portal > Customers                 │  │
│ │         │ │ (Breadcrumbs - auto from URL)               │  │
│ │         │ │                                             │  │
│ │         │ │ ┌─────────────────────────────────────────┐ │  │
│ │         │ │ │ {children}                              │ │  │
│ │         │ │ │ (Page content with mt-4 spacing)        │ │  │
│ │         │ │ └─────────────────────────────────────────┘ │  │
│ │         │ └─────────────────────────────────────────────┘  │
│ └─────────┘                                                   │
└───────────────────────────────────────────────────────────────┘
```

**Key Points**:
1. Breadcrumbs appear **above** page content
2. **4 spacing units** (mt-4) between breadcrumbs and content
3. **6 padding units** (px-6 py-6) around main content area
4. Consistent across all admin pages

---

## Accessibility

### ARIA Labels
- `aria-label="Breadcrumb"` on `<nav>` element
- `aria-label={homeLabel}` on home link

### Semantic HTML
- Uses `<nav>` for navigation landmark
- Uses `<a>` for clickable links
- Uses `<span>` for non-clickable current page

### Keyboard Navigation
- All links are keyboard accessible
- Proper focus states
- Tab order follows visual order

---

## Comparison: Sales vs Admin

| Aspect | Sales Pages | Admin Pages |
|--------|-------------|-------------|
| Home Label | "Sales Portal" | "Admin Portal" |
| Home Href | "/sales" | "/admin" |
| Show Icon | ✅ Yes (🏠) | ✅ Yes (🏠) |
| Auto-generate | ✅ Yes | ✅ Yes |
| Special Labels | ✅ Yes | ✅ Yes |
| Position | Above content | Above content |
| Styling | Gray theme | Gray theme |

**Result**: Perfectly consistent across both sections! ✅

---

## Testing Checklist

Visit each page and verify breadcrumbs:

- [ ] `/admin` → No breadcrumbs (home page)
- [ ] `/admin/customers` → "Admin Portal > Customers"
- [ ] `/admin/customers/new` → "Admin Portal > Customers > New"
- [ ] `/admin/customers/123` → "Admin Portal > Customers > #123"
- [ ] `/admin/sales-reps` → "Admin Portal > Sales Reps & Territories"
- [ ] `/admin/territories` → "Admin Portal > Sales Territories"
- [ ] `/admin/orders` → "Admin Portal > Orders"
- [ ] `/admin/accounts` → "Admin Portal > Accounts & Users"
- [ ] `/admin/inventory` → "Admin Portal > Inventory"
- [ ] `/admin/inventory/pricing` → "Admin Portal > Inventory > Pricing"
- [ ] `/admin/audit-logs` → "Admin Portal > Audit Logs"
- [ ] `/admin/bulk-operations` → "Admin Portal > Bulk Operations"
- [ ] `/admin/data-integrity` → "Admin Portal > Data Integrity"

---

## Implementation Complete ✅

All admin pages now have breadcrumbs matching the sales section pattern!
