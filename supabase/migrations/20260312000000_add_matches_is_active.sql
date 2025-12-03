-------------------------------------------------------------------------------
-- Add soft-delete flag to matches and update dependent view
-------------------------------------------------------------------------------

alter table public.matches
  add column if not exists is_active boolean not null default true;

-- Recreate matches view so it exposes the real is_active flag (with a safe default)
create or replace view public.matches_v as
select
  m.id,
  m.user_a,
  m.user_b,
  array[least(m.user_a, m.user_b), greatest(m.user_a, m.user_b)] as participants,
  m.created_at,
  (
    select max(created_at)
    from public.messages msg
    where msg.match_id = m.id
  ) as last_message_at,
  coalesce(m.is_active, true) as is_active
from public.matches m;
