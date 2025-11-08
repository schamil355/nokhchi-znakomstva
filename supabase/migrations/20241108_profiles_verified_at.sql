--------------------------------------------------------------------------------
-- Ensure profiles table contains verified_at column
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists verified_at timestamptz;
