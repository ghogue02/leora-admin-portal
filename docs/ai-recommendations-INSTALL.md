# AI Recommendations - Installation & Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase project
- Anthropic API account

## Installation Steps

### 1. Install Dependencies

```bash
cd web
npm install @anthropic-ai/sdk
```

### 2. Configure Environment

Add to `.env.local`:

```env
# Anthropic API for AI recommendations
ANTHROPIC_API_KEY=sk-ant-api03-... # Get from https://console.anthropic.com/
```

**Get Your API Key:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into `.env.local`

### 3. Database Migration

Run the SQL migration to create the feedback tracking table:

**Option A: Supabase Dashboard**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `docs/ai-recommendations-migration.sql`
4. Paste and execute

**Option B: Supabase CLI**
```bash
supabase db push --include-all
```

**Verify Migration:**
```sql
-- Check if table exists
SELECT * FROM recommendation_feedback LIMIT 1;
```

### 4. Verify Installation

Run the test suite:

```bash
npm test src/lib/__tests__/ai-recommendations.test.ts
```

All tests should pass ✅

### 5. Test API Endpoint

Create a test script `scripts/test-recommendations.ts`:

```typescript
async function testRecommendations() {
  const response = await fetch('http://localhost:3000/api/recommendations/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: 'your-test-customer-id',
      limit: 3,
      minConfidence: 0.6,
    }),
  });

  const data = await response.json();
  console.log('Recommendations:', JSON.stringify(data, null, 2));
}

testRecommendations();
```

Run:
```bash
npx tsx scripts/test-recommendations.ts
```

Expected output:
```json
{
  "recommendations": [
    {
      "productId": "uuid-...",
      "reason": "AI-generated explanation...",
      "confidence": 0.85,
      "product": { ... }
    }
  ],
  "cached": false
}
```

## Integration

### Quick Start

Add to any page:

```tsx
import { ProductRecommendations } from '@/components/ai/ProductRecommendations';

<ProductRecommendations
  customerId="customer-uuid"
  limit={5}
  minConfidence={0.6}
  onAddToOrder={(productId) => console.log('Add:', productId)}
/>
```

### Full Integration Examples

See `docs/ai-recommendations-integration-guide.md` for complete examples.

## Verification Checklist

- [ ] Dependencies installed (`@anthropic-ai/sdk`)
- [ ] Environment variable `ANTHROPIC_API_KEY` configured
- [ ] Database migration executed successfully
- [ ] Unit tests passing
- [ ] API endpoint returns recommendations
- [ ] UI component renders without errors
- [ ] Feedback tracking works

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY is not configured"

**Solution:**
1. Check `.env.local` file exists
2. Verify variable name is correct: `ANTHROPIC_API_KEY`
3. Restart dev server: `npm run dev`
4. Check API key is valid in Anthropic dashboard

### Issue: "Table 'recommendation_feedback' does not exist"

**Solution:**
1. Run migration: `docs/ai-recommendations-migration.sql`
2. Verify in Supabase dashboard: Table Editor
3. Check permissions (RLS policies if enabled)

### Issue: "Failed to fetch recommendations"

**Possible causes:**
1. Invalid customer ID
2. No products in catalog
3. Anthropic API rate limit hit
4. Network connectivity issues

**Debug:**
```bash
# Check API logs
tail -f .next/trace

# Test Claude API directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

### Issue: Component not rendering

**Solution:**
1. Check imports are correct
2. Verify UI component library installed
3. Check browser console for errors
4. Ensure shadcn/ui components available

## Performance Optimization

### 1. Configure Caching

Adjust cache TTL in `/app/api/recommendations/products/route.ts`:

```typescript
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (default)
// Or increase for less frequent updates:
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes
```

### 2. Optimize Context Size

Limit historical data in `/lib/recommendation-context.ts`:

```typescript
// Reduce number of orders analyzed
orderLimit: 5,  // default is 10

// Reduce sample history
sampleLimit: 10, // default is 20
```

### 3. Batch Recommendations

For multiple customers:

```typescript
const recommendations = await Promise.all(
  customerIds.map(id =>
    fetch('/api/recommendations/products', {
      method: 'POST',
      body: JSON.stringify({ customerId: id })
    })
  )
);
```

## Monitoring

### Enable Logging

Add to `/lib/ai-recommendations.ts`:

```typescript
const DEBUG = process.env.DEBUG_AI_RECOMMENDATIONS === 'true';

if (DEBUG) {
  console.log('Context:', context);
  console.log('Claude Response:', response);
}
```

Set in `.env.local`:
```env
DEBUG_AI_RECOMMENDATIONS=true
```

### Track Metrics

Create monitoring dashboard:

```typescript
// Get recommendation stats
const stats = await fetch('/api/recommendations/feedback');
const { analytics } = await stats.json();

console.log(`Acceptance Rate: ${analytics.acceptanceRate}%`);
console.log(`Avg Confidence: ${analytics.averageConfidence}`);
```

## Cost Management

### Estimate API Costs

Claude API pricing (as of Jan 2025):
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Average recommendation request: ~2,000 input tokens, ~500 output tokens
- Estimated cost per recommendation: $0.01-0.02

**With caching:**
- 15-minute cache = ~4 requests/hour max per customer
- ~$0.50-1.00 per customer per day (heavy usage)
- Cache hit rate of 80% reduces costs by 5x

### Set Budget Alerts

In Anthropic console:
1. Go to Settings → Billing
2. Set monthly budget limit
3. Configure alert threshold (e.g., 80%)

## Production Checklist

Before deploying to production:

- [ ] API key stored securely (not in version control)
- [ ] Rate limiting implemented
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Database indexes created (see migration file)
- [ ] Cache strategy tested under load
- [ ] Backup strategy for feedback data
- [ ] Analytics dashboard configured
- [ ] User acceptance testing completed
- [ ] Performance benchmarks met (<2s response time)
- [ ] Budget alerts configured

## Next Steps

1. Review integration guide: `docs/ai-recommendations-integration-guide.md`
2. Read full documentation: `docs/ai-recommendations-README.md`
3. Integrate into your pages
4. Monitor feedback and analytics
5. Iterate based on user acceptance rates

## Support

- **Anthropic Docs:** https://docs.anthropic.com/
- **API Status:** https://status.anthropic.com/
- **Rate Limits:** https://docs.anthropic.com/en/api/rate-limits
- **Pricing:** https://www.anthropic.com/pricing

## Useful Commands

```bash
# Install dependencies
npm install @anthropic-ai/sdk

# Run tests
npm test src/lib/__tests__/ai-recommendations.test.ts

# Start dev server
npm run dev

# Build for production
npm run build

# Check TypeScript
npm run typecheck

# Clear recommendation cache
curl -X DELETE http://localhost:3000/api/recommendations/products
```

---

**Installation complete!** 🎉

You now have AI-powered product recommendations using Claude's tool calling API.
