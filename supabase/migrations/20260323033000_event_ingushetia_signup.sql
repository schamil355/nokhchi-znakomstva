--------------------------------------------------------------------------------
-- Log event when a new profile is created in (approx.) Ingushetia
--------------------------------------------------------------------------------

create or replace function public.log_ingushetia_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lat double precision := new.latitude;
  lng double precision := new.longitude;
  is_ingushetia boolean := false;
begin
  -- Rough bounding box for Ingushetia (approx):
  -- lat: 42.4 .. 43.6, lon: 44.1 .. 45.5
  if lat is not null and lng is not null then
    if lat between 42.4 and 43.6 and lng between 44.1 and 45.5 then
      is_ingushetia := true;
    end if;
  end if;

  if is_ingushetia then
    insert into public.events (user_id, name, props)
    values (new.id, 'ingushetia_signup', jsonb_build_object('latitude', lat, 'longitude', lng))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_ingushetia_signup on public.profiles;
create trigger trg_profiles_ingushetia_signup
  after insert on public.profiles
  for each row
  execute function public.log_ingushetia_signup();

