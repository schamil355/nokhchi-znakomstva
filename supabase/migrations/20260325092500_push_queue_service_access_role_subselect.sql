--------------------------------------------------------------------------------
-- push_queue RLS: avoid per-row auth.role() evaluation for service access
--------------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_policies
    where policyname = 'push_queue_service_access'
      and schemaname = 'public'
      and tablename = 'push_queue'
  ) then
    alter policy "push_queue_service_access"
      on public.push_queue
      using ((select auth.role()) = 'service_role')
      with check ((select auth.role()) = 'service_role');
  end if;
end $$;
