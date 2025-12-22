--------------------------------------------------------------------------------
-- Track when location was last updated
--------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists location_updated_at timestamptz null;
