-- Track when a user has completed registration (verification required)
-- Backfill for already verified profiles and auto-set on verification updates.

alter table public.profiles
  add column if not exists registration_completed_at timestamptz;

update public.profiles
set registration_completed_at = coalesce(verified_at, timezone('utc', now()))
where registration_completed_at is null
  and (verified is true or verified_at is not null);

create or replace function public.set_registration_completed_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.registration_completed_at is null then
    if new.verified is true or new.verified_at is not null then
      new.registration_completed_at := coalesce(new.verified_at, timezone('utc', now()));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_registration_completed on public.profiles;
create trigger trg_profiles_registration_completed
before insert or update of verified, verified_at on public.profiles
for each row
execute function public.set_registration_completed_at();
