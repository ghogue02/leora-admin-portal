# Navigation Quick Reference

**Quick guide for developers working with navigation in Leora**

---

## Breadcrumbs

### Auto-generated (most pages)
Already set up in layouts - **no action needed!**

### Custom breadcrumbs (dynamic routes)
```tsx
import Breadcrumbs from "@/components/shared/Breadcrumbs";

<Breadcrumbs
  items={[
    { label: 'Customers', href: '/sales/customers' },
    { label: customer.name, href: null } // Current page (no href)
  ]}
/>
```

---

## Route Naming

### ✅ Correct Routes:
- `/admin/accounts` (NOT `/admin/users`)
- `/admin/sales-reps` (NOT `/admin/territories`)
- `/admin/audit-logs` (NOT `/admin/logs`)

### Quick Check:
See sidebar config at `/web/src/app/admin/components/Sidebar.tsx`

---

## Adding New Navigation Items

### Admin Sidebar:
Edit: `/web/src/app/admin/components/Sidebar.tsx`

```tsx
{
  label: "Your Page",
  href: "/admin/your-page",
  icon: YourIcon,
}
```

### Sales Navigation:
Edit: `/web/src/app/sales/_components/SalesNav.tsx`

---

## Recent Activity

Already implemented on admin dashboard.

To add to other pages:
```tsx
const response = await fetch("/api/admin/audit-logs/recent");
const { activities } = await response.json();
```

---

## Testing Checklist

- [ ] Page has breadcrumbs
- [ ] Links work on desktop
- [ ] Links work on mobile
- [ ] Active state shows current page
- [ ] Route matches sidebar/nav config

---

## Common Issues

**Breadcrumbs not showing?**
→ Check you're not on home/login page

**Wrong route in link?**
→ Check sidebar config for correct route

**Mobile menu not working?**
→ Verify layout includes mobile menu toggle

---

## Documentation

Full docs: `/web/docs/NAVIGATION_PATTERNS.md`
