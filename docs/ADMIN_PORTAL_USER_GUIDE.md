# Admin Portal User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Navigation](#navigation)
4. [Modules](#modules)
5. [Common Tasks](#common-tasks)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Overview

The Admin Portal is a comprehensive management interface for Leora2, providing administrative access to manage customers, sales representatives, orders, inventory, users, and system data.

### Key Features
- Customer relationship management
- Sales representative management
- Order tracking and management
- Inventory management and pricing
- User and access control management
- Audit log viewing and analysis
- Data integrity monitoring
- Bulk operations for efficiency
- Global search across all entities

### Access Requirements
- **Role Required**: `sales.admin`
- **URL**: `/admin`
- **Authentication**: Active user session with admin role

---

## Getting Started

### Logging In
1. Navigate to `/admin` in your browser
2. If not logged in, you'll be redirected to the login page
3. Enter your email and password
4. Upon successful login, you'll see the Admin Dashboard

### First-Time Setup
After logging in for the first time:
1. Review the Dashboard to understand current system metrics
2. Check the keyboard shortcuts help (press `Ctrl+/` or `Cmd+/`)
3. Familiarize yourself with the navigation menu
4. Test the global search (press `Ctrl+K` or `Cmd+K`)

---

## Navigation

### Main Menu (Left Sidebar)
The sidebar provides access to all admin modules:

- **Dashboard** - Overview of key metrics and statistics
- **Customers** - Customer management and relationship tracking
- **Sales Reps** - Sales representative management
- **Inventory** - Product inventory and pricing management
- **Users** - User account management
- **Audit Logs** - System activity and change tracking
- **Data Integrity** - Data quality monitoring and checks

### Mobile Navigation
On mobile devices (screen width < 1024px):
- Tap the hamburger menu (☰) in the top-left to open the sidebar
- Tap outside the sidebar or the X button to close it

### Breadcrumbs
Breadcrumbs appear at the top of each page, showing your current location in the hierarchy. Click any breadcrumb to navigate back to that level.

---

## Modules

### Dashboard
**URL**: `/admin`

The Dashboard provides a high-level overview of your business:

**Metrics Displayed**:
- Total Customers (with trend)
- Active Orders (with trend)
- Total Revenue (with trend)
- Inventory Items
- Active Users
- Recent Activities

**Quick Actions**:
- View data integrity status
- Access recent audit logs
- Navigate to key modules

---

### Customers
**URL**: `/admin/customers`

Manage customer accounts and relationships.

**Features**:
- Search customers by name, email, or account number
- Filter by sales rep, risk status, or territory
- Sort by any column
- View customer details and history
- Reassign customers to different sales reps (bulk operation)
- Export customer list to CSV

**Customer Details Page** (`/admin/customers/[id]`):
- Basic Information (name, contact details, address)
- Sales Rep assignment
- Risk status and health metrics
- Order history
- Activity timeline
- Account settings

**Creating a New Customer**:
1. Click "New Customer" button
2. Fill in required fields:
   - Account Name
   - Billing Email
   - Sales Rep (optional)
   - Address Information
3. Click "Create Customer"
4. You'll be redirected to the customer detail page

**Editing a Customer**:
1. Navigate to customer detail page
2. Click "Edit" button
3. Modify fields as needed
4. Click "Save Changes"
5. Changes are logged in the audit log

**Reassigning Customers** (Bulk):
1. Select customers using checkboxes
2. Click "Reassign" button
3. Choose new sales rep from dropdown
4. Add reason for reassignment (for audit)
5. Click "Confirm"
6. All selected customers are reassigned

---

### Sales Representatives
**URL**: `/admin/sales-reps`

Manage sales representative accounts and territories.

**Features**:
- View all sales reps
- Filter by active/inactive status
- View customer assignments
- Track sales metrics
- Manage territories

**Sales Rep Details** (`/admin/sales-reps/[id]`):
- Personal information
- Assigned customers
- Sales performance metrics
- Activity history
- Territory assignment

---

### Inventory
**URL**: `/admin/inventory`

Manage product inventory and pricing.

**Features**:
- View inventory by SKU and location
- Track on-hand and allocated quantities
- Adjust inventory levels
- Manage pricing tiers
- Export inventory data

**Inventory Details** (`/admin/inventory/[skuId]`):
- SKU information
- Current stock levels by location
- Pricing information
- Recent inventory adjustments
- Audit history

**Adjusting Inventory**:
1. Navigate to inventory detail page
2. Click "Adjust Inventory" button
3. Select location
4. Enter adjustment quantity (positive or negative)
5. Add reason for adjustment
6. Click "Submit"
7. Adjustment is logged in audit log

**Managing Pricing** (`/admin/inventory/pricing`):
- View price lists
- Update pricing tiers
- Set customer-specific pricing
- Track pricing history

---

### Users
**URL**: `/admin/accounts`

Manage user accounts and access control.

**Features**:
- View all users (internal and portal)
- Create new user accounts
- Assign roles and permissions
- Activate/deactivate users
- Reset passwords
- View login history

**User Types**:
- **Internal Users**: Employees with access to sales/admin portals
- **Portal Users**: Customer contacts with access to customer portal

**Creating a User**:
1. Click "New Account" button
2. Select user type (Internal or Portal)
3. Fill in required fields:
   - Email
   - Full Name
   - Role
   - Customer (for portal users)
4. Click "Create Account"
5. User receives invitation email

**Managing User Roles**:
1. Navigate to user detail page
2. Click "Edit Roles" button
3. Select/deselect roles
4. Click "Save Changes"

**Deactivating a User**:
1. Navigate to user detail page
2. Click "Deactivate" button
3. Confirm action
4. User can no longer log in

---

### Audit Logs
**URL**: `/admin/audit-logs`

View and analyze system activity and changes.

**Features**:
- View all system changes
- Filter by entity type, action, user, or date range
- View detailed change history
- Export audit logs
- Generate audit reports

**Statistics** (`/admin/audit-logs/stats`):
- Activity by entity type
- Activity by user
- Activity over time
- Most common actions

**Filtering Audit Logs**:
1. Use filter dropdowns at top of page
2. Select entity type (Customer, Order, etc.)
3. Select action type (CREATE, UPDATE, DELETE)
4. Select user (optional)
5. Select date range
6. Click "Apply Filters"

**Viewing Change Details**:
1. Click on any audit log entry
2. Modal shows:
   - Who made the change
   - When it was made
   - What changed (before/after values)
   - Metadata (IP address, user agent)

---

### Data Integrity
**URL**: `/admin/data-integrity` (coming soon)

Monitor and maintain data quality.

**Features**:
- Run integrity checks
- View data quality score
- Identify and fix data issues
- Schedule automated checks
- Generate integrity reports

**Running a Manual Check**:
1. Click "Run Check" button
2. Select check type (full or specific rules)
3. Wait for results
4. Review findings
5. Apply fixes if available

---

## Common Tasks

### Finding a Customer
**Method 1: Global Search**
1. Press `Ctrl+K` (or `Cmd+K` on Mac)
2. Type customer name, email, or account number
3. Select from results
4. You're navigated to customer detail page

**Method 2: Customer List**
1. Navigate to Customers module
2. Use search box to filter
3. Click on customer to view details

### Changing a Customer's Sales Rep
**Single Customer**:
1. Navigate to customer detail page
2. Click "Edit" button
3. Change Sales Rep dropdown
4. Click "Save Changes"

**Multiple Customers**:
1. Navigate to Customers list
2. Select customers using checkboxes
3. Click "Reassign" button
4. Choose new sales rep
5. Add reason
6. Click "Confirm"

### Viewing Order History
1. Navigate to customer detail page
2. Scroll to "Order History" section
3. View all orders for that customer
4. Click order ID to view order details

### Exporting Data
1. Navigate to list page (Customers, Orders, etc.)
2. Apply filters if desired
3. Click "Export" button
4. Choose format (CSV, Excel)
5. File downloads automatically

### Checking Who Made a Change
1. Navigate to Audit Logs
2. Filter by entity type and entity ID
3. Review list of changes
4. Click entry to see full details

### Adjusting Inventory
1. Navigate to Inventory module
2. Search for SKU
3. Click on SKU to view details
4. Click "Adjust Inventory"
5. Select location
6. Enter adjustment quantity
7. Add reason
8. Click "Submit"

---

## Keyboard Shortcuts

The admin portal supports several keyboard shortcuts for efficiency:

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save current form |
| `Ctrl+K` / `Cmd+K` | Open global search |
| `Esc` | Close modals/dialogs |
| `Ctrl+/` / `Cmd+/` | Show keyboard shortcuts help |

**Note**: Press `Ctrl+/` (or `Cmd+/`) anytime to see the full list of available shortcuts.

---

## Troubleshooting

### I can't access the admin portal
**Possible causes**:
- You don't have the `sales.admin` role
- Your account is inactive
- Your session has expired

**Solutions**:
1. Contact your system administrator to check your role
2. Try logging out and logging back in
3. Clear your browser cache and cookies

### Changes aren't saving
**Possible causes**:
- Network error
- Validation error
- Session expired

**Solutions**:
1. Check for error messages on the page
2. Ensure all required fields are filled
3. Try refreshing the page
4. Check your internet connection

### Search isn't working
**Possible causes**:
- Query too short (minimum 2 characters)
- Network error
- No matching results

**Solutions**:
1. Type at least 2 characters
2. Try different search terms
3. Check for typos
4. Ensure entity exists in database

### Bulk operation failed partially
**What it means**:
Some items succeeded, others failed.

**What to do**:
1. Check the error message for details
2. Review audit logs to see which items succeeded
3. Fix the failed items individually
4. Re-run bulk operation for failed items only

### Dashboard metrics are outdated
**Possible causes**:
- Cache not refreshed
- Data sync issue

**Solutions**:
1. Refresh the page (F5)
2. Clear browser cache
3. Wait a few minutes and check again
4. Contact support if issue persists

---

## FAQ

### Q: Can I undo a change?
**A**: There is no automatic undo, but you can view the previous value in the audit log and manually revert the change.

### Q: How long are audit logs retained?
**A**: Audit logs are retained indefinitely. However, you can filter by date range to view specific periods.

### Q: Can I create custom reports?
**A**: Currently, you can export data to CSV and create custom reports using spreadsheet software. Built-in reporting is planned for a future release.

### Q: Why can't I see some customers?
**A**: You only see customers in your tenant. If you're missing customers, they may be in a different tenant or deleted.

### Q: How do I reset a user's password?
**A**: Navigate to the user detail page and click "Reset Password". The user will receive an email with reset instructions.

### Q: Can I bulk delete customers?
**A**: For data integrity, bulk deletion is not currently supported. Customers must be deleted individually from their detail page.

### Q: What's the difference between deactivating and deleting?
**A**:
- **Deactivate**: User/customer is hidden but data is preserved. Can be reactivated later.
- **Delete**: Permanently removes the record and all related data. Cannot be undone.

### Q: How do I add a new sales rep?
**A**: Sales reps are created from user accounts. First create a user with the `sales.rep` role, then a sales rep profile is automatically created.

### Q: Can portal users access the admin portal?
**A**: No, only users with the `sales.admin` role can access the admin portal. Portal users access `/portal` instead.

### Q: How do I know if my changes were saved?
**A**: You'll see a success toast notification (green message in top-right) when changes are saved successfully.

### Q: Where can I see my recent activity?
**A**: Navigate to Audit Logs and filter by your user account to see all changes you've made.

---

## Support

For additional help or to report issues:
- Contact: support@leora2.com
- Documentation: [Admin API Reference](/docs/ADMIN_API_REFERENCE.md)
- Troubleshooting Guide: [Troubleshooting](/docs/TROUBLESHOOTING.md)

---

**Last Updated**: 2025-10-19
**Version**: 1.0
