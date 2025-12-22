--------------------------------------------------------------------------------
-- Set admin views to SECURITY INVOKER (use caller RLS/rights)
--------------------------------------------------------------------------------

alter view public.reports_view  set (security_invoker = true);
alter view public.blocks_view   set (security_invoker = true);
alter view public.matches_view  set (security_invoker = true);
alter view public.messages_view set (security_invoker = true);

grant select on public.reports_view, public.blocks_view, public.matches_view, public.messages_view to service_role;
