--------------------------------------------------------------------------------
-- Matches view and helper functions
--------------------------------------------------------------------------------

create or replace view public.matches_v as
select
  m.id,
  m.user_a,
  m.user_b,
  array[least(m.user_a, m.user_b), greatest(m.user_a, m.user_b)] as participants,
  m.created_at,
  (
    select max(created_at)
    from public.messages msg
    where msg.match_id = m.id
  ) as last_message_at,
  true as is_active
from public.matches m;

--------------------------------------------------------------------------------
-- Helper: upsert_match (returns existing or newly created match id)
--------------------------------------------------------------------------------

create or replace function public.upsert_match(a uuid, b uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  ua uuid := least(a, b);
  ub uuid := greatest(a, b);
  match_id uuid;
begin
  insert into public.matches(user_a, user_b)
  values (ua, ub)
  on conflict on constraint matches_pair_unique
  do update set user_a = public.matches.user_a
  returning id into match_id;

  return match_id;
end;
$$;

--------------------------------------------------------------------------------
-- Helper: is_matched (checks if two users are already matched)
--------------------------------------------------------------------------------

create or replace function public.is_matched(a uuid, b uuid)
returns boolean
language sql
stable
security definer
as $$
select exists(
  select 1
  from public.matches m
  where (m.user_a = least(a, b) and m.user_b = greatest(a, b))
);
$$;

--------------------------------------------------------------------------------
-- RLS guard for matches (select only by participants)
--------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'matches participants r'
  ) then
    create policy "matches participants r"
      on public.matches
      for select
      using (auth.uid() in (user_a, user_b));
  end if;
end $$;
