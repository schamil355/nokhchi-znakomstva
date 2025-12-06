--------------------------------------------------------------------------------
-- Drop duplicate/overlapping indexes flagged by linter
--------------------------------------------------------------------------------
-- devices: drop unique constraint/index on (user_id, token) because PK covers it
alter table public.devices
  drop constraint if exists devices_user_token_unique;

-- profiles: drop redundant geohash index duplicate
drop index if exists public.profiles_location_updated_idx;

-- profiles: drop secondary user_id index duplicate
drop index if exists public.profiles_user_id_idx;
