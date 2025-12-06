--------------------------------------------------------------------------------
-- Relax devices RLS so any authenticated user can claim a token (delete/insert)
--------------------------------------------------------------------------------

do $$
begin
  -- Remove old manage policy if present
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'devices_owner_manage'
  ) then
    drop policy "devices_owner_manage" on public.devices;
  end if;
end $$;

-- Allow authenticated users to insert/update/delete rows (needed to claim token)
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'devices_manage_any_authenticated'
  ) then
    drop policy "devices_manage_any_authenticated" on public.devices;
  end if;

  create policy "devices_manage_any_authenticated"
    on public.devices
    for all
    to authenticated
    using (true)
    with check (true);
end $$;

-- Keep a select-only policy so users can read their own devices if needed
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'devices_owner_select'
  ) then
    create policy "devices_owner_select"
      on public.devices
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;
