--------------------------------------------------------------------------------
-- Direct chat hardening: sender binding, safer updates, indexes, last_message_at trigger
--------------------------------------------------------------------------------

-- Tighten insert policy: sender_id must match auth.uid() and be part of the conversation
drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert" on public.direct_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.direct_conversations dc
      where dc.id = conversation_id and auth.uid() in (dc.user_a, dc.user_b)
    )
  );

-- Prevent swapping participants while still allowing timestamp updates
drop policy if exists "direct_conversations_update" on public.direct_conversations;
create policy "direct_conversations_update" on public.direct_conversations
  for update
  using (auth.uid() in (user_a, user_b))
  with check (
    auth.uid() in (user_a, user_b)
    and user_a = (select dc.user_a from public.direct_conversations dc where dc.id = id)
    and user_b = (select dc.user_b from public.direct_conversations dc where dc.id = id)
  );

-- Indexes for faster fetches
create index if not exists direct_messages_conversation_created_idx
  on public.direct_messages (conversation_id, created_at desc);

create index if not exists direct_conversations_last_message_idx
  on public.direct_conversations (last_message_at desc nulls last, created_at desc);

--------------------------------------------------------------------------------
-- Keep last_message_at in sync on every message insert
--------------------------------------------------------------------------------
create or replace function public.direct_messages_set_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ts timestamptz;
begin
  ts := coalesce(new.created_at, timezone('utc', now()));

  update public.direct_conversations
    set last_message_at = greatest(coalesce(last_message_at, ts), ts)
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_direct_messages_set_last_message_at on public.direct_messages;
create trigger trg_direct_messages_set_last_message_at
  after insert on public.direct_messages
  for each row
  execute function public.direct_messages_set_last_message_at();
