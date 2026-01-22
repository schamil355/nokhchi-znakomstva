--------------------------------------------------------------------------------
-- Normalize profile genders to binary values and enforce constraint
--------------------------------------------------------------------------------

update public.profiles
set gender = lower(gender)
where gender is not null;

update public.profiles
set gender = 'male'
where gender is not null
  and gender not in ('female', 'male');

alter table public.profiles
  drop constraint if exists profiles_gender_check,
  add constraint profiles_gender_check
    check (gender is null or gender in ('female', 'male'));
