-- Restore missing RLS policies for likes (insert/update/delete) after select-only change.
-- Allows the authenticated user to insert/update/delete their own like rows.

drop policy if exists "likes insert" on public.likes;
create policy "likes insert"
  on public.likes
  for insert
  to authenticated
  with check ((select auth.uid()) = liker_id);

drop policy if exists "likes update" on public.likes;
create policy "likes update"
  on public.likes
  for update
  to authenticated
  using ((select auth.uid()) = liker_id)
  with check ((select auth.uid()) = liker_id);

drop policy if exists "likes delete" on public.likes;
create policy "likes delete"
  on public.likes
  for delete
  to authenticated
  using ((select auth.uid()) = liker_id);
