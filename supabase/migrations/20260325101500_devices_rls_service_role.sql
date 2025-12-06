--------------------------------------------------------------------------------
-- Expand devices RLS to allow service_role inserts/updates/deletes/selects
--------------------------------------------------------------------------------
do $$
begin
  -- allow service_role in addition to authenticated
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_write_insert_any'
  ) then
    alter policy devices_write_insert_any
      on public.devices
      to authenticated, service_role
      with check (true);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_write_update_any'
  ) then
    alter policy devices_write_update_any
      on public.devices
      to authenticated, service_role
      using (true)
      with check (true);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_write_delete_any'
  ) then
    alter policy devices_write_delete_any
      on public.devices
      to authenticated, service_role
      using (true);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_owner_select'
  ) then
    alter policy devices_owner_select
      on public.devices
      to authenticated, service_role
      using ((select auth.uid()) = user_id);
  end if;
end $$;
