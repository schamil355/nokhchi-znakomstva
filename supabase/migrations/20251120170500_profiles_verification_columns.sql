--------------------------------------------------------------------------------
-- Ensure verification-related columns exist on public.profiles
--------------------------------------------------------------------------------

alter table if exists public.profiles
  add column if not exists primary_photo_path text,
  add column if not exists verified boolean default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_method text,
  add column if not exists verified_face_score numeric;

update public.profiles
set verified = coalesce(verified, false)
where verified is null;
