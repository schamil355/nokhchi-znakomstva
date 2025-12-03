--------------------------------------------------------------------------------
-- Allow push queue test jobs and helper RPC to enqueue them
--------------------------------------------------------------------------------

alter table public.push_queue
  alter column type type text
  using type::text;

alter table public.push_queue
  drop constraint if exists push_queue_type_check;

alter table public.push_queue
  add constraint push_queue_type_check
    check (type in ('match.new','message.new','test.push'));

create or replace function public.enqueue_test_push()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'auth.uid is required';
  end if;

  insert into public.push_queue(user_id, type, payload)
  values (
    uid,
    'test.push',
    jsonb_build_object(
      'message', 'Test notification from onboarding dev tools',
      'created_at', timezone('utc', now())
    )
  );
end;
$$;
