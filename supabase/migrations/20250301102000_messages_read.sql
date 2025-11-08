--------------------------------------------------------------------------------
-- Messages read receipts column + RLS
--------------------------------------------------------------------------------

alter table public.messages
  add column if not exists read_at timestamptz;

-- allow authenticated clients to update read_at column only
grant update(read_at) on public.messages to authenticated;

-- policy permitting recipients to update read_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'messages receiver update read'
  ) THEN
    CREATE POLICY "messages receiver update read"
      ON public.messages
      FOR UPDATE
      USING (
        auth.uid() IS NOT NULL
        AND auth.uid() <> sender_id
        AND exists (
          select 1
          from public.matches m
          where m.id = messages.match_id
            and auth.uid() in (m.user_a, m.user_b)
        )
      )
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() <> sender_id
        AND exists (
          select 1
          from public.matches m
          where m.id = messages.match_id
            and auth.uid() in (m.user_a, m.user_b)
        )
      );
  END IF;
END
$$;
