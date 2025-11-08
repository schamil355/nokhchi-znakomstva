--------------------------------------------------------------------------------
-- Discovery ordering with deterministic tie-breakers
--------------------------------------------------------------------------------

-- create helper geo distance if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'geo_distance_km'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      create function public.geo_distance_km(hash_a text, hash_b text)
      returns double precision
      language sql
      immutable
      as $body$
        select case
          when hash_a is null or hash_b is null then null
          else st_distance(
            st_setsrid(st_geomfromgeohash(hash_a), 4326)::geography,
            st_setsrid(st_geomfromgeohash(hash_b), 4326)::geography
          ) / 1000.0
        end
      $body$
    $fn$;
  END IF;
END
$$;

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
      select 1
      from public.blocks b
      where (b.blocker_id = viewer and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = viewer)
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
    public.geo_distance_km(p.location_geohash, viewer_geohash) asc nulls last,
    p.id asc
  limit safe_limit
  offset safe_offset;
end;
$$;

grant execute on function public.get_discovery_profiles(integer, integer)
  to authenticated;
