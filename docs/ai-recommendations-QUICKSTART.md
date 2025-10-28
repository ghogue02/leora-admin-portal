# AI Recommendations - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install (30 seconds)

```bash
cd web
npm install @anthropic-ai/sdk
```

### Step 2: Configure (1 minute)

Add to `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-api... # Get from https://console.anthropic.com/
```

### Step 3: Database (2 minutes)

Run this SQL in Supabase dashboard:
```sql
-- Copy from docs/ai-recommendations-migration.sql
CREATE TABLE recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_reason TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('accepted', 'rejected', 'deferred')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendation_feedback_customer ON recommendation_feedback(customer_id);
CREATE INDEX idx_recommendation_feedback_product ON recommendation_feedback(product_id);
```

### Step 4: Use It! (1 minute)

Add to any page:

```tsx
import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

export default function MyPage() {
  return (
    <ProductRecommendations
      customerId="your-customer-id"
      limit={5}
      minConfidence={0.6}
      onAddToOrder={(productId) => {
        // Handle add to order
        console.log('Adding:', productId);
      }}
    />
  );
}
```

### Step 5: Verify (30 seconds)

```bash
npm run dev
# Navigate to your page
# Should see AI recommendations loading
```

---

## 📖 Common Use Cases

### Use Case 1: Customer Detail Page

```tsx
// Show recommendations for this customer
<ProductRecommendations
  customerId={params.customerId}
  limit={10}
  minConfidence={0.6}
/>
```

### Use Case 2: Order Creation Helper

```tsx
// Help fill new orders with smart suggestions
<ProductRecommendations
  customerId={formData.customerId}
  occasion="restock order"
  limit={5}
  showAddToOrder={true}
  onAddToOrder={(productId) => addToOrder(productId)}
/>
```

### Use Case 3: Sample Assignment

```tsx
// Suggest samples to pull for a customer
<ProductRecommendations
  customerId={selectedCustomer}
  occasion="sample discovery"
  limit={8}
  minConfidence={0.65}
  onAddToOrder={(productId) => addToSampleBatch(productId)}
/>
```

---

## 🎛️ Configuration Options

### Component Props

```tsx
<ProductRecommendations
  customerId="uuid"           // REQUIRED: Customer ID
  occasion="wine pairing"     // OPTIONAL: Context for recommendations
  limit={5}                   // OPTIONAL: Max recommendations (default: 5)
  minConfidence={0.6}         // OPTIONAL: Min confidence (0-1, default: 0.6)
  showAddToOrder={true}       // OPTIONAL: Show "Add to Order" button (default: true)
  onAddToOrder={(id) => {}}   // OPTIONAL: Callback when product added
/>
```

### API Options

```typescript
// POST /api/recommendations/products
{
  customerId: "uuid",
  occasion: "seasonal selection",  // optional
  limit: 5,                         // optional, default 5
  minConfidence: 0.6,               // optional, default 0.6
  excludeRecent: true               // optional, default true
}
```

---

## 🔍 API Quick Reference

### Get Recommendations

```typescript
const response = await fetch('/api/recommendations/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'uuid',
    limit: 5,
  }),
});

const { recommendations } = await response.json();
// [{productId, reason, confidence, product}, ...]
```

### Track Feedback

```typescript
await fetch('/api/recommendations/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'uuid',
    productId: 'uuid',
    recommendationReason: 'AI reason',
    confidence: 0.85,
    action: 'accepted', // or 'rejected', 'deferred'
    orderId: 'uuid',    // optional
  }),
});
```

### Get Analytics

```typescript
const response = await fetch('/api/recommendations/feedback');
const { analytics } = await response.json();
// {
//   total: 100,
//   accepted: 45,
//   rejected: 30,
//   deferred: 25,
//   acceptanceRate: 45.0,
//   averageConfidence: 0.78
// }
```

---

## 🐛 Troubleshooting

### Problem: No recommendations shown

**Check:**
1. Is `ANTHROPIC_API_KEY` set in `.env.local`?
2. Did you restart the dev server after adding the key?
3. Does the customer have order/sample history?
4. Are there products in the catalog?

**Quick fix:**
```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Restart server
npm run dev

# Test API directly
curl -X POST http://localhost:3000/api/recommendations/products \
  -H "Content-Type: application/json" \
  -d '{"customerId":"test-id","limit":3}'
```

### Problem: "Table does not exist" error

**Fix:**
Run the migration SQL in Supabase dashboard (see Step 3 above)

### Problem: Slow response times

**Fix:**
- Cache is working after first request (15-min TTL)
- First request: 1-3 seconds
- Cached requests: <100ms

---

## 📊 Key Metrics

Monitor these in your analytics:

```sql
-- Acceptance rate
SELECT
  COUNT(*) FILTER (WHERE action = 'accepted') * 100.0 / COUNT(*) as acceptance_rate
FROM recommendation_feedback;

-- Average confidence of accepted recommendations
SELECT AVG(confidence_score)
FROM recommendation_feedback
WHERE action = 'accepted';

-- Top recommended products
SELECT product_id, COUNT(*) as count
FROM recommendation_feedback
GROUP BY product_id
ORDER BY count DESC
LIMIT 10;
```

---

## 💡 Pro Tips

### Tip 1: Use Occasions for Better Results

```tsx
// Generic
<ProductRecommendations customerId={id} />

// Better - provides context
<ProductRecommendations
  customerId={id}
  occasion="wine pairing for Italian restaurant"
/>
```

### Tip 2: Adjust Confidence for Use Case

```tsx
// Critical recommendations (order suggestions)
minConfidence={0.8}  // Only high-confidence

// Exploratory (sample assignments)
minConfidence={0.5}  // Allow more variety
```

### Tip 3: Handle Add to Order

```tsx
const handleAdd = async (productId: string) => {
  // 1. Fetch product details
  const product = await fetchProduct(productId);

  // 2. Add to order/cart
  addToCart(product);

  // 3. Show success message
  toast.success(`Added ${product.name} to order`);

  // Feedback is tracked automatically by the component!
};

<ProductRecommendations onAddToOrder={handleAdd} />
```

---

## 🎯 What You Get

✅ **AI-powered recommendations** using Claude 3.5 Sonnet
✅ **Structured product IDs** via tool calling (no text parsing)
✅ **Context-aware** based on customer history and preferences
✅ **Confidence scoring** for each recommendation
✅ **Clear reasoning** for why each product was suggested
✅ **Beautiful UI** with loading states and error handling
✅ **Feedback tracking** for continuous improvement
✅ **15-minute caching** for optimal performance
✅ **Comprehensive tests** with mock API responses
✅ **Full documentation** with examples

---

## 📚 Full Documentation

- **This file** - Quick start
- **INSTALL.md** - Detailed installation
- **README.md** - Architecture and API docs
- **integration-guide.md** - Integration examples
- **SUMMARY.md** - Implementation summary

---

## 🆘 Get Help

1. Check console for errors
2. Review API logs in `.next/trace`
3. Test Claude API: https://console.anthropic.com/
4. Check API status: https://status.anthropic.com/

---

**You're all set!** 🎉

Start using AI recommendations in your pages now.

```tsx
import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

<ProductRecommendations customerId="customer-id" />
```

That's it! The component handles everything else.
