# Data Import – Immediate Action Plan

Prepared to kick off the multi-tenant import program described in the roadmap. Each action below is executable now and unblocks later phases.

---

## 1. Restore Database Connectivity
- **Owner:** Infra + Eng.
- **Inputs:** Supabase project, `.env.local`, `.env`.
- **Steps:**
  1. Regenerate database password in Supabase → Settings → Database.
  2. Update `DATABASE_URL`, `DIRECT_URL`, `SHADOW_DATABASE_URL` locally and in Vercel/Vault.
  3. `cd web && npx prisma migrate deploy` (verifies migrations).
  4. `npx tsx scripts/check-tenant.ts` – confirms tenant slug accessible.
  5. `npx tsx scripts/import-customers.ts --dry-run` (wrap script to add dry run flag) to ensure connections stable before large imports.
- **Deliverable:** Confirmation log in Slack + updated secrets tracker.

## 2. Inventory Source Data
- **Owner:** Customer success / RevOps w/ Eng support.
- **Artifact:** Fill table below and store (e.g., Notion or `data/import-sources.xlsx`).

| Dataset | Owner | Format | Location | Refresh Cadence | Notes |
|---------|-------|--------|----------|-----------------|-------|
| Customers |  |  |  |  |  |
| Contacts |  |  |  |  |  |
| Products/SKUs |  |  |  |  |  |
| Inventory |  |  |  |  |  |
| Orders / Invoices |  |  |  |  |  |
| Payments |  |  |  |  |  |
| Warehouse Locations |  |  |  |  |  |
| Delivery Routes |  |  |  |  |  |

- Capture column samples + quirks (headers, date formats, multi-sheet XLSX, zipped batches).
- Output feeds directly into template auto-detection work.

## 3. Schema Proposal for Import Engine
- **Owner:** Backend.
- **Goal:** Socialize/approve new staging tables.

```prisma
model ImportBatch {
  id              String      @id @default(uuid())
  tenantId        String      @db.Uuid
  dataType        String      // e.g., "customer", "sku", "invoice"
  source          String      // "portal-upload", "api", "cli"
  status          String      // queued | processing | completed | failed
  templateId      String?     @db.Uuid
  fileKey         String?     // storage path
  checksum        String?     // SHA-256 of raw file
  initiatedById   String?     @db.Uuid
  summary         Json?
  createdAt       DateTime    @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  tenant          Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  initiatedBy     User?       @relation(fields: [initiatedById], references: [id])
  template        ImportTemplate? @relation(fields: [templateId], references: [id])
  rows            ImportRow[]
}

model ImportRow {
  id           String      @id @default(uuid())
  batchId      String      @db.Uuid
  tenantId     String      @db.Uuid
  externalKey  String?     // e.g., original invoice number
  payload      Json        // normalized columns
  status       String      // pending | validated | applied | skipped | failed
  errors       Json?
  appliedRecordId String?  // target table PK
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  batch        ImportBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  tenant       Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model ImportTemplate {
  id          String   @id @default(uuid())
  tenantId    String?  // null => global template
  name        String
  dataType    String
  description String?
  config      Json     // column mappings, transforms, defaults
  createdById String?  @db.Uuid
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
  createdBy   User?    @relation(fields: [createdById], references: [id])
  batches     ImportBatch[]
}
```

- Review/WIP items:
  - Storage bucket naming, retention policy, encryption at rest.
  - Indexes on `(tenantId, status)` for queue scans.
  - Potential `ImportDependency` table if we need explicit parent-child sequencing.

## 4. API & UI Spike Outline
- **Owner:** Backend + Frontend.
- **Deliverable:** Technical design doc + low-fi mocks.
- **Scope:**
  - Endpoint: `POST /api/admin/imports` (multipart). Validates role via sales/admin guard, uploads file to storage, creates `ImportBatch`.
  - Endpoint: `POST /api/admin/imports/{id}/validate` – kicks off parsing/validation job.
  - Endpoint: `POST /api/admin/imports/{id}/commit` – enqueues data application job.
  - Frontend flow:
    1. Admin navigates to `/admin/imports`.
    2. Select data type + template; upload file.
    3. Review detected columns vs. required fields; adjust mapping.
    4. See row-level validation results; approve commit.
    5. Progress + audit log visible (reuse toast/skeleton patterns already used in admin portal).
  - Observability: integrate with `logJobRunStart` / `logJobRunFinish` (`src/jobs/run.ts:32`) so imports show up in `/dev`.

## 5. Script Refactor Plan
- **Owner:** Engineering.
- **Objective:** Reuse existing proven logic but plug it into the new engine.
- **Tasks:**
  1. **Abstract parsing logic** from `scripts/import-customers.ts:48` and `scripts/import-csv-data.ts:160` into `src/lib/imports/parsers.ts`.
  2. **Wrap current scripts** so they read from `ImportBatch` rows instead of filesystem; keep CLI entrypoints for emergency bulk fixes.
  3. **Add dry-run switch** to legacy scripts for safe validation while new engine is in development.
  4. **Unit tests:** port critical flows (grouping invoices, classification logic) into Vitest suites.
  5. **Deprecation notice:** once portal UI ships, document EOL timeline for direct script usage and update `scripts/README.md`.

---

### Tracking & Handoff
- Log progress in the existing deployment/phase tracker for visibility.
- Use this file as the living checklist; update statuses inline or link to tickets when tasks complete.
