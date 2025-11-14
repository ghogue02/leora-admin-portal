# CRM-73 Portfolio Management Implementation Plan

## 1. Purpose & Scope

Deliver the Product Portfolio Management System (CRM-73) and its child work items (CRM-74…CRM-79) so sales reps, portal users, and tenant admins can browse, filter, export, and configure rich product data. The solution must reflect Travis’ Vino Smith-inspired UX (top nav, left-side sections, persistent “New Order” button, universal search) **and** honor tenant-level field configuration in `/admin`.

This plan covers:
- Product metadata expansion and ingestion (CRM-74, CRM-51 dependencies)
- Catalog filtering/search/export parity (CRM-65, future CRM-75/76/77)
- Lifecycle tagging automation (CRM-61)
- Tenant field configuration UI/APIs (CRM-79)
- Sales/portal UI upgrades plus exports anchored to the new data layer

## 2. Objectives by Ticket
| Issue | Objective |
|-------|-----------|
| CRM-74 | Expand data model (producer, geography, ratings, certifications, etc.) + schema-driven product detail layout |
| CRM-75 *(to file)* | Server-side filtering/search service with tag-based facets and range queries |
| CRM-76 *(to file)* | Export templates (PDF/Excel/CSV) that mirror applied filters and respect field visibility |
| CRM-77 *(to file)* | Universal search that spans configured product fields and integrates with top-level layout |
| CRM-79 | Admin UI/API for tenant-specific field visibility, requirements, ordering, dropdown options, and custom fields |

## 3. Target Architecture

### 3.1 Data & Config Layer
1. **Field Definition Registry**
   - Tables: `ProductFieldDefinition` (global schema), `TenantProductFieldConfig` (visibility, required, order), `ProductFieldOption` (dropdown values), `ProductCustomField`.
   - Config cached per-tenant; invalidation on write.
   - All downstream APIs query this service to know which fields arise in responses/forms.

2. **Product Metadata Normalization**
   - Tables for structured entities (`ProductProducer`, `ProductImporter`, `ProductRegion`, `ProductAppellation`, `ProductCertification`, `ProductRating`, `ProductTag`, `ProductLifecycleSnapshot`).
   - `Product` retains base identifiers but references normalized rows (FKs or join tables).
   - JSON columns (tastingNotes, wineDetails) stay for AI enrichment but migrate into typed tables where possible.

3. **Tag & Lifecycle System**
   - Reuse TagDefinition mechanics: create `ProductTagDefinition` / `ProductTag`.
   - Lifecycle automation job writes to `ProductLifecycleSnapshot` with enums (CORE, NEW, PROMO, CLOSEOUT) plus effective dates.

### 3.2 API Layer
1. **Catalog Search Endpoint**
   - `/api/sales/catalog` accepts query params (`q`, `facet[]`, `range[field]`, `sort`, pagination).
   - Build Postgres search via `tsvector` + GIN on product text, plus filtered joins on tag tables.
   - Response includes facet buckets + field metadata so the UI renders filters dynamically.

2. **Product Detail Endpoint**
   - `/api/sales/catalog/[skuId]/details` returns sectioned payload derived from field config (no hard-coded property lists).
   - Sales analytics pulled same as current but reorganized per new schema.

3. **Admin Configuration APIs**
   - `/api/admin/product-fields` CRUD for definitions/configs.
   - Bulk import/export endpoints for preset templates.
   - Audit logs appended (`AuditLog.action = PRODUCT_FIELD_UPDATE`).

4. **Export Service**
   - `/api/sales/catalog/export` accepts current filter payload, queues job, stores generated files (S3/Supabase storage).
   - Jobs table tracks status; responses include download URLs.

5. **Universal Search**
   - `/api/search` multi-index endpoint (products now, extensible later). Accepts search term + entity filters; returns top matches with highlight metadata.

### 3.3 UI/UX Layer
1. **Sales Catalog Shell**
   - New layout component with top header categories, left navigation for sections, persistent “New Order” button, and universal search input.
   - Filter panel generated from field configs (chips, dropdowns, range sliders).
   - Card tiles highlight lifecycle tags, availability, top price, and quick actions; detail modal uses sections defined by config.

2. **Portal Catalog Parity**
   - Shares the same server-side filtering API but with customer-safe fields (via config flags `showInPortal`, `requiresLoginRole`).
   - Portal UI inherits left nav + export CTA (PDF/email share).

3. **Admin Field Configurator**
   - `/admin/product-fields`: list view, drag-and-drop ordering, toggle switches, detail drawer for required/default/help text.
   - Custom field modal with validation rules, option management, preview of product form.

4. **Export UX**
   - Sales UI exposes “Export” dropdown (CSV/PDF/Excel). Shows history and job state.

## 4. Data Model Changes (Draft)

```
ProductFieldDefinition (
  id UUID PK, key TEXT unique, label TEXT, section TEXT, type ENUM, description TEXT,
  supportsManual BOOLEAN, defaultOptions JSONB, createdAt/updatedAt
)

TenantProductFieldConfig (
  id UUID PK, tenantId UUID FK, fieldId UUID FK,
  visible BOOLEAN, required BOOLEAN, order INT, defaultValue JSONB,
  showInPortal BOOLEAN, filterable BOOLEAN
)

ProductProducer/ProductImporter (... FK to Product, tenant-scoped)
ProductRegion/ProductAppellation (hierarchical)
ProductCertification (organic, biodynamic, etc.)
ProductRating (publication, score, year, notes)
ProductTagDefinition/ProductTag (similar to customer tags)
ProductLifecycleSnapshot (productId, lifecycle ENUM, effectiveAt, expiresAt)
ProductExportJob (id, tenantId, filter JSON, format ENUM, status, filePath, createdBy)
```

Migrations arrive in batches: 1) field registry + lifecycle tables, 2) metadata normalization, 3) export jobs & indices.

## 5. Implementation Phases

### Phase 0 – Readiness
- Confirm data sources (HAL export, enrichment JSON, Travis’ dropdown lists).
- Finalize ticket split for CRM-75/76/77; attach acceptance criteria.
- Draft migration scripts + backfill plan; align with infra team on downtime.

### Phase 1 – Data & Config Foundation
- Ship migrations for field registry + lifecycle + metadata tables.
- Build admin APIs + minimal UI to toggle fields (feature-flagged).
- Backfill key metadata fields from existing JSON/enrichment.
- Implement lifecycle job + surface lifecycle tags in API responses (feature flags off by default).

### Phase 2 – Catalog/Search/Detail Overhaul
- Refactor `/api/sales/catalog` to server-side filtering + facets; update sales + portal UI to consume it.
- Replace catalog shell with new layout, integrate universal search input (wired to `/api/search`).
- Move ProductDrilldownModal to schema-driven rendering (sections from config).
- Introduce portal-safe filter set drawn from config.

### Phase 3 – Exports & Polishing
- Build export job flow + background worker; integrate CSV/PDF/Excel outputs.
- Add admin UX polish (drag ordering, custom field preview, template import/export).
- Instrument analytics + audit logs; validate performance (indexes, caching).
- Roll out feature flags tenant-by-tenant; update docs and training material.

## 6. Risks & Mitigations
- **Data completeness**: Many metadata points may be missing in Supabase. Mitigation: iterate ingestion script with validation reports and fallback “Manual Entry” tokens per Travis’ guidance.
- **Multi-tenant complexity**: Config drift could break forms. Mitigation: type-safe config service, snapshot tests for each tenant’s config.
- **Search performance**: Faceted queries may become expensive. Mitigation: `GIN` indexes, limit multi-select facets, consider materialized views for heavy aggregations.
- **Export rendering time**: Large result sets could slow UI. Mitigation: async job model with pagination threshold and summarised exports.

## 7. Next Actions
1. Review this plan with stakeholders (Travis, Greg) and capture approval/comments.
2. Open child tickets for CRM-75/76/77 referencing sections above.
3. Begin Phase 1 branch: scaffold field-definition migrations + config service with tests.
4. Prepare data audit script to quantify current product metadata coverage.
