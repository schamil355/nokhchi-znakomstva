--------------------------------------------------------------------------------
-- Add covering indexes for foreign keys to improve join/filter performance
--------------------------------------------------------------------------------
create index if not exists idx_admin_audit_admin_id
  on public.admin_audit(admin_id);

create index if not exists idx_blocks_blocked_id
  on public.blocks(blocked_id);

create index if not exists idx_events_user_id
  on public.events(user_id);

create index if not exists idx_matches_user_b
  on public.matches(user_b);

create index if not exists idx_messages_sender_id
  on public.messages(sender_id);

create index if not exists idx_passes_passee_id
  on public.passes(passee_id);

create index if not exists idx_photo_permissions_viewer_id
  on public.photo_permissions(viewer_id);

create index if not exists idx_push_queue_user_id
  on public.push_queue(user_id);

create index if not exists idx_reports_reported_user_id
  on public.reports(reported_user_id);
