--------------------------------------------------------------------------------
-- Update like trigger: always enqueue like.received; enqueue match.new only
-- when a mutual like exists AND no existing match record is present. If the
-- liker is incognito, send match.new only to the likee (not to the incognito
-- liker).
--------------------------------------------------------------------------------

create or replace function public.enqueue_like_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  liker_avatar text;
  likee_avatar text;
  liker_incognito boolean := false;
  is_mutual boolean;
  match_id uuid;
  match_created_at timestamptz;
begin
  -- Resolve liker avatar and incognito flag
  select
    coalesce(
      p.primary_photo_path,
      (fp.first_photo->>'url'),
      (fp.first_photo->>'signedUrl'),
      (fp.first_photo->>'storagePath')
    ),
    coalesce(p.is_incognito, false)
  into liker_avatar, liker_incognito
  from public.profiles p
  left join lateral (select p.photos[1] as first_photo) fp on true
  where p.id = new.liker_id
  limit 1;

  -- Resolve likee avatar (used when sending match push to liker)
  select
    coalesce(
      p.primary_photo_path,
      (fp.first_photo->>'url'),
      (fp.first_photo->>'signedUrl'),
      (fp.first_photo->>'storagePath')
    )
  into likee_avatar
  from public.profiles p
  left join lateral (select p.photos[1] as first_photo) fp on true
  where p.id = new.likee_id
  limit 1;

  -- Always send like push (includes incognito flag so client can decide)
  insert into public.push_queue(user_id, type, payload)
  values (
    new.likee_id,
    'like.received',
    jsonb_build_object(
      'liker_id', new.liker_id,
      'liker_incognito', liker_incognito,
      'avatar_path', liker_avatar,
      'created_at', timezone('utc', now())
    )
  );

  -- Mutual like check
  select exists(
    select 1 from public.likes l
    where l.liker_id = new.likee_id
      and l.likee_id = new.liker_id
  ) into is_mutual;

  if is_mutual then
    -- Find existing match (if any)
    select m.id, m.created_at
    into match_id, match_created_at
    from public.matches m
    where (m.user_a = new.liker_id and m.user_b = new.likee_id)
       or (m.user_a = new.likee_id and m.user_b = new.liker_id)
    order by m.created_at desc
    limit 1;

    -- If a match already exists, don't spam new match pushes
    if match_id is not null then
      return new;
    end if;

    if liker_incognito then
      -- Only notify the likee; skip notifying the incognito liker
      insert into public.push_queue(user_id, type, payload)
      values (
        new.likee_id,
        'match.new',
        jsonb_build_object(
          'match_id', match_id,
          'created_at', coalesce(match_created_at, timezone('utc', now())),
          'other_user_id', new.liker_id,
          'avatar_path', liker_avatar
        )
      );
    else
      -- Enqueue match push for both participants (first time mutual like)
      insert into public.push_queue(user_id, type, payload)
      values
        (
          new.liker_id,
          'match.new',
          jsonb_build_object(
            'match_id', match_id,
            'created_at', coalesce(match_created_at, timezone('utc', now())),
            'other_user_id', new.likee_id,
            'avatar_path', likee_avatar
          )
        ),
        (
          new.likee_id,
          'match.new',
          jsonb_build_object(
            'match_id', match_id,
            'created_at', coalesce(match_created_at, timezone('utc', now())),
            'other_user_id', new.liker_id,
            'avatar_path', liker_avatar
          )
        );
    end if;
  end if;

  return new;
end;
$$;

-- Ensure trigger is present
drop trigger if exists trg_likes_push on public.likes;
create trigger trg_likes_push
  after insert on public.likes
  for each row
  execute function public.enqueue_like_push();

