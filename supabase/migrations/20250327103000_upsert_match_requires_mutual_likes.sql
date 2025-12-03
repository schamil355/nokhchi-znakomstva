--------------------------------------------------------------------------------
-- Ensure upsert_match only creates matches when both sides liked each other
--------------------------------------------------------------------------------

create or replace function public.upsert_match(a uuid, b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ua uuid := least(a, b);
  ub uuid := greatest(a, b);
  match_id uuid;
begin
  if a is null or b is null or a = b then
    return null;
  end if;

  if not exists (
    select 1
    from public.likes l
    where l.liker_id = a
      and l.likee_id = b
  ) then
    return null;
  end if;

  if not exists (
    select 1
    from public.likes l
    where l.liker_id = b
      and l.likee_id = a
  ) then
    return null;
  end if;

  insert into public.matches(user_a, user_b)
  values (ua, ub)
  on conflict on constraint matches_pair_unique
  do update set user_a = public.matches.user_a
  returning id into match_id;

  return match_id;
end;
$$;
