# Well-Crafted Tenant Seeding Plan

This plan translates the blueprint requirements (see `docs/leora-platform-blueprint.md`) into an actionable seed workflow for the Supabase/Postgres project (`zqezunzlyjkseugujkrl`). The current repository already contains a draft seed CLI (`web/src/scripts/seed-well-crafted.ts`); we will extend it to satisfy the full pipeline.

## 1. Source Data & Locations

- `data/exports/Export suppliers *.csv` – authoritative list of suppliers.
- `data/exports/Export items *.csv` – product catalogue with SKU metadata.
- `data/exports/Export prices *.csv` – price lists and item-level pricing.
- `data/exports/Export customers *.csv` – account roster with shipping/contact info.
- `data/exports/Well Crafted Wine & Beverage Co. inventory *.csv` – on-hand inventory counts per SKU/location.
- *(Planned)* additional exports (`orders`, `order_lines`, `invoices`, `payments`, `activities`, etc.) will be added to the same directory; the CLI must treat them as optional but auto-ingest when present.

All CSV files include a vendor preamble (e.g., `sep=,`, title rows). The CLI already contains `stripPreamble` logic to normalise content before parsing.

## 2. Target Entities & Sequence

The seed command should perform idempotent upserts in the following order (matching Section 4.4 of the blueprint):

1. **Tenant bootstrap**
   - Upsert tenant (`Tenant`) by slug.
   - Upsert tenant settings (`TenantSettings`), default portal role, sample allowances.
   - Ensure base permissions (`Permission`) and tenant roles (`Role`, `RolePermission`).

2. **Supplier import**
   - Upsert each supplier by name, preserving licence numbers and other IDs.

3. **Product & SKU import**
   - Upsert products by name, link to suppliers.
   - Upsert SKUs by code, attach dimensional data (size, UOM, ABV, cases per pallet, cost).

4. **Price lists**
   - Upsert price lists by name.
   - Upsert price list items for each SKU (`PriceListItem`), respecting min quantities and unit pricing.

5. **Customers & addresses**
   - Upsert customers by external ID (licence or company name fallback).
   - Upsert primary shipping address records (`CustomerAddress`).

6. **Portal users & roles**
   - Create baseline portal users:
     - A primary demo/admin portal user derived from `NEXT_PUBLIC_DEFAULT_PORTAL_USER_EMAIL` (or a synthetic email using `PORTAL_USER_EMAIL_DOMAIN` if unset).
     - Additional users from the customer export (one per unique email, mapped back to the owning customer where possible).
   - Assign the default portal role (`PortalUserRole`) according to tenant settings.
   - Optionally generate demo portal sessions (`PortalSession`) when `DEFAULT_PORTAL_USER_KEY` is present.

7. **Inventory**
   - Upsert inventory per SKU/location using the inventory export (`Inventory`).

8. **Historical datasets (planned)**
   - When additional CSVs land, ingest:
     - Orders & order lines (`Order`, `OrderLine`) with status, totals, line-level pricing.
     - Invoices & payments (`Invoice`, `Payment`).
     - Activities, call plans, samples, tasks (`Activity`, `ActivityType`, `Task`, etc.).
   - Each module should be optional: if the corresponding source file is missing, log a skip and continue so the CLI can run incrementally as exports arrive.

## 3. Idempotency & Safety

- Use `upsert` where possible keyed by natural identifiers:
  - Tenant slug, supplier name, product name, SKU code, price list name, customer external ID, portal user email, etc.
- For join tables (`RolePermission`, `PortalUserRole`) prefer `deleteMany` + `createMany` with `skipDuplicates: true`.
- Wrap mutating sections in `prisma.$transaction` groups when the dataset is small enough; otherwise sequential upserts are acceptable due to export volume.
- Allow `SEED_EXPORTS_PATH` override to target alternate data directories (e.g., during dry runs).

## 4. Verification & Reporting

After the import completes:

- Query aggregate counts for core tables (`Supplier`, `Product`, `Sku`, `PriceList`, `Customer`, `PortalUser`, `Inventory`, plus any optional modules).
- Emit warnings if any required dataset produced zero rows.
- Confirm the default portal role exists and that at least one portal user holds it; fail fast if not.
- Optionally run light data quality checks (e.g., ensure every price list item references an existing SKU, no orphaned customer addresses).

Console output should end with a machine-readable JSON summary (counts, skipped modules, verification status) in addition to the human-readable table so future automation can parse results.

## 5. Next Steps

1. Extend `seed-well-crafted.ts` to:
   - Return richer results from existing helpers (counts and identifier maps).
   - Add the new `seedPortalUsers` module.
   - Detect and skip missing optional datasets gracefully.
   - Produce structured verification output.
2. Wire new environment options (`DEFAULT_TENANT_NAME`, `DEFAULT_PORTAL_USER_EMAIL`, `PORTAL_USER_EMAIL_DOMAIN`) into the CLI.
3. (Future) Add ingestion functions for orders, invoices, payments, activities once the CSV exports are delivered.

This plan keeps the CLI aligned with the blueprint while remaining resilient as additional exports are introduced.

