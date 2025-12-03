--------------------------------------------------------------------------------
-- Keep profiles.id and profiles.user_id in sync for client inserts
--------------------------------------------------------------------------------
create or replace function public.sync_profile_ids()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and new.id is not null then
    new.user_id := new.id;
  elsif new.id is null and new.user_id is not null then
    new.id := new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_ids on public.profiles;
create trigger trg_profiles_sync_ids
before insert or update on public.profiles
for each row
execute function public.sync_profile_ids();
