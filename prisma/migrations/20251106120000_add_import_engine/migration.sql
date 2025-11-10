-- Import staging tables for tenant-safe data ingestion

create table "ImportTemplate" (
  "id" uuid not null default gen_random_uuid(),
  "tenantId" uuid,
  "name" text not null,
  "dataType" text not null,
  "description" text,
  "config" jsonb not null,
  "createdById" uuid,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint "ImportTemplate_pkey" primary key ("id"),
  constraint "ImportTemplate_tenantId_fkey" foreign key ("tenantId") references "Tenant"("id") on delete cascade on update cascade,
  constraint "ImportTemplate_createdById_fkey" foreign key ("createdById") references "User"("id") on delete set null on update cascade
);

create index "ImportTemplate_tenantId_idx" on "ImportTemplate" ("tenantId");
create index "ImportTemplate_dataType_idx" on "ImportTemplate" ("dataType");

create table "ImportBatch" (
  "id" uuid not null default gen_random_uuid(),
  "tenantId" uuid not null,
  "dataType" text not null,
  "source" text not null,
  "status" text not null default 'queued',
  "templateId" uuid,
  "fileKey" text,
  "checksum" text,
  "initiatedById" uuid,
  "summary" jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "startedAt" timestamp with time zone,
  "completedAt" timestamp with time zone,
  constraint "ImportBatch_pkey" primary key ("id"),
  constraint "ImportBatch_tenantId_fkey" foreign key ("tenantId") references "Tenant"("id") on delete cascade on update cascade,
  constraint "ImportBatch_templateId_fkey" foreign key ("templateId") references "ImportTemplate"("id") on delete set null on update cascade,
  constraint "ImportBatch_initiatedById_fkey" foreign key ("initiatedById") references "User"("id") on delete set null on update cascade
);

create index "ImportBatch_tenantId_idx" on "ImportBatch" ("tenantId");
create index "ImportBatch_tenantId_status_idx" on "ImportBatch" ("tenantId", "status");
create index "ImportBatch_templateId_idx" on "ImportBatch" ("templateId");
create index "ImportBatch_checksum_idx" on "ImportBatch" ("checksum");

create table "ImportRow" (
  "id" uuid not null default gen_random_uuid(),
  "batchId" uuid not null,
  "tenantId" uuid not null,
  "externalKey" text,
  "payload" jsonb not null,
  "status" text not null default 'pending',
  "errors" jsonb,
  "appliedRecordId" text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint "ImportRow_pkey" primary key ("id"),
  constraint "ImportRow_batchId_fkey" foreign key ("batchId") references "ImportBatch"("id") on delete cascade on update cascade,
  constraint "ImportRow_tenantId_fkey" foreign key ("tenantId") references "Tenant"("id") on delete cascade on update cascade
);

create index "ImportRow_batchId_idx" on "ImportRow" ("batchId");
create index "ImportRow_tenantId_status_idx" on "ImportRow" ("tenantId", "status");
create index "ImportRow_tenantId_externalKey_idx" on "ImportRow" ("tenantId", "externalKey");
