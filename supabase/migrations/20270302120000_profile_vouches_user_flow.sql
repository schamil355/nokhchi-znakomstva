-- User vouch flow: allow self read, remove admin RPCs

drop policy if exists "profile_vouches self select" on public.profile_vouches;
create policy "profile_vouches self select"
  on public.profile_vouches
  for select
  using (auth.uid() = voucher_id);

drop function if exists public.admin_list_vouches(uuid);
drop function if exists public.admin_add_vouch(uuid, uuid);
drop function if exists public.admin_remove_vouch(uuid);
