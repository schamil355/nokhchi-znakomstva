--------------------------------------------------------------------------------
-- Extend admin_profile_metrics with explicit Ingushetia bucket
--------------------------------------------------------------------------------

create or replace function public.admin_profile_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
with base as (
  select
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
      -- Ingushetia approx. box
      when latitude is not null and longitude is not null
        and latitude between 42.4 and 43.6
        and longitude between 44.1 and 45.5 then 'ingushetia'
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
)
select jsonb_build_object(
  'gender', (select coalesce(jsonb_object_agg(gender, count), '{}'::jsonb) from gender_counts),
  'incognito', (select coalesce(count, 0) from incognito),
  'regions', (select coalesce(jsonb_object_agg(region, count), '{}'::jsonb) from region_counts)
);
$$;

grant execute on function public.admin_profile_metrics() to service_role;

