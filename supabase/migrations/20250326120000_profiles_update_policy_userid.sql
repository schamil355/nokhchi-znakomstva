--------------------------------------------------------------------------------
-- Allow profile updates when user_id differs from id
--------------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists users_update_own_profile_verification on public.profiles;
create policy users_update_own_profile_verification
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = coalesce(user_id, id))
  with check (auth.uid() = coalesce(user_id, id));

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
  on public.profiles
  for select
  using (auth.uid() = coalesce(user_id, id) or auth.role() = 'service_role');

drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self write"
  on public.profiles
  for all
  using (auth.uid() = coalesce(user_id, id) or auth.role() = 'service_role')
  with check (auth.uid() = coalesce(user_id, id) or auth.role() = 'service_role');
