--------------------------------------------------------------------------------
-- photo_assets RLS: avoid per-row auth.uid() evaluation
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_policies
    where policyname = 'photo_assets_owner_manage'
      and schemaname = 'public'
      and tablename = 'photo_assets'
  ) then
    alter policy "photo_assets_owner_manage"
      on public.photo_assets
      using ((select auth.uid()) = owner_id)
      with check ((select auth.uid()) = owner_id);
  end if;
end $$;
