alter table "HealthPingLog"
  add column if not exists "acknowledgedAt" timestamptz,
  add column if not exists "acknowledgedBy" text,
  add column if not exists "acknowledgedByName" text;
