-- Backfill missing primary_photo_id so match avatars can be resolved via /v1/photos/view
-- 1) Prefer mapping via primary_photo_path
update public.profiles p
set primary_photo_id = pa.id
from public.photo_assets pa
where p.primary_photo_id is null
  and p.primary_photo_path is not null
  and pa.owner_id = p.id
  and pa.storage_path = p.primary_photo_path;

-- 2) Fallback: extract assetId/photoId from photos[] JSON objects
with candidate as (
  select distinct on (p.id)
    p.id as profile_id,
    coalesce(
      elem->>'assetId',
      elem->>'asset_id',
      elem->>'photoId',
      elem->>'photo_id'
    ) as asset_id_text
  from public.profiles p
  cross join lateral jsonb_array_elements(coalesce(to_jsonb(p.photos), '[]'::jsonb)) as elem
  where p.primary_photo_id is null
)
update public.profiles p
set primary_photo_id = candidate.asset_id_text::bigint
from candidate
where p.id = candidate.profile_id
  and candidate.asset_id_text ~ '^[0-9]+$';

-- 3) Last resort: pick latest photo asset and set primary path if missing
with latest as (
  select distinct on (owner_id)
    owner_id,
    id,
    storage_path
  from public.photo_assets
  order by owner_id, created_at desc nulls last, id desc
)
update public.profiles p
set primary_photo_id = latest.id,
    primary_photo_path = coalesce(p.primary_photo_path, latest.storage_path)
from latest
where p.primary_photo_id is null
  and p.id = latest.owner_id;
