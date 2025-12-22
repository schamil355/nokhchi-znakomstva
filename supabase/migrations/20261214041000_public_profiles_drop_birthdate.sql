--------------------------------------------------------------------------------
-- Update dependent objects to stop using birthdate
--------------------------------------------------------------------------------

-- Recreate view without birthdate
drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = true) as
select
  id,
  display_name,
  bio,
  birthday,
  gender,
  orientation,
  interests,
  photos,
  location,
  created_at,
  updated_at,
  last_active_at,
  feedback_score
from profiles;

-- Recreate get_candidates_region to use public_profiles (now without birthdate)
create or replace function public.get_candidates_region(
  p_viewer uuid,
  p_mode search_region_mode default 'NEARBY',
  p_limit integer default 100
)
returns setof public_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 100), 1);
  v_mode search_region_mode := coalesce(p_mode, 'NEARBY');
  v_viewer_location geography;
  v_eu_countries text[];
  v_has_rank boolean := false;
begin
  select pp.location
  into v_viewer_location
  from public.public_profiles pp
  where pp.id = p_viewer;

  if not found then
    return;
  end if;

  select country_codes
  into v_eu_countries
  from public.region_sets
  where id = 'EU_BASE';

  select exists (
           select 1
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname = 'rank_candidates'
         )
  into v_has_rank;

  if v_has_rank then
    return query
    with filtered as (
      select cand.*
      from public.public_profiles cand
      where cand.id <> p_viewer
        and coalesce(jsonb_array_length(cand.photos), 0) > 0
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker = p_viewer and b.blocked = cand.id)
             or (b.blocker = cand.id and b.blocked = p_viewer)
        )
        and (
          (v_mode = 'NEARBY'
           and v_viewer_location is not null
           and cand.location is not null
           and st_dwithin(cand.location, v_viewer_location, 50000))
          or
          (v_mode = 'CHECHNYA'
           and cand.location is not null
           and exists (
             select 1
             from public.geo_regions g
             where g.id = 'CHECHNYA'
               and st_contains(g.geom::geometry, cand.location::geometry)
           ))
          or
          (v_mode = 'EUROPE'
           and cand.country is not null
           and cand.country::text = any(coalesce(v_eu_countries, array[]::text[])))
        )
    )
    select f.*
    from filtered f
    order by public.rank_candidates(p_viewer, f.id) desc nulls last,
             f.created_at desc
    limit v_limit;
  else
    return query
    with filtered as (
      select cand.*
      from public.public_profiles cand
      where cand.id <> p_viewer
        and coalesce(jsonb_array_length(cand.photos), 0) > 0
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker = p_viewer and b.blocked = cand.id)
             or (b.blocker = cand.id and b.blocked = p_viewer)
        )
        and (
          (v_mode = 'NEARBY'
           and v_viewer_location is not null
           and cand.location is not null
           and st_dwithin(cand.location, v_viewer_location, 50000))
          or
          (v_mode = 'CHECHNYA'
           and cand.location is not null
           and exists (
             select 1
             from public.geo_regions g
             where g.id = 'CHECHNYA'
               and st_contains(g.geom::geometry, cand.location::geometry)
           ))
          or
          (v_mode = 'EUROPE'
           and cand.country is not null
           and cand.country::text = any(coalesce(v_eu_countries, array[]::text[])))
        )
    )
    select f.*
    from filtered f
    order by f.created_at desc
    limit v_limit;
  end if;
end;
$$;

-- (Re)create discovery_profiles view without birthdate
drop view if exists public.discovery_profiles;
create view public.discovery_profiles
with (security_invoker = true) as
select
  p.id,
  p.display_name,
  p.bio,
  p.birthday,
  p.gender,
  p.orientation,
  p.interests,
  p.photos,
  p.location,
  p.created_at,
  p.updated_at,
  p.last_active_at,
  p.feedback_score,
  p.country,
  p.region_code,
  p.is_incognito,
  p.show_distance,
  p.show_last_seen,
  p.intention,
  p.is_premium,
  p.primary_photo_path,
  p.verified,
  p.verified_at,
  p.verified_face_score,
  p.verified_method,
  p.latitude,
  p.longitude,
  p.primary_photo_id,
  p.role,
  p.city,
  p.district,
  p.hide_nearby,
  p.hide_nearby_radius,
  p.location_geohash,
  p.location_updated_at
from public.profiles p;
