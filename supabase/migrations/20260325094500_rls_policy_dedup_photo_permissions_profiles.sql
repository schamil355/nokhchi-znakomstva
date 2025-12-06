--------------------------------------------------------------------------------
-- Deduplicate RLS policies: photo_permissions select + profiles select/update
--------------------------------------------------------------------------------
do $$
begin
  ------------------------------------------------------------------------------
  -- photo_permissions: single select policy, separate owner write policies
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'photo_permissions' and policyname = 'photo_permissions_viewer_select'
  ) then
    drop policy "photo_permissions_viewer_select" on public.photo_permissions;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'photo_permissions' and policyname = 'photo_permissions_owner_manage'
  ) then
    drop policy "photo_permissions_owner_manage" on public.photo_permissions;
  end if;

  create policy photo_permissions_owner_insert
    on public.photo_permissions
    for insert
    with check (
      (select auth.uid()) = (
        select owner_id from public.photo_assets where id = photo_permissions.photo_id
      )
    );

  create policy photo_permissions_owner_update
    on public.photo_permissions
    for update
    using (
      (select auth.uid()) = (
        select owner_id from public.photo_assets where id = photo_permissions.photo_id
      )
    )
    with check (
      (select auth.uid()) = (
        select owner_id from public.photo_assets where id = photo_permissions.photo_id
      )
    );

  create policy photo_permissions_owner_delete
    on public.photo_permissions
    for delete
    using (
      (select auth.uid()) = (
        select owner_id from public.photo_assets where id = photo_permissions.photo_id
      )
    );

  create policy photo_permissions_select_owner_or_viewer
    on public.photo_permissions
    for select
    using (
      (select auth.uid()) = viewer_id
      or (select auth.uid()) = (
        select owner_id from public.photo_assets where id = photo_permissions.photo_id
      )
    );

  ------------------------------------------------------------------------------
  -- profiles: single select policy + scoped write policies (no duplicate select)
  ------------------------------------------------------------------------------
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles self select'
  ) then
    drop policy "profiles self select" on public.profiles;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles self write'
  ) then
    drop policy "profiles self write" on public.profiles;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'users_update_own_profile_verification'
  ) then
    drop policy users_update_own_profile_verification on public.profiles;
  end if;

  -- Keep/ensure a single select policy (public read as zuvor)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles read public'
  ) then
    create policy "profiles read public"
      on public.profiles
      for select
      using (true);
  end if;

  create policy profiles_self_insert
    on public.profiles
    for insert
    to authenticated
    with check (
      (select auth.uid()) = coalesce(user_id, id)
      or (select auth.role()) = 'service_role'
    );

  create policy profiles_self_update
    on public.profiles
    for update
    to authenticated
    using (
      (select auth.uid()) = coalesce(user_id, id)
      or (select auth.role()) = 'service_role'
    )
    with check (
      (select auth.uid()) = coalesce(user_id, id)
      or (select auth.role()) = 'service_role'
    );

  create policy profiles_self_delete
    on public.profiles
    for delete
    to authenticated
    using (
      (select auth.uid()) = coalesce(user_id, id)
      or (select auth.role()) = 'service_role'
    );
end $$;
