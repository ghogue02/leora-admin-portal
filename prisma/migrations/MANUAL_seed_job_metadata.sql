insert into observability.job_metadata (job_name, owner, schedule, max_interval_minutes)
values
  ('supabase-replay', 'Ops', 'Every 15 min', 30)
on conflict (job_name) do update set owner = excluded.owner, schedule = excluded.schedule, max_interval_minutes = excluded.max_interval_minutes;
