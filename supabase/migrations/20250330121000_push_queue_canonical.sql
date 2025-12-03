--------------------------------------------------------------------------------
-- Canonical push_queue schema (triggers, RLS, type constraint)
-- Consolidates earlier duplicate migrations by recreating functions/triggers
-- and ensuring the type constraint includes test pushes.
--------------------------------------------------------------------------------

create table if not exists public.push_queue (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null,
  scheduled_at timestamptz not null default timezone('utc', now()),
  attempts integer not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists push_queue_scheduled_idx
  on public.push_queue (processed_at, scheduled_at);

alter table public.push_queue enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_queue'
      and policyname = 'push_queue_service_access'
  ) then
    create policy "push_queue_service_access"
      on public.push_queue
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end
$$;

-- Canonical constraint: allow match/message/test jobs.
alter table public.push_queue
  drop constraint if exists push_queue_type_check;

alter table public.push_queue
  add constraint push_queue_type_check
    check (type in ('match.new','message.new','test.push'));

--------------------------------------------------------------------------------
-- Helper: enqueue push rows whenever a new match is created
--------------------------------------------------------------------------------

create or replace function public.enqueue_match_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_user uuid;
  avatar_path text;
begin
  -- push row for each participant, include opposite user and avatar_path
  insert into public.push_queue(user_id, type, payload)
  select
    uid,
    'match.new',
    jsonb_build_object(
      'match_id', new.id,
      'created_at', new.created_at,
      'other_user_id', other_user,
      'avatar_path', avatar_path
    )
  from (
    select new.user_a as uid, new.user_b as other_user
    union all
    select new.user_b as uid, new.user_a as other_user
  ) as t
  where uid is not null
  -- lookup avatar_path per other_user
  cross join lateral (
    select
      coalesce(
        p.primary_photo_path,
        (p.photos->0->>'url')
      ) as avatar_path
    from public.profiles p
    where p.id = t.other_user
    limit 1
  ) as p;

  return new;
end;
$$;

drop trigger if exists trg_matches_push on public.matches;
create trigger trg_matches_push
  after insert on public.matches
  for each row
  execute function public.enqueue_match_push();

--------------------------------------------------------------------------------
-- Helper: enqueue push rows when a new chat message arrives
--------------------------------------------------------------------------------

create or replace function public.enqueue_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  preview text;
begin
  select
    case
      when new.sender_id = m.user_a then m.user_b
      else m.user_a
    end
  into recipient
  from public.matches m
  where m.id = new.match_id
    and coalesce(m.is_active, true)
  limit 1;

  if recipient is null then
    return new;
  end if;

  preview := substring(coalesce(new.content, '') for 140);

  insert into public.push_queue(user_id, type, payload)
  values (
    recipient,
    'message.new',
    jsonb_build_object(
      'match_id', new.match_id,
      'message_id', new.id,
      'preview', preview,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_messages_push on public.messages;
create trigger trg_messages_push
  after insert on public.messages
  for each row
  execute function public.enqueue_message_push();
