--------------------------------------------------------------------------------
-- photo_assets RLS: avoid per-row auth.uid() evaluation for "owner manages" policy
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_policies
    where policyname = 'owner manages photo_assets'
      and schemaname = 'public'
      and tablename = 'photo_assets'
  ) then
    alter policy "owner manages photo_assets"
      on public.photo_assets
      using ((select auth.uid()) = owner_id)
      with check ((select auth.uid()) = owner_id);
  end if;
end $$;
