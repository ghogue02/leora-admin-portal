# Universal Search PoC Plan

## Goals
- Provide a single `/api/search` endpoint that allows the sales app to run the “universal search” Travis requested (products, customers, and orders to start).
- Reuse existing tenant-aware permissions (sales session) while keeping responses small (<25 results per entity).
- Return structured snippets so the UI can render consistent suggestions.

## Target API contract
```
GET /api/search?q=verdejo&entities=products,customers&limit=5

{
  "query": "verdejo",
  "timestamp": "2025-11-13T20:45:00Z",
  "results": {
    "products": [
      {
        "id": "sku_123",
        "label": "Cuatro Rayas Verdejo 2023",
        "subLabel": "Rueda · Frontline $14.99 · 120 available",
        "link": "/sales/catalog?sku=sku_123",
        "highlights": ["Category: White Wine", "Lifecycle: Core"],
        "score": 0.72
      }
    ],
    "customers": [],
    "orders": []
  },
  "meta": {
    "tenantId": "…",
    "entitiesRequested": ["products","customers","orders"],
    "executionMs": 42
  }
}
```

## Implementation steps
1. **Server route (`src/app/api/search/route.ts`):**
   - Guard with `withSalesSession`.
   - Parse `q`, `entities[]`, `limit`.
   - Dispatch to entity-specific search helpers (products → catalog query + `ILIKE`, customers → `customer` table, orders → `order` table).
   - Aggregate results + metadata.

2. **Helpers (`src/lib/search/products.ts`, etc.):**
   - Reuse `queryCatalog` but request only the top N fields needed for suggestions.
   - For customers/orders, include key identification data (name, account status, order number, total).

3. **UI integration (Phase 2 follow-up):**
   - Add search input to sales layout (header) hitting `/api/search` with debounce.
   - Render grouped suggestion panel; link to target pages.
   - On submit, navigate to best-match context (catalog detail, customer page).

## Performance & safeguards
- Hard limit results per entity (default 5) to keep payload lightweight.
- Use simple text filters first; expand to `tsvector` once baseline is stable.
- Log execution time + request metadata for future tuning.
