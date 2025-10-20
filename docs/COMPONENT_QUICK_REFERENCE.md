# Admin Portal Component Quick Reference

Quick reference guide for using the new admin portal components introduced in Phase 10.

---

## LoadingSpinner

**Import**: `import { LoadingSpinner, SkeletonTable, SkeletonCard, SkeletonForm } from '@/app/admin/components/LoadingSpinner'`

### Basic Spinner
```tsx
<LoadingSpinner size="md" text="Loading..." />
```

### Full Screen Loading
```tsx
<LoadingSpinner size="lg" text="Processing..." fullScreen />
```

### Table Skeleton
```tsx
{loading ? <SkeletonTable rows={10} columns={6} /> : <table>...</table>}
```

### Card Skeleton
```tsx
{loading ? <SkeletonCard /> : <div className="card">...</div>}
```

### Form Skeleton
```tsx
{loading ? <SkeletonForm /> : <form>...</form>}
```

---

## Toast Notifications

**Import**: `import { toast, toastSuccess, toastError, toastWarning, toastInfo, toastPromise } from '@/app/admin/components/Toast'`

### Success Toast
```tsx
toastSuccess('Customer saved successfully');
```

### Error Toast
```tsx
toastError('Failed to save customer', 'Please try again');
```

### Promise-Based Toast
```tsx
toastPromise(
  saveCustomer(data),
  {
    loading: 'Saving customer...',
    success: 'Customer saved successfully!',
    error: 'Failed to save customer'
  }
);
```

### Custom Toast
```tsx
toast.success('Custom message', {
  description: 'Additional details',
  duration: 5000,
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo')
  }
});
```

---

## Confirmation Dialog

**Import**: `import { useConfirmDialog } from '@/app/admin/components/ConfirmDialog'`

### Setup
```tsx
const { confirm, ConfirmDialogComponent } = useConfirmDialog();

// Render in component
return (
  <>
    {/* Your content */}
    <ConfirmDialogComponent />
  </>
);
```

### Delete Confirmation
```tsx
confirm({
  title: 'Delete Customer',
  description: 'Are you sure? This action cannot be undone.',
  confirmText: 'Delete',
  variant: 'danger',
  onConfirm: async () => {
    await deleteCustomer(id);
  }
});
```

### Confirmation with Reason
```tsx
confirm({
  title: 'Reassign Customers',
  description: 'Reassign selected customers to a new sales rep?',
  itemCount: selectedIds.length,
  variant: 'warning',
  requireReason: true,
  reasonLabel: 'Reason for reassignment',
  onConfirm: async (reason) => {
    await bulkReassign(selectedIds, newRepId, reason);
  }
});
```

---

## Unsaved Changes Warning

**Import**: `import { UnsavedChangesWarning, useUnsavedChanges } from '@/app/admin/components/UnsavedChangesWarning'`

### Setup
```tsx
const [initialData, setInitialData] = useState(customer);
const [formData, setFormData] = useState(customer);
const hasChanges = useUnsavedChanges(initialData, formData);
```

### Render Warning
```tsx
<UnsavedChangesWarning hasUnsavedChanges={hasChanges} onSave={handleSave} />
```

### Update Initial Data After Save
```tsx
const handleSave = async () => {
  await saveCustomer(formData);
  setInitialData(formData); // Clear warning
};
```

---

## Keyboard Shortcuts

**Import**: `import { useKeyboardShortcut } from '@/app/admin/components/KeyboardShortcuts'`

### Save Shortcut
```tsx
useKeyboardShortcut('save', handleSave, [formData]);
```

### Search Shortcut
```tsx
useKeyboardShortcut('search', () => setSearchOpen(true), []);
```

### Close Shortcut
```tsx
useKeyboardShortcut('escape', handleClose, [isOpen]);
```

**Note**: KeyboardShortcutsHelp component is automatically included in admin layout.

---

## Global Search

**Usage**: Press `Ctrl+K` (or `Cmd+K` on Mac) anywhere in the admin portal.

**Features**:
- Searches customers, orders, users, products
- Keyboard navigation (arrows + Enter)
- Auto-debounced (300ms)
- Shows grouped results

**Note**: GlobalSearch component is automatically included in admin layout.

---

## Pagination

**Import**:
```tsx
import { Pagination } from '@/app/admin/components/Pagination';
import { usePagination } from '@/app/admin/hooks/usePagination';
```

### Setup
```tsx
const pagination = usePagination(50); // 50 items per page

useEffect(() => {
  fetchData(pagination.offset, pagination.limit);
}, [pagination.page, pagination.pageSize]);

const fetchData = async (offset, limit) => {
  const response = await fetch(`/api/data?offset=${offset}&limit=${limit}`);
  const data = await response.json();
  pagination.setTotal(data.total);
};
```

### Render Pagination
```tsx
<Pagination
  currentPage={pagination.page}
  totalPages={pagination.totalPages}
  pageSize={pagination.pageSize}
  totalItems={pagination.total}
  onPageChange={pagination.goToPage}
  onPageSizeChange={pagination.setPageSize}
/>
```

---

## Debounce Hook

**Import**: `import { useDebounce } from '@/app/admin/hooks/useDebounce'`

### Debounce Search Input
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);
```

### Debounce Callback
```tsx
import { useDebouncedCallback } from '@/app/admin/hooks/useDebounce';

const debouncedSave = useDebouncedCallback(
  (data) => saveToServer(data),
  500
);

// Call anytime - will debounce
debouncedSave(formData);
```

---

## Complete Example: List Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner, SkeletonTable } from '@/app/admin/components/LoadingSpinner';
import { toastSuccess, toastError } from '@/app/admin/components/Toast';
import { useConfirmDialog } from '@/app/admin/components/ConfirmDialog';
import { Pagination } from '@/app/admin/components/Pagination';
import { usePagination } from '@/app/admin/hooks/usePagination';
import { useDebounce } from '@/app/admin/hooks/useDebounce';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 300);
  const pagination = usePagination(50);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    fetchCustomers();
  }, [pagination.page, pagination.pageSize, debouncedSearch]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/customers?offset=${pagination.offset}&limit=${pagination.limit}&search=${debouncedSearch}`
      );
      const data = await response.json();
      setCustomers(data.customers);
      pagination.setTotal(data.total);
    } catch (error) {
      toastError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    confirm({
      title: 'Delete Customer',
      description: `Are you sure you want to delete ${name}?`,
      variant: 'danger',
      requireReason: true,
      onConfirm: async (reason) => {
        try {
          await fetch(`/api/admin/customers/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason })
          });
          toastSuccess('Customer deleted');
          fetchCustomers();
        } catch (error) {
          toastError('Failed to delete customer');
        }
      }
    });
  };

  return (
    <div>
      <h1>Customers</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers..."
      />

      {loading ? (
        <SkeletonTable rows={10} columns={6} />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Sales Rep</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>{customer.accountName}</td>
                <td>{customer.billingEmail}</td>
                <td>{customer.salesRep?.name}</td>
                <td>
                  <button onClick={() => handleDelete(customer.id, customer.accountName)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        totalItems={pagination.total}
        onPageChange={pagination.goToPage}
        onPageSizeChange={pagination.setPageSize}
      />

      <ConfirmDialogComponent />
    </div>
  );
}
```

---

## Complete Example: Edit Form

```tsx
'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/app/admin/components/LoadingSpinner';
import { toastSuccess, toastError } from '@/app/admin/components/Toast';
import { UnsavedChangesWarning, useUnsavedChanges } from '@/app/admin/components/UnsavedChangesWarning';
import { useKeyboardShortcut } from '@/app/admin/components/KeyboardShortcuts';

export default function CustomerEditPage({ params }: { params: { id: string } }) {
  const [initialData, setInitialData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasChanges = useUnsavedChanges(initialData, formData);

  useEffect(() => {
    fetchCustomer();
  }, []);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${params.id}`);
      const data = await response.json();
      setInitialData(data);
      setFormData(data);
    } catch (error) {
      toastError('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      toastSuccess('Customer saved successfully');
      setInitialData(formData);
    } catch (error) {
      toastError('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  useKeyboardShortcut('save', handleSave, [formData]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading customer..." fullScreen />;
  }

  return (
    <div>
      <UnsavedChangesWarning hasUnsavedChanges={hasChanges} onSave={handleSave} />

      <h1>Edit Customer</h1>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <label>
          Account Name
          <input
            type="text"
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={formData.billingEmail}
            onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
          />
        </label>

        <button type="submit" disabled={saving || !hasChanges}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
```

---

## Tips & Best Practices

### Loading States
- Use `SkeletonTable` for tables to maintain layout
- Use `fullScreen` spinner for page-level operations
- Always show loading text for operations > 1 second

### Toast Notifications
- Use `toastSuccess` for successful operations
- Use `toastError` for failures (with description when helpful)
- Use `toastPromise` for async operations
- Don't show toast for trivial actions (e.g., clicking buttons)

### Confirmations
- Always confirm destructive actions (delete, deactivate)
- Require reason for audit-critical operations
- Use `itemCount` for bulk operations
- Use appropriate variant (danger for deletes, warning for changes)

### Unsaved Changes
- Track changes on edit forms
- Clear warning after successful save
- Provide quick save option in warning banner

### Keyboard Shortcuts
- Add Ctrl+S to all edit forms
- Use Escape to close modals
- Include dependencies array for hooks

### Pagination
- Default to 50 items per page
- Allow user to change page size
- Reset to page 1 when filters change
- Use `offset` and `limit` for API calls

### Debouncing
- Debounce all search inputs (300ms)
- Debounce expensive operations (API calls, calculations)
- Show "Searching..." indicator during debounce

---

**Last Updated**: 2025-10-19
