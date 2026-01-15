alter table public.profiles
  add column if not exists relationship_compass jsonb;
