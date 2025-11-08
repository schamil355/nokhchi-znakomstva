--------------------------------------------------------------------------------
-- Discovery RPC alignment (single canonical get_discovery_profiles)
--------------------------------------------------------------------------------

create index if not exists profiles_location_geohash_updated_idx
  on public.profiles (location_geohash, updated_at desc);

create or replace function public.get_discovery_profiles(p_limit integer, p_offset integer default 0)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  safe_limit integer := greatest(coalesce(p_limit, 50), 1);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if viewer is null then
    return;
  end if;

  return query
  select p.*
  from public.profiles p
  where p.id <> viewer
    and not exists (
      select 1
      from public.blocks b
      where b.blocker_id = viewer
        and b.blocked_id = p.id
    )
    and (
      not coalesce(p.is_incognito, false)
      or p.id = viewer
      or exists (
        select 1
        from public.likes l
        where l.liker_id = p.id
          and l.likee_id = viewer
      )
      or exists (
        select 1
        from public.matches m
        where (m.user_a = p.id and m.user_b = viewer)
           or (m.user_b = p.id and m.user_a = viewer)
      )
    )
  order by
    p.updated_at desc nulls last,
    p.created_at desc
  limit safe_limit
  offset safe_offset;
end;
$$;

grant execute on function public.get_discovery_profiles(integer, integer)
  to authenticated;
