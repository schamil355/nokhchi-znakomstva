--------------------------------------------------------------------------------
-- Allow like.received in push_queue type check
--------------------------------------------------------------------------------

alter table public.push_queue
  drop constraint if exists push_queue_type_check;

alter table public.push_queue
  add constraint push_queue_type_check
    check (type in ('match.new','message.new','like.received','test.push'));
