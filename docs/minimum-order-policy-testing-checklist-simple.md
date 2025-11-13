# Minimum Order Policy – Quick Frontend Test List

Use this condensed list for the next smoke pass. Track results with ✅ / ❌ and jot notes inline.

## Admin Settings (`/admin/settings/orders`)
1. Toggle OFF → ON → OFF, save each time, confirm no error banner.
2. Change amount to `$250`, save, reload page, confirm value sticks.
3. Note “Updated … by …” timestamp changes after a successful save.

## Customer Overrides (`/admin/customers/{id}`)
1. Find the “Minimum Order Override” card.
2. Set override to `$100` with a note, save, reload, confirm override + audit info.
3. Clear override and save; verify the customer shows the tenant default again.

## Sales – New Order (`/sales/orders/new`)
1. Pick a customer without override; confirm sidebar badge shows tenant minimum.
2. Pick a customer with override; confirm badge switches to override amount.
3. Add lines totaling below the active minimum:
   - Warning banner appears before submit.
   - Submit succeeds and success modal says it will route to manager approval.
4. Add lines totaling above the minimum:
   - No warning.
   - Submit succeeds without approval flag.

## Manager Approvals (`/sales/manager/approvals`)
1. Verify the under-minimum order appears with shortfall + threshold chips.
2. Approve it and confirm it leaves the queue.

## Order Detail
1. Open the order that violated the minimum.
2. Confirm `minimumOrderThreshold`, `minimumOrderViolation`, and `approvalReasons` fields display (UI or API payload).

## Edge Cases
1. Disable enforcement at the admin settings page, save, then create a $50 order—no warnings should show.
2. Re-enable enforcement and repeat: warning should return immediately.

Document any failures with:
`Section / Expected / Actual / Steps / Screenshot (if UI)` and re-run after fixes.***
