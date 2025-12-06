--------------------------------------------------------------------------------
-- Fix enqueue_test_push to use profile id (matches/push_queue use profiles.id)
--------------------------------------------------------------------------------

create or replace function public.enqueue_test_push()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  profile_id uuid;
begin
  if uid is null then
    raise exception 'auth.uid is required';
  end if;

  select id into profile_id
  from public.profiles
  where id = uid
  limit 1;

  if profile_id is null then
    insert into public.profiles(id, user_id, created_at)
    values (uid, uid, timezone('utc', now()))
    on conflict (id) do nothing;

    select id into profile_id
    from public.profiles
    where id = uid
    limit 1;
  end if;

  if profile_id is null then
    raise exception 'PROFILE_NOT_FOUND_FOR_USER';
  end if;

  insert into public.push_queue(user_id, type, payload)
  values (
    profile_id,
    'test.push',
    jsonb_build_object(
      'message', 'Test notification from onboarding dev tools',
      'created_at', timezone('utc', now())
    )
  );
end;
$$;
