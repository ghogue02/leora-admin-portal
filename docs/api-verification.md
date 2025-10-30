# API Verification Checklist (2025-10-17)

Steps to confirm newly delivered portal endpoints are wired correctly.

## Portal Profile (`GET/PATCH /api/portal/profile`)
1. Authenticate as a portal user and call `GET /api/portal/profile`.
2. Ensure response includes `user` and `customer` objects (with `paymentTerms` when available).
3. Call `PATCH /api/portal/profile` with `{ "fullName": "New Name" }`; verify response reflects the change and a subsequent `GET` returns the updated value.

## Customer Addresses (`/api/portal/addresses`)
1. `GET /api/portal/addresses` should return the seeded primary address.
2. `POST /api/portal/addresses` with a new address payload; expect HTTP 201 and the new address in subsequent `GET` results.
3. `PATCH /api/portal/addresses/{id}` to update fields or set `isDefault: true`; confirm other addresses lose default status.
4. Attempt `DELETE` on a non-default address to verify removal; deleting the default should return HTTP 409.

## Support Tickets (`/api/portal/support-tickets`)
1. `GET` without params returns paginated results (`meta.page`, `meta.totalPages`).
2. Pass `status=OPEN,RESOLVED` or `priority=high` to confirm filtering.
3. `POST` with `subject`/`description` creates ticket (201).
4. `PATCH /api/portal/support-tickets/{id}` with `status` and/or `addNote`; expect status change and note logged (activity record).

## Payment Methods (`/api/portal/payment-methods`)
1. `GET` returns existing cards tied to the customer with `terms` info.
2. `POST` with stub payload `{ "token": "tok_test", "brand": "visa", "last4": "4242", "expMonth": 12, "expYear": 2030, "isDefault": true }` creates a method (201) and demotes previous defaults.
3. Repeat `GET` to ensure the new card appears and `isDefault` flags are correct.

## Notification Digest Job (`src/jobs/notificationDigest.ts`)
1. Seed unread notifications and run `npm run jobs:run notification-digest`.
2. Confirm console logs include the tenant ID and digest payload (stub delivery placeholder).
