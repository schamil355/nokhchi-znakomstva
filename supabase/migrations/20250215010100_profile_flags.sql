--------------------------------------------------------------------------------
-- Profile privacy flags (idempotent)
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_incognito boolean not null default false;

alter table public.profiles
  add column if not exists show_distance boolean not null default true;

alter table public.profiles
  add column if not exists show_last_seen boolean not null default true;
