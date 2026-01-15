--------------------------------------------------------------------------------
-- Discovery/Recent RPCs: apply server-side region filtering
--------------------------------------------------------------------------------

drop function if exists public.get_discovery_profiles(
  integer,
  integer,
  text[],
  text[],
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision
);
drop function if exists public.get_discovery_profiles(integer, integer);

create or replace function public.get_discovery_profiles(
  p_limit integer,
  p_offset integer default 0,
  p_genders text[] default null,
  p_intentions text[] default null,
  p_min_age integer default 18,
  p_max_age integer default 99,
  p_min_distance_km double precision default 0,
  p_max_distance_km double precision default 130,
  p_origin_lat double precision default null,
  p_origin_lng double precision default null,
  p_region text default null
)
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
  viewer_lat double precision;
  viewer_lng double precision;
  origin_lat double precision;
  origin_lng double precision;
  region_filter text := lower(coalesce(p_region, ''));
  eu_countries text[] := array[]::text[];
  chechnya_lat double precision := 43.3189;
  chechnya_lng double precision := 45.6981;
  chechnya_radius_km double precision := 130;
begin
  if viewer is null then
    return;
  end if;

  select location_geohash, latitude, longitude
  into viewer_geohash, viewer_lat, viewer_lng
  from public.profiles
  where id = viewer;

  origin_lat := coalesce(p_origin_lat, viewer_lat);
  origin_lng := coalesce(p_origin_lng, viewer_lng);

  select country_codes
  into eu_countries
  from public.region_sets
  where id = 'EU_BASE';
  eu_countries := coalesce(eu_countries, array[]::text[]);

  return query
  with candidates as (
    select
      p.*,
      (
        p.region_code = 'CHECHNYA'
        or (
          p.latitude is not null
          and p.longitude is not null
          and (
            st_distance(
              st_setsrid(st_makepoint(p.longitude, p.latitude), 4326)::geography,
              st_setsrid(st_makepoint(chechnya_lng, chechnya_lat), 4326)::geography
            ) / 1000.0
          ) <= chechnya_radius_km
        )
      ) as is_chechnya,
      (p.country = any(eu_countries)) as is_eu
    from public.profiles p
  )
  select c.*
  from candidates c
  where c.id <> viewer
    and (
      p_genders is null
      or array_length(p_genders, 1) is null
      or c.gender = any(p_genders)
    )
    and (
      p_intentions is null
      or array_length(p_intentions, 1) is null
      or c.intention = any(p_intentions)
    )
    and (
      extract(year from age(current_date, c.birthday)) between p_min_age and p_max_age
    )
    and (
      origin_lat is null
      or origin_lng is null
      or c.latitude is null
      or c.longitude is null
      or (
        (
          st_distance(
            st_setsrid(st_makepoint(c.longitude, c.latitude), 4326)::geography,
            st_setsrid(st_makepoint(origin_lng, origin_lat), 4326)::geography
          ) / 1000.0
        ) between p_min_distance_km and p_max_distance_km
      )
    )
    and (
      not coalesce(c.hide_nearby, false)
      or origin_lat is null
      or origin_lng is null
      or c.latitude is null
      or c.longitude is null
      or (
        (
          st_distance(
            st_setsrid(st_makepoint(c.longitude, c.latitude), 4326)::geography,
            st_setsrid(st_makepoint(origin_lng, origin_lat), 4326)::geography
          ) / 1000.0
        ) >= coalesce(c.hide_nearby_radius, 15)
      )
    )
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = viewer and b.blocked_id = c.id)
         or (b.blocker_id = c.id and b.blocked_id = viewer)
    )
    and (
      region_filter = ''
      or (region_filter = 'chechnya' and c.is_chechnya)
      or (
        region_filter = 'russia'
        and (c.country = 'RU' or c.region_code = 'RU')
        and not c.is_chechnya
      )
      or (region_filter = 'europe' and c.is_eu)
      or (
        region_filter = 'other'
        and (
          c.country is null
          or (
            c.country <> 'RU'
            and not c.is_eu
          )
        )
        and not c.is_chechnya
      )
    )
  order by
    c.updated_at desc nulls last,
    coalesce(
      case
        when origin_lat is not null and origin_lng is not null and c.latitude is not null and c.longitude is not null
          then st_distance(
            st_setsrid(st_makepoint(c.longitude, c.latitude), 4326)::geography,
            st_setsrid(st_makepoint(origin_lng, origin_lat), 4326)::geography
          ) / 1000.0
        else null
      end,
      public.geo_distance_km(c.location_geohash, viewer_geohash)
    ) asc nulls last,
    c.id asc
  limit safe_limit
  offset safe_offset;
end;
$$;

grant execute on function public.get_discovery_profiles(
  integer,
  integer,
  text[],
  text[],
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision,
  text
) to authenticated;

--------------------------------------------------------------------------------
-- Recent Profiles: gleiche Logik, Sortierung nach last_active_at
--------------------------------------------------------------------------------

drop function if exists public.get_recent_profiles(
  integer,
  integer,
  text[],
  text[],
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision
);
drop function if exists public.get_recent_profiles(integer, integer);

create or replace function public.get_recent_profiles(
  p_limit integer,
  p_offset integer default 0,
  p_genders text[] default null,
  p_intentions text[] default null,
  p_min_age integer default 18,
  p_max_age integer default 99,
  p_min_distance_km double precision default 0,
  p_max_distance_km double precision default 130,
  p_origin_lat double precision default null,
  p_origin_lng double precision default null,
  p_region text default null
)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  safe_limit integer := greatest(coalesce(p_limit, 100), 1);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  viewer_geohash text;
  viewer_lat double precision;
  viewer_lng double precision;
  origin_lat double precision;
  origin_lng double precision;
  region_filter text := lower(coalesce(p_region, ''));
  eu_countries text[] := array[]::text[];
  chechnya_lat double precision := 43.3189;
  chechnya_lng double precision := 45.6981;
  chechnya_radius_km double precision := 130;
begin
  if viewer is null then
    return;
  end if;

  select location_geohash, latitude, longitude
  into viewer_geohash, viewer_lat, viewer_lng
  from public.profiles
  where id = viewer;

  origin_lat := coalesce(p_origin_lat, viewer_lat);
  origin_lng := coalesce(p_origin_lng, viewer_lng);

  select country_codes
  into eu_countries
  from public.region_sets
  where id = 'EU_BASE';
  eu_countries := coalesce(eu_countries, array[]::text[]);

  return query
  with candidates as (
    select
      p.*,
      (
        p.region_code = 'CHECHNYA'
        or (
          p.latitude is not null
          and p.longitude is not null
          and (
            st_distance(
              st_setsrid(st_makepoint(p.longitude, p.latitude), 4326)::geography,
              st_setsrid(st_makepoint(chechnya_lng, chechnya_lat), 4326)::geography
            ) / 1000.0
          ) <= chechnya_radius_km
        )
      ) as is_chechnya,
      (p.country = any(eu_countries)) as is_eu
    from public.profiles p
  )
  select c.*
  from candidates c
  where c.id <> viewer
    and (
      p_genders is null
      or array_length(p_genders, 1) is null
      or c.gender = any(p_genders)
    )
    and (
      p_intentions is null
      or array_length(p_intentions, 1) is null
      or c.intention = any(p_intentions)
    )
    and (
      extract(year from age(current_date, c.birthday)) between p_min_age and p_max_age
    )
    and (
      origin_lat is null
      or origin_lng is null
      or c.latitude is null
      or c.longitude is null
      or (
        (
          st_distance(
            st_setsrid(st_makepoint(c.longitude, c.latitude), 4326)::geography,
            st_setsrid(st_makepoint(origin_lng, origin_lat), 4326)::geography
          ) / 1000.0
        ) between p_min_distance_km and p_max_distance_km
      )
    )
    and (
      not coalesce(c.hide_nearby, false)
      or origin_lat is null
      or origin_lng is null
      or c.latitude is null
      or c.longitude is null
      or (
        (
          st_distance(
            st_setsrid(st_makepoint(c.longitude, c.latitude), 4326)::geography,
            st_setsrid(st_makepoint(origin_lng, origin_lat), 4326)::geography
          ) / 1000.0
        ) >= coalesce(c.hide_nearby_radius, 15)
      )
    )
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = viewer and b.blocked_id = c.id)
         or (b.blocker_id = c.id and b.blocked_id = viewer)
    )
    and (
      region_filter = ''
      or (region_filter = 'chechnya' and c.is_chechnya)
      or (
        region_filter = 'russia'
        and (c.country = 'RU' or c.region_code = 'RU')
        and not c.is_chechnya
      )
      or (region_filter = 'europe' and c.is_eu)
      or (
        region_filter = 'other'
        and (
          c.country is null
          or (
            c.country <> 'RU'
            and not c.is_eu
          )
        )
        and not c.is_chechnya
      )
    )
  order by
    c.last_active_at desc nulls last,
    coalesce(
      case
        when origin_lat is not null and origin_lng is not null and c.latitude is not null and c.longitude is not null
          then st_distance(
            st_setsrid(st_makepoint(c.longitude, c.latitude), 4326)::geography,
            st_setsrid(st_makepoint(origin_lng, origin_lat), 4326)::geography
          ) / 1000.0
        else null
      end,
      public.geo_distance_km(c.location_geohash, viewer_geohash)
    ) asc nulls last,
    c.id asc
  limit safe_limit
  offset safe_offset;
end;
$$;

grant execute on function public.get_recent_profiles(
  integer,
  integer,
  text[],
  text[],
  integer,
  integer,
  double precision,
  double precision,
  double precision,
  double precision,
  text
) to authenticated;
