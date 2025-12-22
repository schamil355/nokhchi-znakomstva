--------------------------------------------------------------------------------
-- Admin: aggregierte Kennzahlen inkl. Plattform-Verteilung (iOS/Android)
--------------------------------------------------------------------------------

create or replace function public.admin_profile_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
with base as (
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
      when latitude is not null
        and longitude is not null
        and st_distance(
          st_setsrid(st_makepoint(longitude, latitude), 4326)::geography,
          st_setsrid(st_makepoint(45.6981, 43.3189), 4326)::geography
        ) <= 130000
        then 'chechnya'
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
),
platform_counts as (
  select
    platform,
    count(distinct user_id)::bigint as count
  from public.devices
  group by platform
)
select jsonb_build_object(
  'gender', (select coalesce(jsonb_object_agg(gender, count), '{}'::jsonb) from gender_counts),
  'incognito', (select coalesce(count, 0) from incognito),
  'regions', (select coalesce(jsonb_object_agg(region, count), '{}'::jsonb) from region_counts),
  'top_female', (select coalesce(payload, '[]'::jsonb) from top_female),
  'top_male', (select coalesce(payload, '[]'::jsonb) from top_male),
  'platform', (
    select coalesce(jsonb_object_agg(platform, count), '{}'::jsonb)
    from platform_counts
  )
);
$$;

grant execute on function public.admin_profile_metrics() to service_role;
