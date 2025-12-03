--------------------------------------------------------------------------------
-- Discovery RPC: show incognito profiles (client will blur), only block by blocks
--------------------------------------------------------------------------------

drop function if exists public.get_discovery_profiles(integer, integer);
create or replace function public.get_discovery_profiles(p_limit integer, p_offset integer default 0)
returns setof public.profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  safe_limit integer := greatest(coalesce(p_limit, 50), 1);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  viewer_geohash text;
begin
  if viewer is null then
    return;
  end if;

  select location_geohash into viewer_geohash
  from public.profiles
  where id = viewer;

  return query
  select p.*
  from public.profiles p
  where p.id <> viewer
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = viewer
        and b.blocked_id = p.id
    )
  order by
    case
      when viewer_geohash is not null
           and p.location_geohash is not null
           and p.location_geohash = viewer_geohash then 0
      when viewer_geohash is not null
           and p.location_geohash is not null then 1
      else 2
    end,
    p.updated_at desc nulls last,
    p.location_geohash desc nulls last
  limit safe_limit
  offset safe_offset;
end;
$$;
