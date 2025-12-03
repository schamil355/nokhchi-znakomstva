--------------------------------------------------------------------------------
-- Ensure like push is enqueued even for incognito likers (includes flag + avatar)
--------------------------------------------------------------------------------

create or replace function public.enqueue_like_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_queue(user_id, type, payload)
  select
    new.likee_id,
    'like.received',
    jsonb_build_object(
      'liker_id', new.liker_id,
      'liker_incognito', coalesce(p.is_incognito, false),
      'avatar_path', ap.avatar_path,
      'created_at', timezone('utc', now())
    )
  from public.profiles p
  left join lateral (
    select coalesce(
      p.primary_photo_path,
      (fp.first_photo->>'url'),
      (fp.first_photo->>'signedUrl'),
      (fp.first_photo->>'storagePath')
    ) as avatar_path
    from public.profiles p2
    left join lateral (select p2.photos[1] as first_photo) fp on true
    where p2.id = p.id
    limit 1
  ) as ap on true
  where p.id = new.liker_id;

  return new;
end;
$$;

drop trigger if exists trg_likes_push on public.likes;
create trigger trg_likes_push
  after insert on public.likes
  for each row
  execute function public.enqueue_like_push();
