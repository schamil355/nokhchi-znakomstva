-- Keep vouch_count consistent for verified profiles (minimum 1)

update public.profiles
set vouch_count = greatest(coalesce(vouch_count, 0), 1)
where verified is true;

create or replace function public.sync_vouch_count_from_verified()
returns trigger
language plpgsql
as $$
begin
  if new.verified is true and coalesce(new.vouch_count, 0) < 1 then
    new.vouch_count := 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_vouch_count_from_verified on public.profiles;
create trigger trg_profiles_vouch_count_from_verified
before insert or update of verified, vouch_count on public.profiles
for each row
execute function public.sync_vouch_count_from_verified();
