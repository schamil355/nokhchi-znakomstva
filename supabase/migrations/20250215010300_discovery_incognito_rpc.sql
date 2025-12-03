--------------------------------------------------------------------------------
-- Supporting index for discovery ordering
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists location_geohash text;

create index if not exists profiles_location_updated_idx
  on public.profiles (location_geohash, updated_at desc);

--------------------------------------------------------------------------------
-- Discovery RPC with incognito gate & block filtering
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_discovery_profiles(integer, integer);
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
    and (
      not coalesce(p.is_incognito, false)
      or p.id = viewer
      or exists (
        select 1 from public.likes l
        where l.liker_id = p.id
          and l.liked_id = viewer
      )
      or exists (
        select 1 from public.matches m
        where (m.user_a = p.id and m.user_b = viewer)
           or (m.user_b = p.id and m.user_a = viewer)
      )
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
