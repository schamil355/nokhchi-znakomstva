--------------------------------------------------------------------------------
-- Push notification on like received (even if not mutual)
--------------------------------------------------------------------------------

create or replace function public.enqueue_like_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avatar_path text;
begin
  select
    coalesce(p.primary_photo_path, (p.photos->0->>'url'))
  into avatar_path
  from public.profiles p
  where p.id = new.liker_id
  limit 1;

  insert into public.push_queue(user_id, type, payload)
  values (
    new.likee_id,
    'like.received',
    jsonb_build_object(
      'liker_id', new.liker_id,
      'avatar_path', avatar_path,
      'created_at', now()
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_likes_push on public.likes;
create trigger trg_likes_push
  after insert on public.likes
  for each row
  execute function public.enqueue_like_push();
