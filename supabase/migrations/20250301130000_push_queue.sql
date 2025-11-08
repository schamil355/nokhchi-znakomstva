--------------------------------------------------------------------------------
-- Push queue table, RLS and notification triggers
--------------------------------------------------------------------------------

create table if not exists public.push_queue (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('match.new','message.new')),
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

--------------------------------------------------------------------------------
-- Helper functions to enqueue push jobs
--------------------------------------------------------------------------------

create or replace function public.enqueue_match_push()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.push_queue(user_id, type, payload)
  select uid, 'match.new', jsonb_build_object('match_id', new.id, 'created_at', new.created_at)
  from (values (new.user_a), (new.user_b)) as t(uid)
  where uid is not null;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_matches_push') then
    drop trigger trg_matches_push on public.matches;
  end if;
  create trigger trg_matches_push
    after insert on public.matches
    for each row
    execute function public.enqueue_match_push();
end
$$;

create or replace function public.enqueue_message_push()
returns trigger
language plpgsql
security definer
as $$
declare
  recipient uuid;
  preview text;
begin
  select case
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
      'preview', preview
    )
  );

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_messages_push') then
    drop trigger trg_messages_push on public.messages;
  end if;
  create trigger trg_messages_push
    after insert on public.messages
    for each row
    execute function public.enqueue_message_push();
end
$$;
