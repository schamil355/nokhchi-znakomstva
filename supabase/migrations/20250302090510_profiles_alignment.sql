--------------------------------------------------------------------------------
-- Ensure profiles table matches mobile app schema expectations
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists user_id uuid,
  add column if not exists intention text,
  add column if not exists is_premium boolean not null default false;

update public.profiles
set user_id = coalesce(user_id, id)
where user_id is null;

alter table public.profiles
  alter column user_id set not null;

create unique index if not exists profiles_user_id_idx on public.profiles(user_id);

do $$
begin
  begin
    alter table public.profiles
      add constraint profiles_user_id_unique unique (user_id);
  exception
    when duplicate_table then
      null;
  end;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_user_id_fkey foreign key (user_id)
        references auth.users(id) on delete cascade;
  end if;
end $$;
