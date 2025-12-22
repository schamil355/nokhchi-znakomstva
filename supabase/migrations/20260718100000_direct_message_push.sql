--------------------------------------------------------------------------------
-- Direktchat: Push-Benachrichtigung bei neuen Nachrichten
--------------------------------------------------------------------------------

create or replace function public.enqueue_direct_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  sender_avatar text;
  preview text;
  created_at timestamptz;
  conv record;
begin
  -- Ermittle den anderen Teilnehmer der Unterhaltung
  select user_a, user_b
  into conv
  from public.direct_conversations dc
  where dc.id = new.conversation_id
  limit 1;

  if conv.user_a is null and conv.user_b is null then
    return new;
  end if;

  if new.sender_id = conv.user_a then
    recipient := conv.user_b;
  else
    recipient := conv.user_a;
  end if;

  -- Kein Push an sich selbst
  if recipient is null or recipient = new.sender_id then
    return new;
  end if;

  -- Avatar des Senders für die Push-Nachricht
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
      'conversation_id', new.conversation_id,
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

drop trigger if exists trg_direct_messages_push on public.direct_messages;
create trigger trg_direct_messages_push
  after insert on public.direct_messages
  for each row
  execute function public.enqueue_direct_message_push();
