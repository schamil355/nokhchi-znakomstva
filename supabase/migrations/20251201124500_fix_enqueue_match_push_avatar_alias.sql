--------------------------------------------------------------------------------
-- Fix enqueue_match_push: qualify avatar_path from lateral subquery
--------------------------------------------------------------------------------

create or replace function public.enqueue_match_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_queue(user_id, type, payload)
  select
    t.uid,
    'match.new',
    jsonb_build_object(
      'match_id', new.id,
      'created_at', new.created_at,
      'other_user_id', t.other_user,
      'avatar_path', ap.avatar_path
    )
  from (
    select new.user_a as uid, new.user_b as other_user
    union all
    select new.user_b as uid, new.user_a as other_user
  ) as t
  cross join lateral (
    select
      coalesce(
        p.primary_photo_path,
        (fp.first_photo->>'url'),
        (fp.first_photo->>'signedUrl'),
        (fp.first_photo->>'storagePath')
      ) as avatar_path
    from public.profiles p
    left join lateral (select p.photos[1] as first_photo) fp on true
    where p.id = t.other_user
    limit 1
  ) as ap
  where t.uid is not null;

  return new;
end;
$$;

drop trigger if exists trg_matches_push on public.matches;
create trigger trg_matches_push
  after insert on public.matches
  for each row
  execute function public.enqueue_match_push();
