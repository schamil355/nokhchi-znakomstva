-------------------------------------------------------------------------------
-- Align discovery RPC with mobile client (filters + distance + incognito/blocks)
-------------------------------------------------------------------------------

-- Replace legacy signature without filters/distance handling.
drop function if exists public.get_discovery_profiles(integer, integer);

create or replace function public.get_discovery_profiles(
  p_limit integer default 50,
  p_offset integer default 0,
  p_genders text[] default null,
  p_intentions text[] default null,
  p_min_age integer default 18,
  p_max_age integer default 99,
  p_min_distance_km numeric default 0,
  p_max_distance_km numeric default 130,
  p_origin_lat double precision default null,
  p_origin_lng double precision default null
)
returns setof public.profiles
language plpgsql
stable
security invoker
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
  with base as (
    select
      p.*,
      extract(year from age(current_date, p.birthday)) as age_years,
      case
        when p.latitude is not null
          and p.longitude is not null
          and p_origin_lat is not null
          and p_origin_lng is not null
        then (
          st_distanceSphere(
            st_makepoint(p_origin_lng, p_origin_lat),
            st_makepoint(p.longitude, p.latitude)
          ) / 1000.0
        )
        else null
      end as distance_km
    from public.profiles p
    where p.id <> viewer
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = viewer
          and b.blocked_id = p.id
      )
      and (
        not coalesce(p.is_incognito, false)
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
  )
  select p.*
  from base p
  where (p_genders is null or array_length(p_genders, 1) is null or p.gender = any(p_genders))
    and (p_intentions is null or array_length(p_intentions, 1) is null or p.intention = any(p_intentions))
    and (p_min_age is null or p.age_years is null or p.age_years >= p_min_age)
    and (p_max_age is null or p.age_years is null or p.age_years <= p_max_age)
    and (
      p_origin_lat is null
      or p_origin_lng is null
      or p.distance_km is null
      or (coalesce(p_min_distance_km, 0) <= p.distance_km and p.distance_km <= coalesce(p_max_distance_km, 130000))
    )
  order by
    case
      when p_origin_lat is not null and p_origin_lng is not null and p.distance_km is not null then 0
      else 1
    end,
    p.distance_km nulls last,
    p.updated_at desc nulls last,
    p.created_at desc
  limit safe_limit
  offset safe_offset;
end;
$$;

