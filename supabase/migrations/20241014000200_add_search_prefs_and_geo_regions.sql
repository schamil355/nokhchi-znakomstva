-- Enable PostGIS (safe if already installed)
create extension if not exists postgis;

--------------------------------------------------------------------------------
-- 1) Enum for search preferences
--------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'search_region_mode') then
    create type search_region_mode as enum ('NEARBY', 'CHECHNYA', 'EUROPE');
  end if;
end $$;

--------------------------------------------------------------------------------
-- 2) Profiles country/region columns (ensure table exists)
--------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists country char(2),
  add column if not exists region_code text;

--------------------------------------------------------------------------------
-- 3) Search preferences table
--------------------------------------------------------------------------------
create table if not exists public.search_prefs (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  region_mode search_region_mode not null default 'NEARBY',
  updated_at  timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_search_prefs_updated_at on public.search_prefs;
create trigger trg_search_prefs_updated_at
before update on public.search_prefs
for each row
execute function public.set_updated_at();

alter table public.search_prefs enable row level security;

drop policy if exists "search_prefs owner select" on public.search_prefs;
drop policy if exists "search_prefs owner insert" on public.search_prefs;
drop policy if exists "search_prefs owner update" on public.search_prefs;

create policy "search_prefs owner select"
  on public.search_prefs
  for select
  using (auth.uid() = user_id or auth.role() = 'service_role');

create policy "search_prefs owner insert"
  on public.search_prefs
  for insert
  with check (auth.uid() = user_id or auth.role() = 'service_role');

create policy "search_prefs owner update"
  on public.search_prefs
  for update
  using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (auth.uid() = user_id or auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- 4) Region sets
--------------------------------------------------------------------------------
create table if not exists public.region_sets (
  id            text primary key,
  country_codes text[] not null
);

insert into public.region_sets (id, country_codes)
values ('EU_BASE', array['FR','DE','AT','BE','NO'])
on conflict (id)
  do update set country_codes = excluded.country_codes;

--------------------------------------------------------------------------------
-- 5) Geo regions
--------------------------------------------------------------------------------
create table if not exists public.geo_regions (
  id         text primary key,
  name       text not null,
  geom       geography(multipolygon, 4326) not null,
  centroid   geography(point, 4326) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists geo_regions_geom_idx
  on public.geo_regions
  using gist (geom);

insert into public.geo_regions (id, name, geom, centroid)
values (
  'CHECHNYA',
  'Chechnya (approx.)',
  (
    st_multi(
        st_buffer(
        st_setsrid(st_makepoint(45.694, 43.317), 4326)::geography,
        130000
      )::geometry
    )::geography
  ),
  st_setsrid(st_makepoint(45.694, 43.317), 4326)::geography
)
on conflict (id) do update
  set geom     = excluded.geom,
      centroid = excluded.centroid,
      name     = excluded.name;

--------------------------------------------------------------------------------
-- 6) Grants
--------------------------------------------------------------------------------
grant usage on type search_region_mode to anon, authenticated, service_role;

grant select, insert, update, delete on public.search_prefs to authenticated, service_role;
grant select on public.region_sets to anon, authenticated, service_role;
grant select on public.geo_regions to anon, authenticated, service_role;

grant all privileges on public.search_prefs, public.region_sets, public.geo_regions to service_role;
