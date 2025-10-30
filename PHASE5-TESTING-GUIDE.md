# PHASE 5: User Account Management - Testing Guide

Comprehensive testing guide for validating all user account management features.

---

## Prerequisites

### Database Setup
Ensure the following exist in your database:

```sql
-- Check for roles
SELECT * FROM "Role" WHERE "tenantId" = 'your-tenant-id';

-- Check for permissions
SELECT * FROM "Permission";

-- Check for role-permission mappings
SELECT r.name, p.code
FROM "RolePermission" rp
JOIN "Role" r ON r.id = rp."roleId"
JOIN "Permission" p ON p.id = rp."permissionId";

-- Check for customers (needed for portal users)
SELECT * FROM "Customer" WHERE "tenantId" = 'your-tenant-id' LIMIT 5;
```

### Authentication
You must have an active admin session. Login via:
- `/admin/login` (if using sales portal auth)
- Or have a valid `sales-session-id` cookie

---

## Test Plan

### 1. Internal Users - List Page

**URL:** `/admin/accounts`

#### Test Case 1.1: Page Loads
- [ ] Navigate to `/admin/accounts`
- [ ] Page loads without errors
- [ ] "Internal Users" tab is active by default
- [ ] Table headers display correctly
- [ ] "Create New Account" button is visible

**Expected:** Page displays with empty table or existing users

---

#### Test Case 1.2: Search Functionality
- [ ] Enter "john" in search box
- [ ] Click "Apply Filters"
- [ ] Results filter to users matching "john" in name or email
- [ ] Click "Clear Filters"
- [ ] All users display again

**Expected:** Search works for both name and email fields

---

#### Test Case 1.3: Role Filter
- [ ] Select a role from "Filter by role..." dropdown
- [ ] Click "Apply Filters"
- [ ] Only users with that role display
- [ ] Click "Clear Filters"

**Expected:** Only users with selected role appear

---

#### Test Case 1.4: Status Filter
- [ ] Select "Active" from status dropdown
- [ ] Click "Apply Filters"
- [ ] Only active users display
- [ ] Select "Inactive"
- [ ] Only inactive users display

**Expected:** Status filter works correctly

---

#### Test Case 1.5: Territory Filter (Internal Users Only)
- [ ] Enter a territory name
- [ ] Click "Apply Filters"
- [ ] Only users with sales rep profiles in that territory display

**Expected:** Territory filter works

---

#### Test Case 1.6: Sorting
- [ ] Click "Name / Email" column header
- [ ] Users sort alphabetically by name
- [ ] Click again
- [ ] Users sort in reverse order

**Expected:** Sorting toggles between asc/desc

---

#### Test Case 1.7: Pagination
- [ ] If more than 50 users exist, pagination controls display
- [ ] Click "Next" button
- [ ] Page 2 loads
- [ ] Click "Previous" button
- [ ] Page 1 loads

**Expected:** Pagination works correctly

---

#### Test Case 1.8: Bulk Selection
- [ ] Check "select all" checkbox in table header
- [ ] All visible users are selected
- [ ] Bulk action bar appears
- [ ] Uncheck "select all"
- [ ] All users are deselected
- [ ] Check individual user checkboxes
- [ ] Selection count updates

**Expected:** Bulk selection works

---

#### Test Case 1.9: Tab Switching
- [ ] Click "Portal Users" tab
- [ ] Portal users list displays
- [ ] Click "Internal Users" tab
- [ ] Internal users list displays

**Expected:** Tabs switch correctly, selections clear on switch

---

### 2. Internal Users - Create New

**URL:** `/admin/accounts/new`

#### Test Case 2.1: Form Loads
- [ ] Click "Create New Account" button
- [ ] Form page loads
- [ ] "Internal User" is selected by default
- [ ] All form fields are visible and empty

**Expected:** Form displays correctly

---

#### Test Case 2.2: Email Validation
- [ ] Enter invalid email: "notanemail"
- [ ] Click "Create Account"
- [ ] Error: "Invalid email format"
- [ ] Enter valid email: "test@example.com"
- [ ] No email error

**Expected:** Email validation works

---

#### Test Case 2.3: Required Fields
- [ ] Leave email empty
- [ ] Click "Create Account"
- [ ] Error: "Email, full name, and password are required"
- [ ] Fill in all required fields
- [ ] Error clears

**Expected:** Required field validation works

---

#### Test Case 2.4: Password Validation
- [ ] Enter password: "short"
- [ ] Enter confirm: "short"
- [ ] Click "Create Account"
- [ ] Error: "Password must be at least 8 characters"
- [ ] Enter password: "password123"
- [ ] Enter confirm: "password456"
- [ ] Click "Create Account"
- [ ] Error: "Passwords do not match"
- [ ] Make passwords match
- [ ] No password error

**Expected:** Password validation works

---

#### Test Case 2.5: Duplicate Email
- [ ] Enter email of existing user
- [ ] Fill in other fields
- [ ] Click "Create Account"
- [ ] Error: "User with this email already exists"

**Expected:** Duplicate detection works

---

#### Test Case 2.6: Role Selection
- [ ] Check 2-3 role checkboxes
- [ ] Roles are selected
- [ ] Uncheck one role
- [ ] Role is deselected

**Expected:** Multi-role selection works

---

#### Test Case 2.7: Create Sales Rep Profile
- [ ] Check "Create Sales Rep Profile" checkbox
- [ ] Territory field appears
- [ ] Leave territory empty
- [ ] Click "Create Account"
- [ ] Error: "Territory name is required when creating a sales rep profile"
- [ ] Enter territory name
- [ ] Error clears

**Expected:** Conditional territory validation works

---

#### Test Case 2.8: Successful Creation
- [ ] Fill all required fields correctly:
  - Email: `testuser1@example.com`
  - Full Name: `Test User One`
  - Password: `password123`
  - Confirm: `password123`
  - Select at least one role
- [ ] Click "Create Account"
- [ ] Success message appears
- [ ] Redirects to user detail page
- [ ] User details display correctly

**Expected:** User is created and stored in database

**Verify in Database:**
```sql
SELECT * FROM "User" WHERE email = 'testuser1@example.com';

-- Check roles were assigned
SELECT u.email, r.name
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON r.id = ur."roleId"
WHERE u.email = 'testuser1@example.com';

-- Check audit log
SELECT * FROM "AuditLog"
WHERE "entityType" = 'User'
AND action = 'CREATE'
ORDER BY "createdAt" DESC
LIMIT 1;
```

---

#### Test Case 2.9: Create with Sales Rep
- [ ] Fill form fields
- [ ] Check "Create Sales Rep Profile"
- [ ] Enter territory: "Test Territory"
- [ ] Click "Create Account"
- [ ] User created successfully
- [ ] User detail page shows sales rep profile

**Verify in Database:**
```sql
SELECT * FROM "SalesRep"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'testuser2@example.com');
```

---

### 3. Internal Users - Edit/Detail

**URL:** `/admin/accounts/user/[id]`

#### Test Case 3.1: Page Loads
- [ ] Click "Edit" on a user from list
- [ ] Detail page loads
- [ ] All user data populates correctly
- [ ] Roles are checked correctly
- [ ] Permissions display

**Expected:** Page loads with correct data

---

#### Test Case 3.2: Update Basic Info
- [ ] Change full name to "Updated Name"
- [ ] Click "Save Changes"
- [ ] Success message appears
- [ ] Name updates in UI
- [ ] Refresh page
- [ ] Updated name persists

**Expected:** Basic info updates work

**Verify in Database:**
```sql
SELECT * FROM "User" WHERE id = 'user-id';

-- Check audit log
SELECT * FROM "AuditLog"
WHERE "entityType" = 'User'
AND "entityId" = 'user-id'
AND action = 'UPDATE'
ORDER BY "createdAt" DESC
LIMIT 1;
```

---

#### Test Case 3.3: Update Email
- [ ] Change email to new unique email
- [ ] Click "Save Changes"
- [ ] Email updates successfully
- [ ] Try changing to existing email
- [ ] Error: "Email already in use by another user"

**Expected:** Email update works with duplicate check

---

#### Test Case 3.4: Toggle Active Status
- [ ] Uncheck "Active" checkbox
- [ ] Click "Save Changes"
- [ ] Status updates to inactive
- [ ] Check "Active" checkbox
- [ ] Click "Save Changes"
- [ ] Status updates to active

**Expected:** Status toggle works

---

#### Test Case 3.5: Update Roles
- [ ] Uncheck one role
- [ ] Check a different role
- [ ] Click "Update Roles"
- [ ] Success message appears
- [ ] Roles update in UI
- [ ] Permissions section updates to show new permissions

**Expected:** Role updates work

**Verify in Database:**
```sql
SELECT r.name, r.code
FROM "UserRole" ur
JOIN "Role" r ON r.id = ur."roleId"
WHERE ur."userId" = 'user-id';

-- Check audit log
SELECT * FROM "AuditLog"
WHERE "entityType" = 'User'
AND "entityId" = 'user-id'
AND "metadata"->>'action' = 'roles_updated'
ORDER BY "createdAt" DESC
LIMIT 1;
```

---

#### Test Case 3.6: View Sales Rep Profile
- [ ] For user with sales rep profile
- [ ] Sales Rep Profile section displays
- [ ] Territory shows correctly
- [ ] Quotas display correctly
- [ ] Sample allowance shows
- [ ] Assigned customers list (if any)

**Expected:** Sales rep info displays correctly

---

#### Test Case 3.7: Deactivate User
- [ ] Click "Deactivate User" button
- [ ] Confirmation dialog appears
- [ ] Click "OK"
- [ ] Success message appears
- [ ] Redirects to accounts list
- [ ] User shows as inactive in list

**Expected:** Deactivation works

**Verify in Database:**
```sql
SELECT * FROM "User" WHERE id = 'user-id';
-- isActive should be false

SELECT * FROM "AuditLog"
WHERE "entityType" = 'User'
AND "entityId" = 'user-id'
AND action = 'STATUS_CHANGE'
ORDER BY "createdAt" DESC
LIMIT 1;
```

---

### 4. Portal Users - List Page

**URL:** `/admin/accounts` (Portal Users tab)

#### Test Case 4.1: Tab Switch
- [ ] Click "Portal Users" tab
- [ ] Portal users display
- [ ] Columns show: Name/Email, Role, Linked Customer, Status, Last Login
- [ ] Search and filters available

**Expected:** Portal users list displays correctly

---

#### Test Case 4.2: Portal User Search
- [ ] Enter customer name in search
- [ ] Click "Apply Filters"
- [ ] Portal users for that customer display

**Expected:** Search works

---

#### Test Case 4.3: Status Filter
- [ ] Select "ACTIVE" from status dropdown
- [ ] Click "Apply Filters"
- [ ] Only active portal users display
- [ ] Try "INVITED" and "DISABLED"
- [ ] Respective users display

**Expected:** Status filter works for all three states

---

### 5. Portal Users - Create New

**URL:** `/admin/accounts/new` (Portal User selected)

#### Test Case 5.1: Switch to Portal User
- [ ] Navigate to `/admin/accounts/new`
- [ ] Click "Portal User" button
- [ ] Form switches to portal user fields
- [ ] Customer dropdown loads

**Expected:** Portal user form displays

---

#### Test Case 5.2: Customer Dropdown
- [ ] Customer dropdown populates with customers
- [ ] Customers show name and account number
- [ ] Can search/select customer

**Expected:** Customer selection works

---

#### Test Case 5.3: Required Fields
- [ ] Leave email empty
- [ ] Click "Create Account"
- [ ] Error: "Email, full name, and customer are required"

**Expected:** Validation works

---

#### Test Case 5.4: Create Portal User
- [ ] Fill in:
  - Email: `portaluser1@example.com`
  - Full Name: `Portal User One`
  - Customer: Select a customer
  - Role: Select a portal role
- [ ] Click "Create Account"
- [ ] Success message appears
- [ ] Redirects to portal user detail page
- [ ] Status is "INVITED"

**Expected:** Portal user created successfully

**Verify in Database:**
```sql
SELECT * FROM "PortalUser" WHERE email = 'portaluser1@example.com';

-- Check customer linkage
SELECT pu.email, c.name
FROM "PortalUser" pu
JOIN "Customer" c ON c.id = pu."customerId"
WHERE pu.email = 'portaluser1@example.com';

-- Check roles
SELECT pu.email, r.name
FROM "PortalUser" pu
JOIN "PortalUserRole" pur ON pu.id = pur."portalUserId"
JOIN "Role" r ON r.id = pur."roleId"
WHERE pu.email = 'portaluser1@example.com';
```

---

### 6. Portal Users - Edit/Detail

**URL:** `/admin/accounts/portal-user/[id]`

#### Test Case 6.1: Page Loads
- [ ] Click "Edit" on portal user from list
- [ ] Detail page loads
- [ ] All data populates correctly
- [ ] Customer info displays
- [ ] Roles checked correctly

**Expected:** Page loads with correct data

---

#### Test Case 6.2: Update Basic Info
- [ ] Change full name
- [ ] Change status to "ACTIVE"
- [ ] Click "Save Changes"
- [ ] Updates save successfully

**Expected:** Basic updates work

---

#### Test Case 6.3: View Customer Details
- [ ] Linked Customer section displays
- [ ] Customer name, account number, email, phone show
- [ ] Sales rep info shows (if assigned)
- [ ] "View Customer Details" link works

**Expected:** Customer info displays correctly

---

#### Test Case 6.4: Update Roles
- [ ] Change role selections
- [ ] Click "Update Roles"
- [ ] Roles update successfully
- [ ] Permissions section updates

**Expected:** Role updates work

---

#### Test Case 6.5: View Recent Sessions
- [ ] If user has logged in, sessions display
- [ ] Session creation and expiration times show
- [ ] Sessions sorted by most recent

**Expected:** Session tracking works

---

#### Test Case 6.6: Disable Portal User
- [ ] Click "Disable Portal User" button
- [ ] Confirmation appears
- [ ] Click "OK"
- [ ] Status changes to DISABLED
- [ ] Redirects to accounts list

**Expected:** Disable works

**Verify in Database:**
```sql
SELECT * FROM "PortalUser" WHERE id = 'portal-user-id';
-- status should be 'DISABLED'
```

---

### 7. Roles & Permissions

#### Test Case 7.1: Roles API
```bash
curl -X GET 'http://localhost:3000/api/admin/roles' \
  -H 'Cookie: sales-session-id=your-token'
```

- [ ] All roles return
- [ ] Permissions included for each role
- [ ] User counts shown

**Expected:** API returns all roles

---

#### Test Case 7.2: Filter Roles by Type
```bash
curl -X GET 'http://localhost:3000/api/admin/roles?type=internal' \
  -H 'Cookie: sales-session-id=your-token'
```

- [ ] Only internal roles return (not starting with "portal.")
- [ ] Portal-specific roles excluded

**Expected:** Type filter works

---

#### Test Case 7.3: Permissions API
```bash
curl -X GET 'http://localhost:3000/api/admin/permissions' \
  -H 'Cookie: sales-session-id=your-token'
```

- [ ] All permissions return
- [ ] Role mappings included
- [ ] Role counts accurate

**Expected:** API returns all permissions

---

### 8. Security Tests

#### Test Case 8.1: Unauthenticated Access
- [ ] Log out or clear cookies
- [ ] Try accessing `/api/admin/accounts/users`
- [ ] Returns 401 Unauthorized

**Expected:** Authentication required

---

#### Test Case 8.2: Non-Admin Access
- [ ] Login as user without admin role
- [ ] Try accessing `/admin/accounts`
- [ ] Returns 403 Forbidden

**Expected:** Admin role required

---

#### Test Case 8.3: Password Hashing
```sql
-- Check that passwords are hashed, not plain-text
SELECT email, "hashedPassword" FROM "User" WHERE email = 'testuser1@example.com';
```

- [ ] hashedPassword starts with "$2a$" or "$2b$" (bcrypt)
- [ ] Password is NOT plain text

**Expected:** Passwords are hashed

---

#### Test Case 8.4: Audit Logging
```sql
-- Check audit logs for recent operations
SELECT
  "entityType",
  action,
  "createdAt",
  metadata
FROM "AuditLog"
WHERE "entityType" IN ('User', 'PortalUser')
ORDER BY "createdAt" DESC
LIMIT 10;
```

- [ ] All create operations logged
- [ ] All update operations logged
- [ ] All role change operations logged
- [ ] All status changes logged
- [ ] IP address captured (if available)

**Expected:** All operations are audited

---

### 9. Edge Cases

#### Test Case 9.1: Empty Results
- [ ] Search for non-existent user
- [ ] "No internal users found" message displays

**Expected:** Empty state handled gracefully

---

#### Test Case 9.2: Long Names/Emails
- [ ] Create user with very long name (100+ chars)
- [ ] UI handles gracefully (truncation or wrapping)

**Expected:** Long text handled

---

#### Test Case 9.3: Special Characters
- [ ] Create user with name containing: "O'Brien"
- [ ] Create user with email: "test+tag@example.com"
- [ ] Both work correctly

**Expected:** Special characters handled

---

#### Test Case 9.4: Multiple Roles
- [ ] Assign 5+ roles to one user
- [ ] All roles saved correctly
- [ ] All permissions aggregated
- [ ] No duplicates in permission list

**Expected:** Multi-role assignment works

---

#### Test Case 9.5: Role Removal
- [ ] Remove all roles from user
- [ ] User saved with no roles
- [ ] Permissions section empty

**Expected:** Zero roles allowed

---

### 10. Performance Tests

#### Test Case 10.1: Large User List
- [ ] Load page with 100+ users
- [ ] Page loads in < 2 seconds
- [ ] Pagination works smoothly

**Expected:** Performance is acceptable

---

#### Test Case 10.2: Search Performance
- [ ] Search with 1000+ users
- [ ] Results return in < 1 second
- [ ] Search is case-insensitive

**Expected:** Search is fast

---

#### Test Case 10.3: Concurrent Updates
- [ ] Open user in two browser tabs
- [ ] Update different fields in each tab
- [ ] Both updates succeed
- [ ] Latest update wins (last-write-wins)

**Expected:** Concurrent updates handled

---

## Regression Testing

After any code changes, run through these critical paths:

1. **Create Internal User** → Verify in database
2. **Create Portal User** → Verify customer linkage
3. **Update Roles** → Verify permissions update
4. **Deactivate User** → Verify soft delete
5. **Search Users** → Verify results accurate
6. **Filter by Status** → Verify filtering works

---

## Test Data Setup

### Create Test Roles
```sql
-- Ensure these roles exist
INSERT INTO "Role" (id, "tenantId", name, code, "isDefault")
VALUES
  (gen_random_uuid(), 'your-tenant-id', 'Test Admin', 'test.admin', false),
  (gen_random_uuid(), 'your-tenant-id', 'Test Sales Rep', 'test.salesrep', false),
  (gen_random_uuid(), 'your-tenant-id', 'Test Portal User', 'portal.test', false);
```

### Create Test Customers
```sql
INSERT INTO "Customer" (id, "tenantId", name, "accountNumber", "billingEmail")
VALUES
  (gen_random_uuid(), 'your-tenant-id', 'Test Customer 1', 'TEST-001', 'test1@customer.com'),
  (gen_random_uuid(), 'your-tenant-id', 'Test Customer 2', 'TEST-002', 'test2@customer.com');
```

---

## Cleanup After Testing

```sql
-- Remove test users
DELETE FROM "User" WHERE email LIKE 'test%@example.com';
DELETE FROM "PortalUser" WHERE email LIKE 'portaluser%@example.com';

-- Remove test roles (if created)
DELETE FROM "Role" WHERE code LIKE 'test.%';

-- Remove test customers (if created)
DELETE FROM "Customer" WHERE "accountNumber" LIKE 'TEST-%';
```

---

## Bug Reporting

When reporting bugs, include:

1. **Steps to Reproduce**
2. **Expected Behavior**
3. **Actual Behavior**
4. **Screenshots** (if applicable)
5. **Browser/Device** (Chrome, Safari, etc.)
6. **Console Errors** (F12 → Console tab)
7. **Network Errors** (F12 → Network tab)
8. **Database State** (relevant queries)

---

## Success Criteria

All tests must pass before considering implementation complete:

- [ ] All list pages load correctly
- [ ] All create forms work
- [ ] All update forms work
- [ ] All delete operations work
- [ ] All filters work
- [ ] All searches work
- [ ] All validations work
- [ ] All error messages display
- [ ] All success messages display
- [ ] All audit logs created
- [ ] All security checks pass
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive on mobile
- [ ] Accessible (keyboard navigation works)

---

## Automated Testing

For future implementation, consider:

```typescript
// Jest + React Testing Library
describe('User Management', () => {
  it('creates new user successfully', async () => {
    // Test implementation
  });

  it('validates email format', async () => {
    // Test implementation
  });

  it('prevents duplicate emails', async () => {
    // Test implementation
  });

  // More tests...
});
```

---

## Conclusion

This testing guide covers all critical paths and edge cases for the user account management system. Follow this guide systematically to ensure the implementation is production-ready.

**Testing Estimate:** 2-3 hours for complete manual testing
**Automated Testing:** Future enhancement (recommended)
