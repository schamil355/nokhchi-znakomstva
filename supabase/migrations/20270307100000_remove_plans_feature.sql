--------------------------------------------------------------------------------
-- Remove plans feature tables + push type
--------------------------------------------------------------------------------

drop table if exists public.plan_messages cascade;
drop table if exists public.plan_checkins cascade;
drop table if exists public.plan_invites cascade;
drop table if exists public.date_plans cascade;

drop function if exists public.enqueue_plan_invite_push();

delete from public.push_queue where type = 'plan.invite';

alter table public.push_queue
  drop constraint if exists push_queue_type_check;

alter table public.push_queue
  add constraint push_queue_type_check
    check (type in ('match.new','message.new','like.received','test.push'));
