--------------------------------------------------------------------------------
-- photo_permissions RLS: avoid per-row auth.uid() evaluation
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_policies
    where policyname = 'photo_permissions_owner_manage'
      and schemaname = 'public'
      and tablename = 'photo_permissions'
  ) then
    alter policy "photo_permissions_owner_manage"
      on public.photo_permissions
      using (
        (select auth.uid()) = (
          select owner_id from public.photo_assets where id = photo_id
        )
      )
      with check (
        (select auth.uid()) = (
          select owner_id from public.photo_assets where id = photo_id
        )
      );
  end if;

  if exists (
    select 1
    from pg_policies
    where policyname = 'owner manages photo_permissions'
      and schemaname = 'public'
      and tablename = 'photo_permissions'
  ) then
    alter policy "owner manages photo_permissions"
      on public.photo_permissions
      using (
        (select auth.uid()) = (
          select owner_id from public.photo_assets where id = photo_id
        )
      )
      with check (
        (select auth.uid()) = (
          select owner_id from public.photo_assets where id = photo_id
        )
      );
  end if;
end $$;
