--------------------------------------------------------------------------------
-- Collapse birthdate into birthday and drop redundant column
--------------------------------------------------------------------------------

-- Ensure birthday is filled from legacy birthdate
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'birthdate'
  ) then
    update public.profiles
    set birthday = coalesce(birthday, birthdate)
    where birthday is null and birthdate is not null;
  end if;
end
$$;

-- Drop legacy column
alter table public.profiles
  drop column if exists birthdate;
