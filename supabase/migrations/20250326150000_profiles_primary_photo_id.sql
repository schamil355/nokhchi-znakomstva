--------------------------------------------------------------------------------
-- Track primary photo asset id directly on profiles for cross-user access
--------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists primary_photo_id bigint;

create index if not exists profiles_primary_photo_id_idx
  on public.profiles (primary_photo_id);

update public.profiles p
set primary_photo_id = pa.id
from public.photo_assets pa
where p.primary_photo_id is null
  and p.primary_photo_path = pa.storage_path;
