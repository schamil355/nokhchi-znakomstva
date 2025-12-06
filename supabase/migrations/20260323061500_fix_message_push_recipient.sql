--------------------------------------------------------------------------------
-- Ensure message push targets only the recipient (never the sender)
--------------------------------------------------------------------------------

create or replace function public.enqueue_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  preview text;
  sender_avatar text;
  created_at timestamptz;
begin
  -- Resolve recipient as the other participant of the match
  select
    case
      when new.sender_id = m.user_a then m.user_b
      when new.sender_id = m.user_b then m.user_a
      else null
    end
  into recipient
  from public.matches m
  where m.id = new.match_id
    and coalesce(m.is_active, true)
  limit 1;

  -- Skip if we cannot resolve or if sender == recipient (self push)
  if recipient is null or recipient = new.sender_id then
    return new;
  end if;

  -- Sender avatar for payload
  select
    coalesce(
      p.primary_photo_path,
      (fp.first_photo->>'url'),
      (fp.first_photo->>'signedUrl'),
      (fp.first_photo->>'storagePath')
    )
  into sender_avatar
  from public.profiles p
  left join lateral (select p.photos[1] as first_photo) fp on true
  where p.id = new.sender_id
  limit 1;

  preview := substring(coalesce(new.content, '') for 140);
  created_at := coalesce(new.created_at, timezone('utc', now()));

  insert into public.push_queue(user_id, type, payload)
  values (
    recipient,
    'message.new',
    jsonb_build_object(
      'match_id', new.match_id,
      'message_id', new.id,
      'sender_id', new.sender_id,
      'preview', preview,
      'avatar_path', sender_avatar,
      'created_at', created_at
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_messages_push on public.messages;
create trigger trg_messages_push
  after insert on public.messages
  for each row
  execute function public.enqueue_message_push();
