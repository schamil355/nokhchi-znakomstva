--------------------------------------------------------------------------------
-- Improve Ingushetia detection: polygon-based instead of bounding box
--------------------------------------------------------------------------------

-- Rough polygon for Ingushetia (lon lat, SRID 4326)
-- This is more precise than the previous bounding box but still a simplified outline.
-- Source: approximate hand-tuned ring around Ingushetia bounds.
with ingushetia_geom as (
  select st_setsrid(
    st_geomfromtext(
      'POLYGON((
        44.30 43.30,
        44.35 43.55,
        44.60 43.70,
        44.90 43.70,
        45.15 43.50,
        45.25 43.20,
        45.25 42.85,
        45.00 42.60,
        44.70 42.55,
        44.45 42.65,
        44.30 42.90,
        44.25 43.10,
        44.30 43.30
      ))'
    ),
    4326
  ) as geom
)
-- Recreate admin_profile_metrics with polygon check
select public.admin_profile_metrics();

drop function if exists public.admin_profile_metrics();
create or replace function public.admin_profile_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
with ing as (
  select st_setsrid(
    st_geomfromtext(
      'POLYGON((
        44.30 43.30,
        44.35 43.55,
        44.60 43.70,
        44.90 43.70,
        45.15 43.50,
        45.25 43.20,
        45.25 42.85,
        45.00 42.60,
        44.70 42.55,
        44.45 42.65,
        44.30 42.90,
        44.25 43.10,
        44.30 43.30
      ))'
    ),
    4326
  ) as geom
),
base as (
  select
    user_id,
    display_name,
    gender,
    coalesce(is_incognito, false) as is_incognito,
    country,
    latitude,
    longitude
  from public.profiles
),
gender_counts as (
  select coalesce(gender, 'unknown') as gender, count(*)::bigint as count
  from base
  group by 1
),
incognito as (
  select count(*)::bigint as count
  from base
  where is_incognito
),
region_labels as (
  select
    case
      when latitude is not null and longitude is not null
        and st_contains((select geom from ing), st_setsrid(st_makepoint(longitude, latitude), 4326)) then 'ingushetia'
      when latitude is not null and longitude is not null
        and st_distance(
          st_setsrid(st_makepoint(longitude, latitude), 4326)::geography,
          st_setsrid(st_makepoint(45.6981, 43.3189), 4326)::geography
        ) <= 130000 then 'chechnya'
      when upper(coalesce(country, '')) = 'RU' then 'russia'
      when upper(coalesce(country, '')) = any (
        array[
          'AL','AD','AM','AT','AZ','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR',
          'GE','DE','GR','HU','IS','IE','IT','KZ','XK','LV','LI','LT','LU','MT','MD','MC',
          'ME','NL','MK','NO','PL','PT','RO','SM','RS','SK','SI','ES','SE','CH','TR','UA',
          'GB','VA'
        ]
      ) then 'europe'
      else 'other'
    end as region
  from base
),
region_counts as (
  select region, count(*)::bigint as count
  from region_labels
  group by region
),
likes_ranked as (
  select
    b.user_id,
    b.display_name,
    coalesce(b.gender, 'unknown') as gender,
    count(l.*)::bigint as like_count
  from base b
  left join public.likes l
    on l.likee_id = b.user_id
  group by b.user_id, b.display_name, b.gender
),
top_female as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'display_name', display_name,
        'likes', like_count
      )
      order by like_count desc nulls last
    ),
    '[]'::jsonb
  ) as payload
  from (
    select *
    from likes_ranked
    where gender = 'female' and like_count > 0
    order by like_count desc nulls last
    limit 100
  ) as t
),
top_male as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'display_name', display_name,
        'likes', like_count
      )
      order by like_count desc nulls last
    ),
    '[]'::jsonb
  ) as payload
  from (
    select *
    from likes_ranked
    where gender = 'male' and like_count > 0
    order by like_count desc nulls last
    limit 100
  ) as t
)
select jsonb_build_object(
  'gender', (select coalesce(jsonb_object_agg(gender, count), '{}'::jsonb) from gender_counts),
  'incognito', (select coalesce(count, 0) from incognito),
  'regions', (select coalesce(jsonb_object_agg(region, count), '{}'::jsonb) from region_counts),
  'top_female', (select coalesce(payload, '[]'::jsonb) from top_female),
  'top_male', (select coalesce(payload, '[]'::jsonb) from top_male)
);
$$;

grant execute on function public.admin_profile_metrics() to service_role;

--------------------------------------------------------------------------------
-- Update Ingushetia signup event trigger to use polygon
--------------------------------------------------------------------------------

drop trigger if exists trg_profiles_ingushetia_signup on public.profiles;
drop function if exists public.log_ingushetia_signup();
create or replace function public.log_ingushetia_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lat double precision := new.latitude;
  lng double precision := new.longitude;
  is_ingushetia boolean := false;
  ing geometry;
begin
  select st_setsrid(
    st_geomfromtext(
      'POLYGON((
        44.30 43.30,
        44.35 43.55,
        44.60 43.70,
        44.90 43.70,
        45.15 43.50,
        45.25 43.20,
        45.25 42.85,
        45.00 42.60,
        44.70 42.55,
        44.45 42.65,
        44.30 42.90,
        44.25 43.10,
        44.30 43.30
      ))'
    ),
    4326
  ) into ing;

  if lat is not null and lng is not null then
    if st_contains(ing, st_setsrid(st_makepoint(lng, lat), 4326)) then
      is_ingushetia := true;
    end if;
  end if;

  if is_ingushetia then
    insert into public.events (user_id, name, props)
    values (new.id, 'ingushetia_signup', jsonb_build_object('latitude', lat, 'longitude', lng))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_ingushetia_signup
  after insert on public.profiles
  for each row
  execute function public.log_ingushetia_signup();
