--------------------------------------------------------------------------------
-- Indexes to support regional candidate lookups
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'location'
  ) then
    execute 'create index if not exists profiles_location_gist_idx on public.profiles using gist (location)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'country'
  ) then
    execute 'create index if not exists profiles_country_idx on public.profiles (country)';
  end if;
end
$$;

--------------------------------------------------------------------------------
-- Ensure profiles schema matches public profile view requirements
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists birthdate date,
  add column if not exists gender text,
  add column if not exists orientation text,
  add column if not exists interests text[],
  add column if not exists photos jsonb[],
  add column if not exists location geography(point, 4326),
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists last_active_at timestamptz,
  add column if not exists feedback_score numeric;

create or replace view public.public_profiles as
select
  p.id,
  p.display_name,
  p.bio,
  p.birthdate,
  p.gender,
  p.orientation,
  p.interests,
  p.photos,
  p.location,
  p.created_at,
  p.updated_at,
  p.last_active_at,
  p.feedback_score
from public.profiles p;

--------------------------------------------------------------------------------
-- RPC: get_candidates_region
--------------------------------------------------------------------------------
create or replace function public.get_candidates_region(
  p_viewer uuid,
  p_mode search_region_mode default 'NEARBY',
  p_limit integer default 100
)
returns setof public.public_profiles
language plpgsql
set search_path = public
security definer
as $$
declare
  v_limit integer := greatest(coalesce(p_limit, 100), 1);
  v_mode search_region_mode := coalesce(p_mode, 'NEARBY');
  v_viewer_location geography;
  v_eu_countries text[];
  v_has_rank boolean := false;
begin
  -- Fetch viewer location so we can run spatial filters
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

grant execute on function public.get_candidates_region(uuid, search_region_mode, integer)
  to authenticated;
