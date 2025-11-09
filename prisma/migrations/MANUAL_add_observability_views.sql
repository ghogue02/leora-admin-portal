create schema if not exists observability;

drop view if exists observability.connection_summary;
create view observability.connection_summary as
select
  count(*) filter (where state = 'active') as active_connections,
  count(*) filter (where state = 'idle') as idle_connections,
  max(setting::int) as max_connections
from pg_stat_activity,
  pg_settings
where pg_settings.name = 'max_connections';

-- Example metric for job cadence
create table if not exists observability.job_metadata (
  job_name text primary key,
  owner text,
  schedule text,
  max_interval_minutes int default 1440
);
