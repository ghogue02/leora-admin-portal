# Frontend Smoke Testing Checklist

Fast checklist for verifying the CRM catalog + sales workspace after deploying export/search changes.

## 1. Environment Prep
- [ ] Hard refresh browser (`Cmd+Shift+R`) and use a private window.
- [ ] Confirm you're logged in as a sales user with tenant `well-crafted`.
- [ ] Open DevTools → Network → Disable cache while DevTools is open.

## 2. Catalog Search & Filters
- [ ] Visit `/sales/catalog` and verify the grid loads within 3 seconds.
- [ ] Use the search box for `chardonnay` — results update and pagination count matches.
- [ ] Toggle **In Stock Only** and verify out-of-stock rows disappear.
- [ ] Apply a brand or category pill; `Clear filters` resets state.

## 3. Export Flow (CSV/PDF/Excel)
- [ ] Click **Export catalog** and choose each format (CSV, PDF, Excel) sequentially.
- [ ] Toast shows “Export queued” and the job table lists new entries with `QUEUED` → `PROCESSING` → `COMPLETED`.
- [ ] Download links open correct file type (spot‑check CSV header, PDF summary text, Excel first row).
- [ ] Reload page, ensure latest 25 jobs render with human timestamps and status badges.

## 4. Universal Search
- [ ] Hit the search input in the global header, query `wine`.
- [ ] **Customers tab** returns records matching name/account number/email (no errors in console).
- [ ] **Orders tab** returns recent orders, including PO number highlight.
- [ ] Empty results show “No matches” instead of a spinner.

## 5. Sales Session Guardrails
- [ ] Open DevTools console → run `document.cookie = ''` to clear session, then refresh `/sales/catalog`.
- [ ] Expect redirect to `/sales/login` with “session expired” toast; log back in and confirm catalog still loads.

## 6. Regression Quick Scan
- [ ] Navigate to `/sales/orders/new` and ensure product picker still renders.
- [ ] Open `/sales/customers/{id}` for a recent account; tabs and activity feed load without 500 errors.
- [ ] Confirm there are no red errors in DevTools console for each page visited.

> Tip: capture screenshots of each step so Product/QA can diff UI between deployments.

