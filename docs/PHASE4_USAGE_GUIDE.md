# Phase 4 AI Features - Usage Guide

## Quick Start

This guide shows you how to integrate Phase 4 AI features into your Leora application.

## 1. Product Recommendations

### On Customer Detail Page

Add personalized recommendations to show products the customer might like:

```tsx
// /src/app/sales/customers/[customerId]/page.tsx

import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

export default function CustomerDetailPage({ params }: { params: { customerId: string } }) {
  const handleAddToCart = async (skuId: string) => {
    // Add SKU to cart or create quick order
    await fetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ skuId, quantity: 1 }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing customer details */}

      {/* AI-Powered Recommendations */}
      <ProductRecommendations
        customerId={params.customerId}
        limit={10}
        onAddToCart={handleAddToCart}
        className="mt-8"
      />
    </div>
  );
}
```

### During Order Creation

Show smart suggestions while creating an order:

```tsx
// /src/app/sales/orders/create/page.tsx

import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

export default function CreateOrderPage({ searchParams }: { searchParams: { customerId?: string } }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const cartSkuIds = cartItems.map(item => item.skuId);

  const addToCart = (skuId: string) => {
    setCartItems([...cartItems, { skuId, quantity: 1 }]);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        {/* Order form */}
        <h2>Create Order</h2>
        {/* Form fields */}
      </div>

      <div>
        <ProductRecommendations
          customerId={searchParams.customerId!}
          excludeSkuIds={cartSkuIds}
          limit={5}
          onAddToCart={addToCart}
        />
      </div>
    </div>
  );
}
```

### Product Detail Page - "Frequently Bought Together"

```tsx
// /src/app/portal/catalog/[skuId]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { ProductRecommendation } from '@/lib/ai/recommendation-engine';

export default function ProductDetailPage({ params }: { params: { skuId: string } }) {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);

  useEffect(() => {
    async function loadRecommendations() {
      const res = await fetch(
        `/api/ai/recommendations/frequently-bought-together?skuId=${params.skuId}&limit=5`
      );
      const data = await res.json();
      setRecommendations(data.recommendations);
    }
    loadRecommendations();
  }, [params.skuId]);

  return (
    <div>
      {/* Product details */}

      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Frequently Bought Together</h3>
        <div className="grid grid-cols-3 gap-4">
          {recommendations.map(rec => (
            <ProductCard
              key={rec.skuId}
              product={rec}
              badge={`${rec.score}% of customers bought this`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
```

## 2. Customer Insights & Predictions

### On Customer Detail Page

Display AI-powered insights about customer behavior:

```tsx
// /src/app/sales/customers/[customerId]/page.tsx

import { CustomerInsights } from '@/components/ai/CustomerInsights';

export default function CustomerDetailPage({ params }: { params: { customerId: string } }) {
  return (
    <div className="space-y-6">
      {/* Customer header */}

      {/* AI Insights - Shows predictions, metrics, and recommendations */}
      <CustomerInsights
        customerId={params.customerId}
        className="mt-6"
      />

      {/* Other customer details */}
    </div>
  );
}
```

### On Sales Dashboard

Show customers who need attention:

```tsx
// /src/app/sales/dashboard/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { OrderPrediction } from '@/lib/ai/predictive-analytics';

export default function SalesDashboard() {
  const [upcomingOrders, setUpcomingOrders] = useState<Array<{
    customer: any;
    prediction: OrderPrediction;
  }>>([]);

  useEffect(() => {
    async function loadPredictions() {
      // Get all customers
      const customersRes = await fetch('/api/customers?limit=100');
      const customers = await customersRes.json();

      // Get predictions for each
      const predictions = await Promise.all(
        customers.map(async (customer: any) => {
          const predRes = await fetch(
            `/api/ai/predictions/next-order?customerId=${customer.id}`
          );
          const prediction = await predRes.json();
          return { customer, prediction };
        })
      );

      // Filter to next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcoming = predictions.filter(({ prediction }) => {
        if (!prediction.nextExpectedOrderDate) return false;
        const date = new Date(prediction.nextExpectedOrderDate);
        return date <= nextWeek && prediction.confidenceLevel !== 'low';
      });

      setUpcomingOrders(upcoming);
    }

    loadPredictions();
  }, []);

  return (
    <div>
      <h2>Customers Expected to Order This Week</h2>
      <div className="space-y-2">
        {upcomingOrders.map(({ customer, prediction }) => (
          <div key={customer.id} className="p-4 border rounded">
            <h3>{customer.name}</h3>
            <p>Expected: {new Date(prediction.nextExpectedOrderDate!).toLocaleDateString()}</p>
            <p>Confidence: {prediction.confidenceScore}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### API Usage - Direct Calls

If you need to fetch insights programmatically:

```typescript
// Get customer insights
async function getCustomerInsights(customerId: string) {
  const response = await fetch(`/api/ai/insights/customer?customerId=${customerId}`);
  const insights = await response.json();

  return {
    lifetimeValue: insights.lifetimeValue,
    averageOrderValue: insights.averageOrderValue,
    orderFrequency: insights.orderFrequency,
    churnRisk: insights.churnRisk,
    growthTrend: insights.growthTrend,
    recommendations: insights.recommendations,
  };
}

// Get next order prediction
async function predictNextOrder(customerId: string) {
  const response = await fetch(`/api/ai/predictions/next-order?customerId=${customerId}`);
  const prediction = await response.json();

  return {
    date: prediction.nextExpectedOrderDate,
    confidence: prediction.confidenceLevel,
    score: prediction.confidenceScore,
    factors: prediction.factors,
  };
}
```

## 3. LeorAI Enhancements

### Query Templates in UI

Add quick query buttons to LeorAI interface:

```tsx
// /src/app/sales/leora/page.tsx

import { QUERY_TEMPLATES, getTemplateCategories } from '@/lib/ai/leora-enhancements';

export default function LeorAIPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Customer Analysis');
  const categories = getTemplateCategories();
  const templates = QUERY_TEMPLATES.filter(t => t.category === selectedCategory);

  const executeTemplate = (prompt: string) => {
    // Send prompt to LeorAI
    // This would integrate with your existing LeorAI implementation
  };

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={selectedCategory === category ? 'bg-blue-500 text-white' : 'bg-gray-200'}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-4">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => executeTemplate(template.prompt)}
            className="p-4 border rounded hover:bg-blue-50 text-left"
          >
            <h3 className="font-semibold">{template.name}</h3>
            <p className="text-sm text-gray-600">{template.description}</p>
            <div className="flex gap-2 mt-2">
              {template.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Smart Follow-ups

Generate contextual follow-up questions:

```tsx
// In your LeorAI chat component

import { generateFollowUpQuestions } from '@/lib/ai/leora-enhancements';

function LeorAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSuggestion[]>([]);

  const handleUserMessage = async (userQuery: string) => {
    // Send to LeorAI API
    const response = await fetch('/api/sales/leora', {
      method: 'POST',
      body: JSON.stringify({ message: userQuery }),
    });

    // Generate smart follow-ups
    const suggestions = generateFollowUpQuestions({
      userQuery,
      metrics: response.metrics, // If available
    });

    setFollowUps(suggestions);
  };

  return (
    <div>
      {/* Chat messages */}

      {/* Follow-up suggestions */}
      {followUps.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Suggested follow-ups:</h4>
          <div className="flex flex-wrap gap-2">
            {followUps.map((followUp, i) => (
              <button
                key={i}
                onClick={() => handleUserMessage(followUp.text)}
                className="text-sm bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded"
              >
                {followUp.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Query Understanding

Enhance user queries with NLP:

```typescript
import { enhanceQueryUnderstanding } from '@/lib/ai/leora-enhancements';

function preprocessQuery(userQuery: string) {
  const understanding = enhanceQueryUnderstanding(userQuery);

  console.log('Intent:', understanding.intent);
  console.log('Entities:', understanding.entities);
  console.log('Timeframe:', understanding.timeframe);
  console.log('Metric:', understanding.metric);
  console.log('Suggestions:', understanding.suggestions);

  // Use this to improve query execution
  // Example: if intent is 'compare', fetch comparison data
  // Example: if timeframe is 'month', filter to current month

  return understanding;
}
```

## 4. Batch Operations

### Nightly Prediction Updates

Run batch predictions for all customers:

```typescript
// In a cron job or scheduled task

import { batchUpdatePredictions } from '@/lib/ai/predictive-analytics';

async function runNightlyPredictions() {
  const tenantId = 'your-tenant-id';

  const result = await batchUpdatePredictions(tenantId, {
    limitCustomers: 1000,
    onlyActive: true,
  });

  console.log(`Updated ${result.updated} predictions`);
  console.log(`Failed: ${result.failed}`);
}
```

## 5. Error Handling

Always handle API errors gracefully:

```typescript
async function fetchRecommendations(customerId: string) {
  try {
    const response = await fetch(`/api/ai/recommendations?customerId=${customerId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    // Show user-friendly message
    // Return empty array or cached data
    return [];
  }
}
```

## 6. Performance Optimization

### Caching Recommendations

Cache recommendations for 24 hours:

```typescript
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedRecommendations(customerId: string) {
  const cacheKey = `recommendations:${customerId}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Generate fresh recommendations
  const recommendations = await generateRecommendations({
    customerId,
    tenantId: 'your-tenant-id',
  });

  // Cache for 24 hours
  await redis.setex(cacheKey, CACHE_TTL / 1000, JSON.stringify(recommendations));

  return recommendations;
}
```

### Parallel Loading

Load insights and recommendations in parallel:

```typescript
async function loadCustomerAIData(customerId: string) {
  const [insights, recommendations] = await Promise.all([
    fetch(`/api/ai/insights/customer?customerId=${customerId}`).then(r => r.json()),
    fetch(`/api/ai/recommendations?customerId=${customerId}`).then(r => r.json()),
  ]);

  return { insights, recommendations };
}
```

## 7. Monitoring & Analytics

Track recommendation performance:

```typescript
// When user clicks on a recommendation
function trackRecommendationClick(recommendationId: string, customerId: string, skuId: string) {
  // Send to analytics
  analytics.track('Recommendation Clicked', {
    recommendationId,
    customerId,
    skuId,
    timestamp: new Date(),
  });
}

// When recommendation leads to an order
function trackRecommendationConversion(recommendationId: string, orderId: string) {
  analytics.track('Recommendation Converted', {
    recommendationId,
    orderId,
    timestamp: new Date(),
  });
}
```

## 8. A/B Testing

Test different recommendation algorithms:

```typescript
function getRecommendationVariant(customerId: string) {
  // Simple hash-based assignment
  const hash = customerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = hash % 2 === 0 ? 'A' : 'B';

  return variant;
}

async function fetchRecommendationsWithVariant(customerId: string) {
  const variant = getRecommendationVariant(customerId);

  // Variant A: Standard algorithm
  // Variant B: Experimental algorithm (could emphasize different factors)

  const recommendations = await fetch(
    `/api/ai/recommendations?customerId=${customerId}&variant=${variant}`
  );

  // Track which variant was shown
  analytics.track('Recommendation Variant Shown', {
    customerId,
    variant,
  });

  return recommendations;
}
```

## Common Patterns

### Pattern 1: Progressive Enhancement

Start with basic data, add AI when available:

```tsx
function CustomerCard({ customer }: { customer: Customer }) {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    // Load AI insights asynchronously
    fetch(`/api/ai/insights/customer?customerId=${customer.id}`)
      .then(r => r.json())
      .then(setInsights)
      .catch(console.error);
  }, [customer.id]);

  return (
    <div>
      {/* Always show basic info */}
      <h3>{customer.name}</h3>

      {/* Show AI insights when available */}
      {insights && (
        <div className="mt-2">
          <Badge variant={insights.churnRisk === 'high' ? 'destructive' : 'default'}>
            {insights.churnRisk} churn risk
          </Badge>
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Fallback Content

Show helpful content when recommendations aren't available:

```tsx
function RecommendationSection({ customerId }: { customerId: string }) {
  const { data: recommendations, error } = useQuery(['recommendations', customerId], () =>
    fetch(`/api/ai/recommendations?customerId=${customerId}`).then(r => r.json())
  );

  if (error) {
    return (
      <Card>
        <CardContent>
          <p>Unable to load recommendations at this time.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card>
        <CardContent>
          <p>No recommendations available yet.</p>
          <p className="text-sm text-muted-foreground">
            Recommendations will improve as the customer places more orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ProductRecommendations recommendations={recommendations} />;
}
```

## Best Practices

1. **Always handle errors gracefully** - Don't let AI failures break the UI
2. **Show confidence levels** - Be transparent about prediction accuracy
3. **Provide explanations** - Help users understand why something was recommended
4. **Use progressive loading** - Don't block the page on AI requests
5. **Cache aggressively** - Recommendations don't change minute-to-minute
6. **Monitor performance** - Track recommendation CTR and conversion rates
7. **A/B test** - Experiment with different algorithms
8. **Respect privacy** - Handle customer data responsibly

## Troubleshooting

### No recommendations showing up

1. Check if customer has order history (need 2+ orders)
2. Verify API endpoint is accessible
3. Check browser console for errors
4. Verify authentication is working

### Predictions seem inaccurate

1. Check order history quality (need accurate dates)
2. Ensure sufficient historical data (3+ orders for medium confidence)
3. Review seasonality factors
4. Check for data anomalies (bulk imports, etc.)

### Slow performance

1. Enable caching
2. Limit similarity calculations (already capped at 100 customers)
3. Use database indexes
4. Consider batch updates instead of real-time

---

For more information, see:
- [Phase 4 Technical Documentation](/docs/PHASE4_AI_FEATURES.md)
- [Phase 4 Summary](/docs/PHASE4_SUMMARY.md)
- [API Reference](/docs/API_REFERENCE.md)
