--------------------------------------------------------------------------------
-- RPC: list_matches_with_profiles(viewer) - used by mobile chat list
--------------------------------------------------------------------------------

drop function if exists public.list_matches_with_profiles(uuid);

create or replace function public.list_matches_with_profiles(p_viewer_id uuid)
returns table (
  id uuid,
  user_a uuid,
  user_b uuid,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer,
  other_profile jsonb
)
language sql
security definer
set search_path = public
as $$
  with matches as (
    select
      m.id,
      m.user_a,
      m.user_b,
      case when m.user_a = p_viewer_id then m.user_b else m.user_a end as other_id,
      (
        select max(created_at)
        from public.messages msg
        where msg.match_id = m.id
      ) as last_message_at,
      (
        select msg.content
        from public.messages msg
        where msg.match_id = m.id
        order by msg.created_at desc
        limit 1
      ) as last_message_preview,
      coalesce((
        select count(*)::int
        from public.messages msg
        where msg.match_id = m.id
          and msg.sender_id <> p_viewer_id
          and msg.read_at is null
      ), 0) as unread_count
    from public.matches m
    where p_viewer_id in (m.user_a, m.user_b)
  )
  select
    m.id,
    m.user_a,
    m.user_b,
    m.last_message_at,
    coalesce(m.last_message_preview, '') as last_message_preview,
    m.unread_count,
    (
      select json_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'photos', p.photos
      )
      from public.profiles p
      where p.id = m.other_id
    ) as other_profile
  from matches m;
$$;

grant execute on function public.list_matches_with_profiles(uuid) to authenticated;
