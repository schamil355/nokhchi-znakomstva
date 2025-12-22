--------------------------------------------------------------------------------
-- Admin: Anzahl gelöschter Accounts (aus auth.audit_log_entries)
--------------------------------------------------------------------------------

create or replace function public.admin_deleted_accounts()
returns bigint
language sql
security definer
set search_path = public, auth
as $$
  -- Zähle Supabase-Audit-Events mit action = 'user_deleted'
  select count(*)::bigint
  from auth.audit_log_entries
  where (payload ->> 'action') = 'user_deleted';
$$;

grant execute on function public.admin_deleted_accounts() to service_role;
