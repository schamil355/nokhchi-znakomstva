--------------------------------------------------------------------------------
-- Skip creating matches when einer der beiden inkognito ist; no placeholders.
-- Inkognito-Likes schicken nur like.received. Match-Push nur wenn beide sichtbar.
--------------------------------------------------------------------------------

create or replace function public.upsert_match(a uuid, b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ua uuid := least(a, b);
  ub uuid := greatest(a, b);
  match_id uuid;
  a_incognito boolean := false;
  b_incognito boolean := false;
begin
  if a is null or b is null or a = b then
    return null;
  end if;

  -- Both likes must exist (mutual)
  if not exists (select 1 from public.likes l where l.liker_id = a and l.likee_id = b) then
    return null;
  end if;
  if not exists (select 1 from public.likes l where l.liker_id = b and l.likee_id = a) then
    return null;
  end if;

  -- Skip match creation if either is incognito
  select coalesce(is_incognito, false) into a_incognito from public.profiles where id = a limit 1;
  select coalesce(is_incognito, false) into b_incognito from public.profiles where id = b limit 1;
  if a_incognito or b_incognito then
    return null;
  end if;

  insert into public.matches(user_a, user_b)
  values (ua, ub)
  on conflict on constraint matches_pair_unique
  do update set user_a = public.matches.user_a
  returning id into match_id;

  return match_id;
end;
$$;

create or replace function public.enqueue_like_push()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  liker_avatar text;
  likee_avatar text;
  liker_incognito boolean := false;
  likee_incognito boolean := false;
  liker_name text := null;
  is_mutual boolean;
  match_id uuid;
  match_created_at timestamptz;
begin
  -- Resolve liker avatar, name and incognito flag
  select
    coalesce(
      p.primary_photo_path,
      (fp.first_photo->>'url'),
      (fp.first_photo->>'signedUrl'),
      (fp.first_photo->>'storagePath')
    ),
    coalesce(p.is_incognito, false),
    coalesce(
      p.display_name,
      au.raw_user_meta_data->>'display_name',
      substring(au.email from 1 for nullif(position('@' in au.email) - 1, -1))
    )
  into liker_avatar, liker_incognito, liker_name
  from public.profiles p
  left join lateral (select p.photos[1] as first_photo) fp on true
  left join auth.users au on au.id = p.id
  where p.id = new.liker_id
  limit 1;

  -- Resolve likee avatar and incognito flag
  select
    coalesce(
      p.primary_photo_path,
      (fp.first_photo->>'url'),
      (fp.first_photo->>'signedUrl'),
      (fp.first_photo->>'storagePath')
    ),
    coalesce(p.is_incognito, false)
  into likee_avatar, likee_incognito
  from public.profiles p
  left join lateral (select p.photos[1] as first_photo) fp on true
  where p.id = new.likee_id
  limit 1;

  -- Send like push ONLY wenn Liker inkognito ist; no placeholder match
  if liker_incognito then
    insert into public.push_queue(user_id, type, payload)
    values (
      new.likee_id,
      'like.received',
      jsonb_build_object(
        'liker_id', new.liker_id,
        'liker_incognito', liker_incognito,
        'liker_name', liker_name,
        'avatar_path', liker_avatar,
        'created_at', timezone('utc', now())
      )
    );
  end if;

  -- Mutual like check
  select exists(
    select 1 from public.likes l
    where l.liker_id = new.likee_id
      and l.likee_id = new.liker_id
  ) into is_mutual;

  if is_mutual then
    -- Wenn einer inkognito ist, keine Match-Pushes und kein Match
    if liker_incognito or likee_incognito then
      return new;
    end if;

    -- Find existing match (if any)
    select m.id, m.created_at
    into match_id, match_created_at
    from public.matches m
    where (m.user_a = least(new.liker_id, new.likee_id) and m.user_b = greatest(new.liker_id, new.likee_id))
    order by m.created_at desc
    limit 1;

    -- If a match already exists, don't spam new match pushes
    if match_id is not null then
      return new;
    end if;

    -- Beide sichtbar -> Match-Push an beide
    insert into public.push_queue(user_id, type, payload)
    values (
      new.liker_id,
      'match.new',
      jsonb_build_object(
        'match_id', match_id,
        'created_at', coalesce(match_created_at, timezone('utc', now())),
        'other_user_id', new.likee_id,
        'avatar_path', likee_avatar,
        'other_incognito', likee_incognito
      )
    );

    insert into public.push_queue(user_id, type, payload)
    values (
      new.likee_id,
      'match.new',
      jsonb_build_object(
        'match_id', match_id,
        'created_at', coalesce(match_created_at, timezone('utc', now())),
        'other_user_id', new.liker_id,
        'avatar_path', liker_avatar,
        'other_incognito', liker_incognito
      )
    );
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

