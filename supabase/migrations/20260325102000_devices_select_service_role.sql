--------------------------------------------------------------------------------
-- Allow service_role to select devices rows (for RETURNING on inserts)
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'devices_owner_select'
  ) then
    alter policy devices_owner_select
      on public.devices
      to authenticated, service_role
      using (true);
  end if;
end $$;
