--------------------------------------------------------------------------------
-- Add project_id metadata to devices for Expo push routing
--------------------------------------------------------------------------------

alter table if exists public.devices
  add column if not exists project_id text;

create index if not exists idx_devices_project on public.devices(project_id);
