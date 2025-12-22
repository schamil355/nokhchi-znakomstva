-------------------------------------------------------------------------------
-- RLS performance: wrap auth.uid() in SELECT; consolidate likes select policy
-------------------------------------------------------------------------------

-- user_bans service role manage
drop policy if exists "user_bans service role manage" on public.user_bans;
create policy "user_bans service role manage"
  on public.user_bans
  for all
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

-- likes: consolidate select policy for authenticated, with auth.uid() wrapped
drop policy if exists "likes self rw" on public.likes;
drop policy if exists "likes_select_by_likee" on public.likes;
drop policy if exists "likes select authenticated" on public.likes;
create policy "likes select authenticated"
  on public.likes
  for select
  to authenticated
  using (
    (select auth.uid()) = liker_id
    or (select auth.uid()) = likee_id
  );

-- direct_conversations select/insert/update
drop policy if exists "direct_conversations_select" on public.direct_conversations;
create policy "direct_conversations_select"
  on public.direct_conversations
  for select
  using ((select auth.uid()) in (user_a, user_b));

drop policy if exists "direct_conversations_insert" on public.direct_conversations;
create policy "direct_conversations_insert"
  on public.direct_conversations
  for insert
  with check ((select auth.uid()) in (user_a, user_b));

drop policy if exists "direct_conversations_update" on public.direct_conversations;
create policy "direct_conversations_update"
  on public.direct_conversations
  for update
  using ((select auth.uid()) in (user_a, user_b));

-- direct_messages select/insert
drop policy if exists "direct_messages_select" on public.direct_messages;
create policy "direct_messages_select"
  on public.direct_messages
  for select
  using (
    exists (
      select 1 from public.direct_conversations dc
      where dc.id = direct_messages.conversation_id
        and (select auth.uid()) in (dc.user_a, dc.user_b)
    )
  );

drop policy if exists "direct_messages_insert" on public.direct_messages;
create policy "direct_messages_insert"
  on public.direct_messages
  for insert
  with check (
    exists (
      select 1 from public.direct_conversations dc
      where dc.id = conversation_id
        and (select auth.uid()) in (dc.user_a, dc.user_b)
    )
  );
