--------------------------------------------------------------------------------
-- messages RLS: avoid per-row auth.uid() evaluation for receiver read/update
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_policies
    where policyname = 'messages receiver update read'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter policy "messages receiver update read"
      on public.messages
      using (
        (select auth.uid()) is not null
        and (select auth.uid()) <> sender_id
        and exists (
          select 1
          from public.matches m
          where m.id = messages.match_id
            and (select auth.uid()) in (m.user_a, m.user_b)
        )
      )
      with check (
        (select auth.uid()) is not null
        and (select auth.uid()) <> sender_id
        and exists (
          select 1
          from public.matches m
          where m.id = messages.match_id
            and (select auth.uid()) in (m.user_a, m.user_b)
        )
      );
  end if;
end $$;
