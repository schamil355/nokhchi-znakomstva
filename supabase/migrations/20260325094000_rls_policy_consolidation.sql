--------------------------------------------------------------------------------
-- Consolidate permissive RLS policies to avoid duplicate per-role/actions
--------------------------------------------------------------------------------
do $$
begin
  ------------------------------------------------------------------------------
  -- blocks: separate write vs select (no duplicate select policies)
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks blocker manage'
  ) then
    drop policy "blocks blocker manage" on public.blocks;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks participants read'
  ) then
    drop policy "blocks participants read" on public.blocks;
  end if;

  create policy blocks_blocker_insert
    on public.blocks
    for insert
    with check (
      (select auth.uid()) = blocker_id
      or (select auth.role()) = 'service_role'
    );

  create policy blocks_blocker_update
    on public.blocks
    for update
    using (
      (select auth.uid()) = blocker_id
      or (select auth.role()) = 'service_role'
    )
    with check (
      (select auth.uid()) = blocker_id
      or (select auth.role()) = 'service_role'
    );

  create policy blocks_blocker_delete
    on public.blocks
    for delete
    using (
      (select auth.uid()) = blocker_id
      or (select auth.role()) = 'service_role'
    );

  create policy blocks_participants_select
    on public.blocks
    for select
    using (
      (select auth.uid()) = blocker_id
      or (select auth.uid()) = blocked_id
      or (select auth.role()) = 'service_role'
    );

  ------------------------------------------------------------------------------
  -- devices: one policy per action
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_manage_any_authenticated'
  ) then
    drop policy "devices_manage_any_authenticated" on public.devices;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_owner_manage'
  ) then
    drop policy "devices_owner_manage" on public.devices;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'users_manage_own_devices'
  ) then
    drop policy "users_manage_own_devices" on public.devices;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_owner_select'
  ) then
    drop policy "devices_owner_select" on public.devices;
  end if;

  create policy devices_write_insert_any
    on public.devices
    for insert
    to authenticated
    with check (true);

  create policy devices_write_update_any
    on public.devices
    for update
    to authenticated
    using (true)
    with check (true);

  create policy devices_write_delete_any
    on public.devices
    for delete
    to authenticated
    using (true);

  create policy devices_owner_select
    on public.devices
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

  ------------------------------------------------------------------------------
  -- feature_flags: admin policy only for write actions
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'write feature flags (admin)'
  ) then
    drop policy "write feature flags (admin)" on public.feature_flags;
  end if;

  create policy feature_flags_admin_insert
    on public.feature_flags
    for insert
    to authenticated
    with check ((select auth.role()) = 'service_role');

  create policy feature_flags_admin_update
    on public.feature_flags
    for update
    to authenticated
    using ((select auth.role()) = 'service_role')
    with check ((select auth.role()) = 'service_role');

  create policy feature_flags_admin_delete
    on public.feature_flags
    for delete
    to authenticated
    using ((select auth.role()) = 'service_role');

  ------------------------------------------------------------------------------
  -- photo_assets: remove duplicate owner policy
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'photo_assets' and policyname = 'owner manages photo_assets'
  ) then
    drop policy "owner manages photo_assets" on public.photo_assets;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'photo_assets' and policyname = 'photo_assets_owner_manage'
  ) then
    alter policy "photo_assets_owner_manage"
      on public.photo_assets
      using ((select auth.uid()) = owner_id)
      with check ((select auth.uid()) = owner_id);
  end if;

  ------------------------------------------------------------------------------
  -- photo_permissions: remove duplicate owner policy
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'photo_permissions' and policyname = 'owner manages photo_permissions'
  ) then
    drop policy "owner manages photo_permissions" on public.photo_permissions;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'photo_permissions' and policyname = 'photo_permissions_owner_manage'
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
end $$;
