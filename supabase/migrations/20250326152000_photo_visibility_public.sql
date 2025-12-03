--------------------------------------------------------------------------------
-- Default all photo assets to public visibility (until incognito feature returns)
--------------------------------------------------------------------------------

alter table public.photo_assets
  alter column visibility_mode set default 'public';

update public.photo_assets
set visibility_mode = 'public'
where visibility_mode is null
   or visibility_mode = 'blurred_until_match';
