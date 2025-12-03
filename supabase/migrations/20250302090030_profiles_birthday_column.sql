--------------------------------------------------------------------------------
-- Align profiles schema with mobile app expectations (birthday column)
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists birthday date;

update public.profiles
set birthday = coalesce(birthday, birthdate)
where birthdate is not null;
