-- Profiles: add vouch count for trusted filter
alter table public.profiles
  add column if not exists vouch_count integer not null default 0;

create index if not exists profiles_vouch_count_idx
  on public.profiles (vouch_count);
