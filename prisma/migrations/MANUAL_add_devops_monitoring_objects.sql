-- Manual migration for DevOps visibility primitives
-- Run in Supabase SQL editor or via psql before deploying this change set

-- Job run logging ----------------------------------------------------------
create type "JobRunStatus" as enum ('RUNNING', 'SUCCESS', 'FAILED');

create table if not exists "JobRunLog" (
  "id" uuid primary key default gen_random_uuid(),
  "jobName" text not null,
  "status" "JobRunStatus" not null default 'RUNNING',
  "environment" text,
  "tenantSlug" text,
  "startedAt" timestamptz not null default now(),
  "finishedAt" timestamptz,
  "durationMs" integer,
  "errorMessage" text,
  "metadata" jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "JobRunLog_jobName_startedAt_idx" on "JobRunLog" ("jobName", "startedAt" desc);
create index if not exists "JobRunLog_tenantSlug_startedAt_idx" on "JobRunLog" ("tenantSlug", "startedAt" desc);

-- Health ping logging ------------------------------------------------------
create type "HealthPingStatus" as enum ('UP', 'DOWN', 'DEGRADED');

create table if not exists "HealthPingLog" (
  "id" uuid primary key default gen_random_uuid(),
  "source" text not null default 'internal',
  "targetTenant" text,
  "status" "HealthPingStatus" not null default 'UP',
  "statusCode" integer,
  "responseTimeMs" integer,
  "checkedAt" timestamptz not null default now(),
  "detail" text,
  "createdAt" timestamptz not null default now(),
  "acknowledgedAt" timestamptz,
  "acknowledgedBy" text,
  "acknowledgedByName" text
);

create index if not exists "HealthPingLog_targetTenant_checkedAt_idx" on "HealthPingLog" ("targetTenant", "checkedAt" desc);
create index if not exists "HealthPingLog_checkedAt_idx" on "HealthPingLog" ("checkedAt" desc);
