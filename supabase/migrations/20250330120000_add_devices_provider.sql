--------------------------------------------------------------------------------
-- Add provider/project_id columns to devices for push token routing
--------------------------------------------------------------------------------

alter table public.devices
  add column if not exists provider text not null default 'expo'
    check (provider in ('expo', 'fcm'));

-- Drop the default after backfilling existing rows to keep explicit writes required.
alter table public.devices
  alter column provider drop default;

alter table public.devices
  add column if not exists project_id text;

create index if not exists idx_devices_project on public.devices(project_id);
