# Activities Integration Templates

Quick-start templates for integrating LogActivityButton into various pages.

## Template 1: Order Detail Page Integration

**File:** `/web/src/app/portal/orders/[orderId]/page.tsx`

Add this import at the top:
```tsx
import LogActivityButton from "@/components/shared/LogActivityButton";
```

Add the button in the header section (around line 137, after CancelOrderButton):
```tsx
{order.customer && (
  <LogActivityButton
    customerId={order.customer.id}
    orderId={order.id}
    contextType="order"
    contextLabel={`Order #${order.id.slice(0, 8)}`}
    initialSubject={`Order Follow-up - #${order.id.slice(0, 8)}`}
    variant="secondary"
    size="md"
    label="Log Activity"
  />
)}
```

**Full header section with integration:**
```tsx
<header className="flex flex-col gap-2">
  <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Order</p>
  <h1 className="text-3xl font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
  <p className="text-sm text-gray-600">
    Status: <span className="font-semibold text-gray-900">{order.status}</span>
  </p>
  <div className="text-xs text-gray-500">
    <p>Ordered {order.orderedAt ? new Date(order.orderedAt).toLocaleString() : "—"}</p>
    <p>Fulfilled {order.fulfilledAt ? new Date(order.fulfilledAt).toLocaleString() : "—"}</p>
  </div>
  {order.customer ? (
    <p className="text-sm text-gray-600">
      Customer: <span className="font-semibold text-gray-900">{order.customer.name}</span>
    </p>
  ) : null}
  <div className="flex gap-3">
    <Link
      href="/portal/orders"
      className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
    >
      Back to orders
    </Link>
    <Link
      href="/portal/invoices"
      className="inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-semibold text-gray-700 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
    >
      View invoices
    </Link>
    {order.customer && (
      <LogActivityButton
        customerId={order.customer.id}
        orderId={order.id}
        contextType="order"
        contextLabel={`Order #${order.id.slice(0, 8)}`}
        initialSubject={`Order Follow-up - #${order.id.slice(0, 8)}`}
        variant="secondary"
        size="md"
        label="Log Activity"
      />
    )}
  </div>
  <CancelOrderButton orderId={order.id} status={order.status} />
</header>
```

---

## Template 2: Sample List Page Integration

**File:** `/web/src/app/sales/samples/page.tsx`

Add import:
```tsx
import LogActivityButton from "@/components/shared/LogActivityButton";
```

Add to each sample row in the table:
```tsx
<td className="px-4 py-3">
  <LogActivityButton
    customerId={sample.customerId}
    sampleId={sample.id}
    activityTypeCode="TASTING_APPOINTMENT"
    contextType="sample"
    contextLabel={sample.productName}
    initialSubject={`Sample Follow-up - ${sample.productName}`}
    variant="icon"
    size="sm"
    label="Log"
  />
</td>
```

**Example sample table with button:**
```tsx
<table className="min-w-full divide-y divide-slate-200">
  <thead className="bg-slate-50">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
        Customer
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
        Product
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
        Sent Date
      </th>
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
        Status
      </th>
      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
        Actions
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-200">
    {samples.map((sample) => (
      <tr key={sample.id}>
        <td className="px-4 py-3">
          <Link href={`/sales/customers/${sample.customerId}`} className="font-medium text-blue-600 hover:underline">
            {sample.customerName}
          </Link>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900">{sample.productName}</p>
          <p className="text-xs text-gray-500">{sample.skuCode}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {sample.sentAt ? new Date(sample.sentAt).toLocaleDateString() : "—"}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
            sample.converted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {sample.converted ? 'Converted' : 'Pending'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <LogActivityButton
            customerId={sample.customerId}
            sampleId={sample.id}
            activityTypeCode="TASTING_APPOINTMENT"
            contextType="sample"
            contextLabel={sample.productName}
            initialSubject={`Sample Follow-up - ${sample.productName}`}
            variant="icon"
            size="sm"
            label="Log"
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Template 3: CARLA Weekly View Integration

**File:** `/web/src/app/sales/calendar/page.tsx` or `/web/src/app/sales/call-plan/page.tsx`

Add import:
```tsx
import LogActivityButton from "@/components/shared/LogActivityButton";
```

Add quick-log section at the top of the page:
```tsx
<section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-semibold text-gray-900">Quick Log</h3>
      <p className="text-xs text-gray-500">Log activities from today's calls</p>
    </div>
    <LogActivityButton
      contextType="carla"
      contextLabel="CARLA Quick Log"
      variant="primary"
      size="sm"
      label="Log Activity"
    />
  </div>
</section>
```

**Or add to each customer in the weekly schedule:**
```tsx
{weeklySchedule.map((day) => (
  <div key={day.date} className="rounded-lg border border-slate-200 bg-white p-4">
    <h3 className="text-lg font-semibold text-gray-900">
      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
    </h3>
    <div className="mt-4 space-y-3">
      {day.customers.map((customer) => (
        <div key={customer.id} className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <Link href={`/sales/customers/${customer.id}`} className="font-medium text-blue-600 hover:underline">
              {customer.name}
            </Link>
            <p className="text-xs text-gray-500">{customer.address}</p>
            <p className="text-xs text-gray-500">Last visit: {customer.lastVisit}</p>
          </div>
          <LogActivityButton
            customerId={customer.id}
            activityTypeCode="IN_PERSON_VISIT"
            contextType="carla"
            contextLabel={customer.name}
            initialSubject={`Visit - ${customer.name}`}
            variant="icon"
            size="sm"
            label="Log Visit"
          />
        </div>
      ))}
    </div>
  </div>
))}
```

---

## Template 4: Sample Detail Page

**File:** `/web/src/app/sales/samples/[sampleId]/page.tsx`

```tsx
import LogActivityButton from "@/components/shared/LogActivityButton";

export default function SampleDetailPage({ sample }) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Sample</p>
        <h1 className="text-3xl font-semibold text-gray-900">{sample.product.name}</h1>
        <p className="text-sm text-gray-600">
          Sent to <Link href={`/sales/customers/${sample.customerId}`} className="font-semibold text-blue-600 hover:underline">
            {sample.customer.name}
          </Link>
        </p>

        <div className="flex gap-3">
          <Link
            href="/sales/samples"
            className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400"
          >
            Back to Samples
          </Link>

          <LogActivityButton
            customerId={sample.customerId}
            sampleId={sample.id}
            activityTypeCode="TASTING_APPOINTMENT"
            contextType="sample"
            contextLabel={sample.product.name}
            initialSubject={`Tasting - ${sample.product.name}`}
            variant="primary"
            size="md"
            label="Log Tasting"
          />
        </div>
      </header>

      {/* Sample details sections */}
    </main>
  );
}
```

---

## Template 5: Customer List Page (Inline Quick Log)

**File:** `/web/src/app/sales/customers/page.tsx`

Add to the customer table actions column:
```tsx
<td className="px-4 py-3 text-right">
  <div className="flex items-center justify-end gap-2">
    <Link
      href={`/sales/customers/${customer.id}`}
      className="text-sm font-medium text-blue-600 hover:underline"
    >
      View
    </Link>
    <LogActivityButton
      customerId={customer.id}
      contextType="customer"
      contextLabel={customer.name}
      variant="icon"
      size="sm"
      label="Log"
    />
  </div>
</td>
```

---

## Template 6: Mobile-Optimized Button (for mobile views)

For mobile apps or responsive mobile views:
```tsx
<LogActivityButton
  customerId={customer.id}
  contextType="customer"
  contextLabel={customer.name}
  variant="primary"
  size="lg"
  label="Quick Log Activity"
  onSuccess={() => {
    // Show mobile toast
    alert('Activity logged successfully!');
  }}
/>
```

---

## Template 7: Conditional Activity Type

Pre-select activity type based on context:
```tsx
// For in-person visits
<LogActivityButton
  customerId={customer.id}
  activityTypeCode="IN_PERSON_VISIT"
  contextType="customer"
  contextLabel={customer.name}
  initialSubject={`In-Person Visit - ${customer.name}`}
  variant="secondary"
  size="md"
  label="Log Visit"
/>

// For phone calls
<LogActivityButton
  customerId={customer.id}
  activityTypeCode="PHONE_CALL"
  contextType="customer"
  contextLabel={customer.name}
  initialSubject={`Phone Call - ${customer.name}`}
  variant="secondary"
  size="md"
  label="Log Call"
/>

// For tastings
<LogActivityButton
  customerId={customer.id}
  sampleId={sample?.id}
  activityTypeCode="TASTING_APPOINTMENT"
  contextType="sample"
  contextLabel={sample?.productName || customer.name}
  initialSubject={`Tasting - ${sample?.productName || 'Multiple Products'}`}
  variant="secondary"
  size="md"
  label="Log Tasting"
/>
```

---

## Template 8: With Refresh Callback

To refresh data after logging activity:
```tsx
'use client';

import { useState } from 'react';
import LogActivityButton from "@/components/shared/LogActivityButton";

export default function CustomerActivitiesSection({ customerId, customerName }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleActivityLogged = () => {
    // Refresh the activities list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Activities</h2>
        <LogActivityButton
          customerId={customerId}
          contextType="customer"
          contextLabel={customerName}
          variant="primary"
          size="sm"
          label="Log Activity"
          onSuccess={handleActivityLogged}
        />
      </div>

      {/* Activities list that re-renders when refreshKey changes */}
      <ActivitiesList key={refreshKey} customerId={customerId} />
    </section>
  );
}
```

---

## Template 9: Bulk Activity Logging (Future Enhancement)

Template for logging activities for multiple customers:
```tsx
// Not yet implemented - template for future
const selectedCustomers = ['customer-1', 'customer-2', 'customer-3'];

<button
  onClick={() => {
    // Open modal for each customer
    selectedCustomers.forEach(customerId => {
      // Future: Implement bulk logging UI
    });
  }}
  className="..."
>
  Log Activity for {selectedCustomers.length} Customers
</button>
```

---

## Implementation Checklist

When adding LogActivityButton to a new page:

- [ ] Import LogActivityButton component
- [ ] Determine the context type (customer, order, sample, carla)
- [ ] Get the customer ID (required)
- [ ] Get optional IDs (orderId, sampleId)
- [ ] Choose appropriate variant (primary, secondary, icon)
- [ ] Choose appropriate size (sm, md, lg)
- [ ] Set context label for user clarity
- [ ] Add initialSubject if applicable
- [ ] Add onSuccess callback if data refresh needed
- [ ] Test on desktop and mobile
- [ ] Test voice-to-text functionality
- [ ] Verify activity appears in timeline

---

## Common Props Reference

```tsx
type LogActivityButtonProps = {
  // Required
  customerId?: string;          // Customer ID (auto-detected in some contexts)

  // Optional - Context
  orderId?: string;              // Link to order
  sampleId?: string;             // Link to sample
  activityTypeCode?: string;     // Pre-select activity type
  initialSubject?: string;       // Pre-fill subject
  contextType?: 'customer' | 'order' | 'sample' | 'carla';
  contextLabel?: string;         // Display label for context

  // Optional - Styling
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  label?: string;                // Button label (default: "Log Activity")

  // Optional - Behavior
  onSuccess?: () => void;        // Callback after successful log
};
```

---

## Tips and Best Practices

### 1. Choose the Right Variant
- **primary**: Main call-to-action, standalone buttons
- **secondary**: Supporting actions, multiple buttons in a group
- **icon**: Space-constrained areas, tables, mobile views

### 2. Choose the Right Size
- **sm**: Tables, lists, mobile views
- **md**: Standard buttons in headers, forms
- **lg**: Mobile apps, touch-optimized interfaces

### 3. Set Meaningful Context Labels
Good: "Order #12345", "Sample: Cabernet Sauvignon", "Acme Wine Shop"
Bad: "Customer", "Order", "Sample"

### 4. Pre-populate When Possible
If you know the activity type, pre-select it:
- Visit pages → IN_PERSON_VISIT
- After calls → PHONE_CALL
- Sample pages → TASTING_APPOINTMENT

### 5. Use Callbacks for Data Refresh
Always add onSuccess callback if the page shows activities or needs refresh.

### 6. Test Voice Input
Test on:
- Chrome desktop (best support)
- Safari iOS (mobile)
- Different accents/languages

---

## Need Help?

See full documentation:
- `/docs/ACTIVITIES_INTEGRATION.md` - Complete integration guide
- `/docs/PHASE2_ACTIVITIES_SUMMARY.md` - Implementation summary
- `/web/src/components/shared/LogActivityModal.tsx` - Component source
- `/web/src/components/shared/LogActivityButton.tsx` - Button source
