create table if not exists hive_background_jobs (
  id text primary key,
  user_id text not null,
  project_id text not null,
  status text not null check (status in ('queued','running','complete','error','cancelled')),
  payload jsonb not null,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hive_background_jobs_user_status
  on hive_background_jobs (user_id, status, created_at desc);

create index if not exists hive_background_jobs_user_project
  on hive_background_jobs (user_id, project_id, created_at desc);
