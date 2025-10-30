<!-- HANDOFF: Continue Copilot iteration – wire OpenAI streaming, finish UI polish, and validate multi-tenant RLS across analytics & pricing tables. If GPT errors appear, verify OPENAI_API_KEY and Supabase policies per Section 4. -->

## Handoff Summary (auto-read)
- Completion: GPT-5 Copilot hooked into `/api/portal/copilot` with OpenAI support (fallbacks when the key is missing); portal toasts centralized; pricing/inventory/analytics tables now run under enforced RLS; shared `runWithTransaction` helper keeps Prisma transaction clients type-safe; schema audit script reads `.env.local`; catalog/favorites/admin UI all use brand-aligned feedback; Copilot panel surfaces live metrics + hotlist.
- Next focus: Stream Copilot replies in the UI, add citation chips, and store prompt/response audit logs; finish responsive/a11y sweep (mobile nav is ready, but other screens need focus/aria QA); build pricing admin tooling tied to new RLS policies; integrate Copilot follow-up actions with existing APIs.
- Pending: Automate RLS verification post-deploy (`npm run schema:audit` + Supabase SQL script), document GPT usage runbooks, and expand Copilot intent catalog (pace alerts, pricing questions, sample allowances).
- Local dataset (Well Crafted) is already seeded; grab a portal session at `/dev/portal-login` when you need to authenticate locally. Do **not** rerun `npm run seed:well-crafted` without coordinating, since the dataset is authoritative. If you just need demo portal activity, run `npm run seed:portal-demo` (idempotent unless orders already exist).
- PDF invoice ingestion (current state):  
  * Parser normalizes Well Crafted “portal” invoices, Well Crafted “classic” distributor invoices, and Canopy Wine PDF layout.  
  * `npm run import:invoices -- --directory ../invoices` → dry-run (JSON preview).  
  * `npm run import:invoices -- --directory ../invoices --write` → persists customers, orders, invoices, and order lines; existing invoices overwrite (old order/invoice/order_lines are deleted first).  
  * Skipped line items are logged when SKU codes aren’t found under the tenant. Numeric product IDs from Canopy (e.g., `29857`) need to be mapped or pre-seeded into the catalog—see handoff notes in `/docs/README-INVOICES.md` (to add).  
  * After bulk import, rerun the Supabase replay worker so Copilot/dashboard analytics refresh (`npm run jobs:run -- supabase-replay`).

# Agent TODO (Outstanding Implementation)
1. **Copilot Enhancements**
   - Stream GPT-5 responses to `/portal/leora`, render citation badges, and add audit logging for prompts/responses.
   - Expand intent catalog (pace alert, pricing question, sample allowance) with Supabase queries.
   - Add Copilot follow-up actions (trigger tasks, share insights) leveraging existing APIs.
2. **UI & Brand System**
   - Harden responsive states and focus outlines across portal pages (catalog, dashboard, invoices, audit).
   - Audit icon usage and spacing for consistency with brand rules.
   - Add citation/tooltip components for Copilot replies.
3. **Data Model & RLS**
   - Confirm RLS policies in production after future migrations; keep Supabase SQL script (`docs/database/queries/20251018_enable_rls.sql`) up to date.
   - Add service-role playbook for automation bypass (documented in Section 4.5).
   - Run `npm run schema:audit` post-deploy to detect drift.
4. **Pricing & Analytics Tooling**
   - Build pricing admin screens using the newly protected `PriceList` and `Inventory` tables.
   - Surface analytics snapshots (AccountHealthSnapshot, SalesMetric) with real RLS-backed data.
   - Write end-to-end tests covering pricing updates under RLS.
5. **Deployment Ops**
   - Apply migration `20251018085546_extend_rls_additional` (already run manually) in future environments via SQL script.
   - Update CI to run `npm run test`, `npm run build`, and `npm run schema:audit`.
   - Add runbooks for GPT key rotation and Supabase policy updates.

# Leora Platform Blueprint

See `docs/database/well-crafted-schema.md` for the current Supabase schema snapshot.

## 4. Supabase & Data Architecture

- Multi-tenancy enforced via `withTenant` (`lib/prisma.ts`) and RLS policies per tables listed in `docs/database/well-crafted-schema.md`.
- SQL script for fast RLS setup lives at `docs/database/queries/20251018_enable_rls.sql`.
- Run `npm run schema:audit` after schema changes.

## 5. Application Architecture (excerpt)

- Copilot endpoint: `/api/portal/copilot` (uses OpenAI via `src/lib/copilot/service.ts`).
- GPT credentials: `OPENAI_API_KEY`, `OPENAI_API_URL`, `COPILOT_MODEL` in `.env.local`.
- Copilot UI: `/portal/leora` (streaming still pending).

## 6. UI & Brand System

- Toast provider (`Portal/_components/ToastProvider.tsx`) handles cart/favorites/admin feedback.
- Mobile nav accessible dialog in `PortalNav.tsx`.
- Brand tokens defined in `app/globals.css` (`--brand-*`).

## 7. Deployment Checklist

- Tests: `npm run test`
- Build: `npm run build`
- Schema: `npm run schema:audit`
- Supabase SQL: run `docs/database/queries/20251018_enable_rls.sql` when deploying to fresh environments.
