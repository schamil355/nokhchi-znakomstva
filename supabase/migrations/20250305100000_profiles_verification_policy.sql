alter table public.profiles enable row level security;

drop policy if exists users_update_own_profile_verification on public.profiles;
create policy users_update_own_profile_verification
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
