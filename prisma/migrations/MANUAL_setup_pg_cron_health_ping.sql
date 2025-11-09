-- Enable pg_cron (runs in extensions schema on Supabase)
create extension if not exists pg_cron with schema extensions;

-- Replace PLACEHOLDER_URL and PLACEHOLDER_MONITOR_KEY before running.
-- Example URL: https://web-omega-five-81.vercel.app/api/devops/health-ping?tenant=well-crafted
-- Example header: DEVOPS_MONITOR_KEY from Vercel env
select cron.unschedule(jobid)
from cron.job
where jobname = 'health_ping_supabase';

select cron.schedule(
  'health_ping_supabase',
  '*/10 * * * *',
  $function$
    select net.http_post(
      url := 'PLACEHOLDER_URL',
      headers := jsonb_build_object('x-monitor-key', 'PLACEHOLDER_MONITOR_KEY')
    );
  $function$
);
