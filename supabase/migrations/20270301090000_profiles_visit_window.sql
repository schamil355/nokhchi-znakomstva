--------------------------------------------------------------------------------
-- Profiles: optional visit window for diaspora travel planning
--------------------------------------------------------------------------------

alter table public.profiles
  add column if not exists visit_region text,
  add column if not exists visit_start date,
  add column if not exists visit_end date;

create index if not exists profiles_visit_region_idx
  on public.profiles (visit_region);

create index if not exists profiles_visit_window_idx
  on public.profiles (visit_start, visit_end);
