-- Direct chat tables
create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz null
);

create unique index if not exists direct_pair_unique on public.direct_conversations (least(user_a, user_b), greatest(user_a, user_b));

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz null
);

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "direct_conversations_select" on public.direct_conversations;
create policy "direct_conversations_select" on public.direct_conversations
  for select using (auth.uid() in (user_a, user_b));

drop policy if exists "direct_conversations_insert" on public.direct_conversations;
create policy "direct_conversations_insert" on public.direct_conversations
  for insert with check (auth.uid() in (user_a, user_b));

drop policy if exists "direct_conversations_update" on public.direct_conversations;
create policy "direct_conversations_update" on public.direct_conversations
  for update using (auth.uid() in (user_a, user_b));

drop policy if exists "direct_messages_select" on public.direct_messages;
create policy "direct_messages_select" on public.direct_messages
  for select using (
    exists (
      select 1 from public.direct_conversations dc
      where dc.id = conversation_id and auth.uid() in (dc.user_a, dc.user_b)
    )
  );

drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert" on public.direct_messages
  for insert with check (
    exists (
      select 1 from public.direct_conversations dc
      where dc.id = conversation_id and auth.uid() in (dc.user_a, dc.user_b)
    )
  );

-- Realtime subscriptions (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_conversations'
  ) then
    alter publication supabase_realtime add table public.direct_conversations;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
