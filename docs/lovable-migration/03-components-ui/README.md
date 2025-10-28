# Package 3: Components & UI

Reusable UI components and custom React hooks for the Lovable migration.

## Files Included

1. **ui-components.tsx** - Collection of reusable UI components
2. **hooks.ts** - Custom React hooks for common functionality

## Components

### Button
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```
Variants: `primary`, `secondary`, `danger`, `ghost`
Sizes: `sm`, `md`, `lg`

### Card
```tsx
<Card title="Dashboard" action={<Button>Action</Button>}>
  Content goes here
</Card>
```

### Badge
```tsx
<Badge variant="success">Healthy</Badge>
<Badge variant="danger">At Risk</Badge>
```
Variants: `success`, `warning`, `danger`, `info`, `neutral`

### Input
```tsx
<Input
  label="Email"
  type="email"
  error={errors.email}
  helpText="Enter your email address"
/>
```

### Select
```tsx
<Select
  label="Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ]}
/>
```

### Table
```tsx
<Table
  data={customers}
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    {
      key: 'status',
      header: 'Status',
      render: (customer) => <Badge>{customer.status}</Badge>
    }
  ]}
  onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
/>
```

### Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  Are you sure you want to proceed?
</Modal>
```

### Alert
```tsx
<Alert variant="success" title="Success!">
  Your changes have been saved.
</Alert>
```

### LoadingSpinner
```tsx
<LoadingSpinner size="lg" />
```

## Hooks

### useFetch
```tsx
const { data, loading, error, refetch } = useFetch<Customer[]>(
  '/api/sales/customers',
  {
    autoFetch: true,
    onSuccess: (data) => console.log('Loaded:', data),
    onError: (error) => console.error('Error:', error)
  }
);
```

### useDebounce
```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);

useEffect(() => {
  // This will only run 500ms after the user stops typing
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

### useLocalStorage
```tsx
const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
```

### usePagination
```tsx
const {
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  nextPage,
  previousPage,
  goToPage,
} = usePagination({
  totalItems: 100,
  itemsPerPage: 10,
  initialPage: 1,
});
```

### useForm
```tsx
const form = useForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const errors: any = {};
    if (!values.email) errors.email = 'Required';
    if (!values.password) errors.password = 'Required';
    return errors;
  },
  onSubmit: async (values) => {
    await loginUser(values);
  },
});

<form onSubmit={form.handleSubmit}>
  <Input
    value={form.values.email}
    onChange={(e) => form.handleChange('email', e.target.value)}
    onBlur={() => form.handleBlur('email')}
    error={form.errors.email}
  />
</form>
```

### useToast
```tsx
const toast = useToast();

toast.success('Order created successfully!');
toast.error('Failed to save changes');
toast.info('Loading data...');
toast.warning('This action cannot be undone');
```

### useMediaQuery
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');
const isDesktop = useMediaQuery('(min-width: 1024px)');
```

### useClickOutside
```tsx
const ref = useClickOutside<HTMLDivElement>(() => {
  setIsMenuOpen(false);
});

<div ref={ref}>Menu content</div>
```

### useAsync
```tsx
const { execute, isPending, isSuccess, data, error } = useAsync(
  async (userId: string) => {
    return fetch(`/api/users/${userId}`).then(r => r.json());
  }
);

<Button onClick={() => execute('user-123')} disabled={isPending}>
  Load User
</Button>
```

## Setup

### 1. Install Dependencies

```bash
npm install react react-dom
```

### 2. Copy Files

Copy the component and hook files to your Lovable project:

```
src/
├── components/
│   └── ui/
│       └── ui-components.tsx
└── hooks/
    └── hooks.ts
```

### 3. Import Components

```tsx
import { Button, Card, Badge } from '@/components/ui/ui-components';
import { useFetch, useDebounce } from '@/hooks/hooks';
```

## Customization

### Tailwind Configuration

Ensure your `tailwind.config.js` includes:

```javascript
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Add custom colors here
      colors: {
        primary: {
          50: '#eff6ff',
          // ... rest of colors
        },
      },
    },
  },
};
```

### Component Styling

All components use Tailwind utility classes. Customize by:

1. **Extending variants:**
```tsx
const variantStyles = {
  primary: 'bg-purple-600 text-white hover:bg-purple-700', // Changed from blue
  // ...
};
```

2. **Adding new sizes:**
```tsx
const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl', // New size
};
```

## Usage Examples

### Dashboard with Multiple Components

```tsx
export default function Dashboard() {
  const { data, loading } = useFetch<DashboardData>('/api/sales/dashboard');
  const toast = useToast();

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="p-6 space-y-6">
      <Card title="Performance Metrics">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Revenue</p>
            <p className="text-2xl font-bold">${data.revenue}</p>
            <Badge variant="success">+12%</Badge>
          </div>
        </div>
      </Card>

      <Card title="Recent Orders">
        <Table
          data={data.orders}
          columns={[
            { key: 'id', header: 'Order ID' },
            { key: 'customer', header: 'Customer' },
            { key: 'total', header: 'Total' },
          ]}
        />
      </Card>

      <Button
        variant="primary"
        onClick={() => toast.success('Changes saved!')}
      >
        Save
      </Button>
    </div>
  );
}
```

## Testing

Components are designed to be testable:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './ui-components';

test('button triggers onClick', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalled();
});
```

## Accessibility

All components follow accessibility best practices:
- ✅ Proper ARIA labels
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Screen reader compatibility

## Next Steps

1. ✅ Copy components to your project
2. ✅ Import in page components
3. ⏭️ Customize styling to match brand
4. ⏭️ Add additional variants as needed
5. ⏭️ Create component documentation

## Support

- Original components: `/src/app/sales/_components/`
- Tailwind docs: https://tailwindcss.com
- React docs: https://react.dev
