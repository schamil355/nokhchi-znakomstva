--------------------------------------------------------------------------------
-- photo_permissions RLS: avoid per-row auth.uid() evaluation for viewer select
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_policies
    where policyname = 'photo_permissions_viewer_select'
      and schemaname = 'public'
      and tablename = 'photo_permissions'
  ) then
    alter policy "photo_permissions_viewer_select"
      on public.photo_permissions
      using ((select auth.uid()) = viewer_id);
  end if;
end $$;
