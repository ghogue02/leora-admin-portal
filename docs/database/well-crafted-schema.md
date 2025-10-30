# Well Crafted Supabase Schema Overview

_Last updated: $(date +%Y-%m-%d)_

This document captures the current public schema for the Well Crafted Supabase project and serves as the source of truth for multi-tenant database work. Whenever schema changes ship (new tables, columns, policies, or enums), update this file alongside the corresponding Prisma migration and note the change in `docs/leora-platform-blueprint.md`.

## Table Inventory (Public Schema)

| Domain | Tables |
| --- | --- |
| Tenant Management | Tenant, TenantSettings |
| Users & Security | PortalUser, User, UserRole, Role, RolePermission, Permission |
| Customer Management | Customer, CustomerAddress |
| Product & Inventory | Product, Sku, Inventory, Supplier, PriceList, PriceListItem |
| Sales & Orders | Order, OrderLine, Invoice, Payment, PortalPaymentMethod |
| Cart & Shopping | Cart, CartItem |
| Activity & Audit | Activity, ActivityType, Task, CallPlan, SalesMetric, AccountHealthSnapshot |
| Portal Features | PortalSession, PortalFavorite, PortalNotification, PortalReplayStatus |
| Support & Compliance | SupportTicket, SupportTicketAttachment, ComplianceFiling, StateCompliance, StateTaxRate, IntegrationToken |
| Webhooks & Events | WebhookSubscription, WebhookDelivery, WebhookEvent |
| System | _prisma_migrations |

_Total tables: 43_

## Key Characteristics

- **Identifiers** – Every business table uses `uuid` primary keys and references `Tenant.id` for isolation.
- **Timestamps** – Standard `created_at` / `updated_at` (`timestamp with time zone`) audit fields across tables.
- **Money & metrics** – Monetary values use `numeric/decimal` columns; aggregates often rely on materialized snapshots (e.g., `SalesMetric`, `AccountHealthSnapshot`).
- **Flexible metadata** – JSONB columns appear in activity logs, pricing waterfalls, and webhook payload storage.

## Relationships & Hierarchies

- **Tenant-first** – Most tables include `tenant_id` and enforce tenant scoping through `withTenant` + RLS policies.
- **Catalog → Pricing → Orders** – `Product` → `Sku` → `PriceList`/`PriceListItem`, feeding into `CartItem`, `OrderLine`, and `Invoice`.
- **Automation** – `PortalReplayStatus`, `Webhook*`, and `IntegrationToken` support ingestion and outbound workflows.
- **Support** – `SupportTicket` + `SupportTicketAttachment` join to activity logging (`Activity`, `ActivityType`).

## Row-Level Security Checklist

RLS is expected to be enabled and forced on tenant-scoped tables. At a minimum, confirm policies for:

- `Order`, `OrderLine`, `Invoice`, `Payment`
- `Cart`, `CartItem`, `PortalFavorite`, `PortalNotification`
- `SupportTicket`, `SupportTicketAttachment`
- `PortalReplayStatus`, `Activity`, `ActivityType`
- `PriceList`, `PriceListItem`, `Inventory`
- `AccountHealthSnapshot`, `SalesMetric`

Service-role workers (replay, seeders, automation) should use dedicated roles or `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` within controlled transactions when broader access is required.

## Change Management

1. Create/update Prisma models in `prisma/schema.prisma`.
2. Generate a migration (`npx prisma migrate dev` or hand-authored SQL) and document the change in this file.
3. Update `docs/leora-platform-blueprint.md` noting schema adjustments and any runbooks (seeding, RLS exceptions).
4. Run `npm run schema:audit` after deployment to catch drift between Supabase and Prisma.

> **Note:** This overview summarizes current Supabase UI exports. Re-run `pg_dump --schema-only` or Supabase’s inspector regularly to ensure fidelity and update this document accordingly.
