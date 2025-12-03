--------------------------------------------------------------------------------
-- Ensure profiles table contains latitude / longitude for geo features
--------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists profiles_lat_lng_idx
  on public.profiles (latitude, longitude);
