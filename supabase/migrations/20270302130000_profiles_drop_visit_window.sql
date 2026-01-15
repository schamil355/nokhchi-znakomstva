-- Remove visit window fields (homecoming)

drop index if exists public.profiles_visit_region_idx;
drop index if exists public.profiles_visit_window_idx;

alter table public.profiles
  drop column if exists visit_region,
  drop column if exists visit_start,
  drop column if exists visit_end;
