alter table observability.job_metadata
  add column if not exists contact text;
