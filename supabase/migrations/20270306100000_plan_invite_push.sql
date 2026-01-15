--------------------------------------------------------------------------------
-- Plan invite push notifications
--------------------------------------------------------------------------------

alter table public.push_queue
  drop constraint if exists push_queue_type_check;

alter table public.push_queue
  add constraint push_queue_type_check
    check (type in ('match.new','message.new','like.received','plan.invite','test.push'));

create or replace function public.enqueue_plan_invite_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter_name text;
  inviter_incognito boolean;
  inviter_avatar text;
  plan_date_type text;
  plan_area_label text;
  plan_start_time timestamptz;
begin
  if new.to_user_id is null then
    return new;
  end if;

  select
    p.display_name,
    coalesce(p.is_incognito, false),
    coalesce(
      p.primary_photo_path,
      (p.photos->0->>'url'),
      (p.photos->0->>'signedUrl'),
      (p.photos->0->>'storagePath')
    )
  into inviter_name, inviter_incognito, inviter_avatar
  from public.profiles p
  where p.id = new.from_user_id
  limit 1;

  select
    dp.date_type,
    dp.area_label,
    dp.start_time
  into plan_date_type, plan_area_label, plan_start_time
  from public.date_plans dp
  where dp.id = new.plan_id
  limit 1;

  if inviter_incognito then
    inviter_name := null;
    inviter_avatar := null;
  end if;

  insert into public.push_queue(user_id, type, payload)
  values (
    new.to_user_id,
    'plan.invite',
    jsonb_build_object(
      'invite_id', new.id,
      'plan_id', new.plan_id,
      'from_user_id', new.from_user_id,
      'from_user_name', inviter_name,
      'from_user_incognito', inviter_incognito,
      'avatar_path', inviter_avatar,
      'date_type', plan_date_type,
      'area_label', plan_area_label,
      'start_time', plan_start_time,
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_plan_invites_push on public.plan_invites;
create trigger trg_plan_invites_push
  after insert on public.plan_invites
  for each row
  execute function public.enqueue_plan_invite_push();
