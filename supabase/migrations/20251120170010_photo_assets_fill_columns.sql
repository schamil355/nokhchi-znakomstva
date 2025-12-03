--------------------------------------------------------------------------------
-- Backfill photo_assets columns expected by the backend
--------------------------------------------------------------------------------

alter table if exists public.photo_assets
  add column if not exists storage_bucket text;

alter table if exists public.photo_assets
  add column if not exists storage_path text;

alter table if exists public.photo_assets
  add column if not exists blurred_bucket text;

alter table if exists public.photo_assets
  add column if not exists blurred_path text;

alter table if exists public.photo_assets
  add column if not exists visibility_mode text;

update public.photo_assets
set storage_bucket = coalesce(storage_bucket, 'photos_private'),
    storage_path   = coalesce(storage_path, ''),
    blurred_bucket = coalesce(blurred_bucket, 'photos_blurred'),
    visibility_mode = coalesce(visibility_mode, 'blurred_until_match')
where storage_bucket is null
   or storage_path is null
   or blurred_bucket is null
   or visibility_mode is null;

alter table public.photo_assets
  alter column storage_bucket set not null,
  alter column storage_bucket set default 'photos_private',
  alter column storage_path set not null,
  alter column blurred_bucket set not null,
  alter column blurred_bucket set default 'photos_blurred',
  alter column visibility_mode set not null,
  alter column visibility_mode set default 'blurred_until_match';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'photo_assets_visibility_mode_check'
      and conrelid = 'public.photo_assets'::regclass
  ) then
    alter table public.photo_assets
      add constraint photo_assets_visibility_mode_check
        check (
          visibility_mode in ('public','match_only','whitelist','blurred_until_match')
        );
  end if;
end $$;
