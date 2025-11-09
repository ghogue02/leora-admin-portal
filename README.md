## Leora Portal (web)

Next.js 15 + React 19 front-end for the Leora sales & customer portal with comprehensive admin management capabilities.

### 1. Quick start (local instance)

```bash
cd web
npm install
cp .env.local.example .env.local  # fill in Supabase + database credentials
npm run schema:audit              # optional: confirms required tables exist
npm run dev                       # launches http://localhost:3000
```

The default dev server renders the portal entry at [http://localhost:3000/portal](http://localhost:3000/portal). Use seeded Supabase credentials or the demo session helper to authenticate.

**Environment variables**

- `DATABASE_URL`, `SHADOW_DATABASE_URL` – point Prisma at your Supabase Postgres project (transaction + shadow DB).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` – used for portal API calls and the replay worker.
- `DEFAULT_TENANT_SLUG` – slug resolved by `withTenantFromRequest` when the client omits headers (defaults to `well-crafted`).
- `SUPPORT_ALERT_WEBHOOK`, `REPLAY_ALERT_WEBHOOK` – optional webhooks for urgent support tickets and replay failures.
- `OPENAI_API_KEY` – required to let Copilot call GPT-5; optionally override `OPENAI_API_URL` and `COPILOT_MODEL`.
- `DEVOPS_MONITOR_KEY` – shared secret for `/api/devops/health-ping`; required for external uptime checks and manual diagnostics.
- `INCIDENT_ALERT_WEBHOOK` (optional) – Slack/Teams webhook that receives health incident notifications (falls back to `SUPPORT_ALERT_WEBHOOK`).
- `INCIDENT_ALERT_COOLDOWN_MINUTES` (optional) – throttle for repeated incident alerts (default 30).
- `OBSERVABILITY_RUNBOOK_URL` (optional) – override the runbook link shown on `/dev` (defaults to docs/oauth/PRODUCTION_DEPLOYMENT.md in the repo).
- `OBSERVABILITY_MAX_CONNECTIONS` (optional override if Supabase pool size differs from `pg_settings`).

### 2. Dev workflow tips

- `npm run schema:audit` – checks that the required Supabase tables exist before you lean on Prisma.
- `npm run jobs:supabase-replay` – pulls the latest replay runs into `PortalReplayStatus`; schedule this every 15 minutes in Supabase or Vercel.
- `npm run test` – Vitest suite covering analytics, cart pricing, and tenancy helpers.
- `npm run jobs:run -- <job> --tenant well-crafted` – every job runner now accepts `--tenant`/`--tenant-slug` so you can log runs against a specific tenant (the value is also stored in `JobRunLog`).
- `npm run smoke:health` – hits `/api/health` (configurable via `SMOKE_BASE_URL` & `SMOKE_TENANTS`) and fails if any tenant reports `status: error`.

### Operational monitoring (`/dev`)

- `/dev` renders the operational snapshot (DB health, throughput, backlog, engagement, incidents, uptime, and recent job runs). Access requires an admin session.
- `/api/health` exposes the same data in machine-readable form (`curl https://web-omega-five-81.vercel.app/api/health?tenant=well-crafted`) and is the source of truth for external monitors.
- `vercel.json` registers a cron that calls `/api/devops/health-ping` every 10 minutes. Set `DEVOPS_MONITOR_KEY` in Vercel so manual monitors can still call the same endpoint; Vercel cron requests are auto-authorized via the `x-vercel-cron` header.
- Additional monitors can hit `POST /api/devops/health-ping` with header `x-monitor-key: $DEVOPS_MONITOR_KEY` or `GET /api/devops/health-ping?token=$DEVOPS_MONITOR_KEY` to log uptime samples into `HealthPingLog`.
- Supabase also runs `cron.job` named `health_ping_supabase` (see `prisma/migrations/MANUAL_setup_pg_cron_health_ping.sql`). Update the SQL placeholders with your production domain and `DEVOPS_MONITOR_KEY`, then run `npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/MANUAL_setup_pg_cron_health_ping.sql` to provision or rotate the pg_cron task.
- `prisma/migrations/MANUAL_add_observability_views.sql` defines helper views (e.g., connection summary) and should be applied any time you recreate the database. You can seed job metadata/ownership with `MANUAL_seed_job_metadata.sql`.

### 3. Portal routes

#### Customer Portal
- `/portal` – dashboard with ARPDD, cadence hotlist, support metrics.
- `/portal/catalog` – product catalog with favorites, inventory, and cart entry.
- `/portal/cart` – review cart items and submit portal orders.
- `/portal/admin` – automation & alert configuration.

#### Admin Portal
- `/admin` – admin dashboard with metrics and quick actions. **Requires `sales.admin` role.**
- `/admin/customers` – customer management and bulk operations.
- `/admin/sales-reps` – sales representative management.
- `/admin/inventory` – inventory and pricing management.
- `/admin/accounts` – user account management.
- `/admin/audit-logs` – system activity logs and analytics.

See [Admin Portal User Guide](docs/ADMIN_PORTAL_USER_GUIDE.md) for detailed documentation.

API handlers live under `src/app/api/portal/*` and `src/app/api/admin/*`; see `docs/api-verification.md` for endpoint-by-endpoint validation steps.

### 4. Admin Portal Features (Phase 10)

The admin portal includes comprehensive management capabilities with a polished user experience:

**UI Components**
- Global search (Ctrl+K) across customers, orders, users, and products
- Toast notifications for all operations
- Confirmation dialogs for destructive actions
- Loading states and skeleton loaders
- Unsaved changes warnings
- Keyboard shortcuts (Ctrl+S to save, Ctrl+/ for help)
- Advanced pagination with configurable page sizes

**Performance Optimizations**
- 50+ database indexes for fast queries (90-95% faster)
- Debounced search inputs (300ms)
- Server-side pagination
- Query optimization

**Documentation**
- [Admin Portal User Guide](docs/ADMIN_PORTAL_USER_GUIDE.md) - Complete guide for end users
- [Admin API Reference](docs/ADMIN_API_REFERENCE.md) - API documentation for developers
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions

See [PHASE10_IMPLEMENTATION_COMPLETE.md](PHASE10_IMPLEMENTATION_COMPLETE.md) for complete implementation details.
