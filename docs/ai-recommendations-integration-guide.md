# AI Recommendations Integration Guide

This guide shows how to integrate the AI-powered product recommendations into your pages.

## Overview

The AI recommendation system uses Claude's tool calling API to generate intelligent, personalized product suggestions based on:
- Customer order history
- Sample usage and feedback
- Customer preferences and notes
- Occasion/context
- Price preferences
- Product categories

## Component Usage

### Basic Usage

```tsx
import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

// In your page component
<ProductRecommendations
  customerId="customer-uuid"
  limit={5}
  minConfidence={0.6}
  showAddToOrder={true}
  onAddToOrder={(productId) => {
    // Handle adding product to order
    console.log('Adding product:', productId);
  }}
/>
```

### With Occasion Context

```tsx
<ProductRecommendations
  customerId="customer-uuid"
  occasion="wine pairing for new menu"
  limit={5}
  minConfidence={0.7}
  onAddToOrder={handleAddToOrder}
/>
```

## Integration Examples

### 1. Customer Detail Page

**File:** `/src/app/sales/customers/[customerId]/page.tsx`

Replace the existing static ProductRecommendations component:

```tsx
// Before (static recommendations)
import ProductRecommendations from "./sections/ProductRecommendations";

// After (AI-powered recommendations)
import { ProductRecommendations as AIRecommendations } from '@/components/ai/ProductRecommendations';

// In the component JSX, replace:
<ProductRecommendations recommendations={data.recommendations} />

// With:
<AIRecommendations
  customerId={customerId}
  limit={10}
  minConfidence={0.6}
  showAddToOrder={false}
/>
```

**Note:** The AI component fetches recommendations directly from the API, so you don't need to pass them as props.

### 2. Order Creation Page

**File:** `/src/app/admin/orders/new/page.tsx`

Add AI recommendations to help fill orders:

```tsx
'use client';

import { useState } from 'react';
import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

export default function NewOrderPage() {
  const [customerId, setCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([]);

  const handleAddRecommendedProduct = async (productId: string) => {
    // Fetch product details
    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();

    // Add to line items
    setLineItems(prev => [...prev, {
      productId,
      quantity: 1,
      unitPrice: product.price,
      isSample: false,
    }]);
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left column - Order form */}
      <div className="col-span-2">
        {/* Existing order form */}
      </div>

      {/* Right column - AI Recommendations */}
      <div className="col-span-1">
        {customerId && (
          <ProductRecommendations
            customerId={customerId}
            occasion="restock order"
            limit={5}
            minConfidence={0.7}
            showAddToOrder={true}
            onAddToOrder={handleAddRecommendedProduct}
          />
        )}
      </div>
    </div>
  );
}
```

### 3. Sample Assignment Page

**File:** `/src/app/sales/samples/quick-assign/page.tsx`

Suggest samples to pull for customers:

```tsx
'use client';

import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

export default function QuickAssignSamplesPage() {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [samples, setSamples] = useState([]);

  const handleAddSample = (productId: string) => {
    setSamples(prev => [...prev, {
      productId,
      customerId: selectedCustomer,
      quantity: 1,
      purpose: 'discovery',
    }]);
  };

  return (
    <div className="space-y-6">
      {/* Customer selector */}
      <div>
        <label>Select Customer</label>
        <select onChange={e => setSelectedCustomer(e.target.value)}>
          {/* Customer options */}
        </select>
      </div>

      {/* AI Recommendations for samples */}
      {selectedCustomer && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2>Suggested Samples</h2>
            <ProductRecommendations
              customerId={selectedCustomer}
              occasion="sample discovery"
              limit={8}
              minConfidence={0.65}
              showAddToOrder={true}
              onAddToOrder={handleAddSample}
            />
          </div>

          <div>
            <h2>Selected Samples</h2>
            {/* Display selected samples */}
          </div>
        </div>
      )}
    </div>
  );
}
```

## API Usage

### Fetch Recommendations Programmatically

If you need to fetch recommendations without using the component:

```tsx
const fetchRecommendations = async (customerId: string) => {
  const response = await fetch('/api/recommendations/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      occasion: 'seasonal selection',
      limit: 10,
      minConfidence: 0.7,
      excludeRecent: true, // Don't recommend recently ordered products
    }),
  });

  const data = await response.json();
  return data.recommendations;
};
```

### Track Feedback

Track when users interact with recommendations:

```tsx
const trackRecommendationFeedback = async (
  customerId: string,
  productId: string,
  reason: string,
  confidence: number,
  action: 'accepted' | 'rejected' | 'deferred',
  orderId?: string
) => {
  await fetch('/api/recommendations/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId,
      productId,
      recommendationReason: reason,
      confidence,
      action,
      orderId,
    }),
  });
};
```

## Configuration

### Environment Variables

Required in `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-... # Get from https://console.anthropic.com/
```

### Database Setup

Run the migration to create the feedback table:

```sql
-- See docs/ai-recommendations-migration.sql
-- Run via Supabase dashboard or CLI
```

## Customization

### Adjust Confidence Threshold

Higher confidence = fewer but more accurate recommendations:

```tsx
<ProductRecommendations
  minConfidence={0.8} // Default is 0.6
/>
```

### Change Recommendation Limit

```tsx
<ProductRecommendations
  limit={10} // Default is 5
/>
```

### Customize Context

Provide specific context for better recommendations:

```tsx
<ProductRecommendations
  occasion="wine pairing for Italian restaurant"
  // or
  occasion="seasonal fall selection"
  // or
  occasion="new menu launch"
/>
```

## Performance

- **Caching:** Recommendations are cached for 15 minutes per customer
- **Response Time:** Typically 1-3 seconds for Claude API response
- **Rate Limits:** Subject to Anthropic API rate limits

### Clear Cache

```tsx
// Force refresh recommendations
await fetch('/api/recommendations/products', {
  method: 'DELETE',
});
```

## Analytics

### View Recommendation Performance

```tsx
const getAnalytics = async (customerId?: string) => {
  const url = customerId
    ? `/api/recommendations/feedback?customerId=${customerId}`
    : '/api/recommendations/feedback';

  const response = await fetch(url);
  const data = await response.json();

  console.log('Analytics:', data.analytics);
  // {
  //   total: 100,
  //   accepted: 45,
  //   rejected: 30,
  //   deferred: 25,
  //   acceptanceRate: 45.00,
  //   averageConfidence: 0.78
  // }
};
```

## Error Handling

The component handles errors gracefully:

- **Missing API Key:** Shows error message
- **API Failure:** Shows error alert
- **No Recommendations:** Shows helpful empty state
- **Network Issues:** Displays error with retry button

## Testing

See `src/lib/__tests__/ai-recommendations.test.ts` for comprehensive tests including:
- Tool calling format validation
- Confidence filtering
- Product ID validation
- Error handling
- Mock Claude API responses

## Support

For issues or questions:
- Check Claude API status: https://status.anthropic.com/
- Review API docs: https://docs.anthropic.com/
- Check logs in `/api/recommendations/products` endpoint
