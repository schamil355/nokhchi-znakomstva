--------------------------------------------------------------------------------
-- RLS policies: call auth.uid()/auth.role() once via subselect for performance
--------------------------------------------------------------------------------
do $$
begin
  -- events
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_insert_self'
  ) then
    alter policy "events_insert_self"
      on public.events
      with check ((select auth.uid()) = user_id);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'events' and policyname = 'events_service_read'
  ) then
    alter policy "events_service_read"
      on public.events
      using ((select auth.role()) = 'service_role');
  end if;

  -- blocks
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks blocker manage'
  ) then
    alter policy "blocks blocker manage"
      on public.blocks
      using (
        (select auth.uid()) = blocker_id
        or (select auth.role()) = 'service_role'
      )
      with check (
        (select auth.uid()) = blocker_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks' and policyname = 'blocks participants read'
  ) then
    alter policy "blocks participants read"
      on public.blocks
      using (
        (select auth.uid()) = blocker_id
        or (select auth.uid()) = blocked_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  -- reports
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports' and policyname = 'reports reporter write'
  ) then
    alter policy "reports reporter write"
      on public.reports
      with check (
        (select auth.uid()) = reporter_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports' and policyname = 'reports participants read'
  ) then
    alter policy "reports participants read"
      on public.reports
      using (
        (select auth.uid()) = reporter_id
        or (select auth.uid()) = reported_user_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  -- devices
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'users_manage_own_devices'
  ) then
    alter policy "users_manage_own_devices"
      on public.devices
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_owner_select'
  ) then
    alter policy "devices_owner_select"
      on public.devices
      using ((select auth.uid()) = user_id);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'devices' and policyname = 'devices_owner_manage'
  ) then
    alter policy "devices_owner_manage"
      on public.devices
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;

  -- search_prefs
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'search_prefs' and policyname = 'search_prefs owner select'
  ) then
    alter policy "search_prefs owner select"
      on public.search_prefs
      using (
        (select auth.uid()) = user_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'search_prefs' and policyname = 'search_prefs owner insert'
  ) then
    alter policy "search_prefs owner insert"
      on public.search_prefs
      with check (
        (select auth.uid()) = user_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'search_prefs' and policyname = 'search_prefs owner update'
  ) then
    alter policy "search_prefs owner update"
      on public.search_prefs
      using (
        (select auth.uid()) = user_id
        or (select auth.role()) = 'service_role'
      )
      with check (
        (select auth.uid()) = user_id
        or (select auth.role()) = 'service_role'
      );
  end if;

  -- likes / passes
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'likes' and policyname = 'likes self rw'
  ) then
    alter policy "likes self rw"
      on public.likes
      using ((select auth.uid()) = liker_id)
      with check ((select auth.uid()) = liker_id);
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'passes' and policyname = 'passes self rw'
  ) then
    alter policy "passes self rw"
      on public.passes
      using ((select auth.uid()) = passer_id)
      with check ((select auth.uid()) = passer_id);
  end if;

  -- matches / messages
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'matches' and policyname = 'matches participants r'
  ) then
    alter policy "matches participants r"
      on public.matches
      using ((select auth.uid()) in (user_a, user_b));
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages participants r'
  ) then
    alter policy "messages participants r"
      on public.messages
      using (
        exists (
          select 1
          from public.matches m
          where m.id = messages.match_id
            and (select auth.uid()) in (m.user_a, m.user_b)
        )
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages sender w'
  ) then
    alter policy "messages sender w"
      on public.messages
      with check (
        sender_id = (select auth.uid())
        and exists (
          select 1
          from public.matches m
          where m.id = messages.match_id
            and (select auth.uid()) in (m.user_a, m.user_b)
        )
      );
  end if;

  -- feature flags
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feature_flags' and policyname = 'write feature flags (admin)'
  ) then
    alter policy "write feature flags (admin)"
      on public.feature_flags
      using ((select auth.role()) = 'service_role')
      with check ((select auth.role()) = 'service_role');
  end if;

  -- profiles
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles self select'
  ) then
    alter policy "profiles self select"
      on public.profiles
      using (
        (select auth.uid()) = coalesce(user_id, id)
        or (select auth.role()) = 'service_role'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles self write'
  ) then
    alter policy "profiles self write"
      on public.profiles
      using (
        (select auth.uid()) = coalesce(user_id, id)
        or (select auth.role()) = 'service_role'
      )
      with check (
        (select auth.uid()) = coalesce(user_id, id)
        or (select auth.role()) = 'service_role'
      );
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'users_update_own_profile_verification'
  ) then
    alter policy users_update_own_profile_verification
      on public.profiles
      using ((select auth.uid()) = coalesce(user_id, id))
      with check ((select auth.uid()) = coalesce(user_id, id));
  end if;
end $$;
