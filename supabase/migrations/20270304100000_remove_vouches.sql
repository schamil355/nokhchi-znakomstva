-- Remove vouch feature schema artifacts
drop trigger if exists trg_profiles_vouch_count_from_verified on public.profiles;
drop function if exists public.sync_vouch_count_from_verified();

drop trigger if exists trg_profile_vouches_sync on public.profile_vouches;
drop function if exists public.sync_vouch_count_from_vouches();
drop function if exists public.recompute_vouch_count(uuid);

drop function if exists public.admin_list_vouches(uuid);
drop function if exists public.admin_add_vouch(uuid, uuid);
drop function if exists public.admin_remove_vouch(uuid);

drop policy if exists "profile_vouches self select" on public.profile_vouches;
drop policy if exists "profile_vouches self insert" on public.profile_vouches;
drop policy if exists "profile_vouches service role manage" on public.profile_vouches;

drop table if exists public.profile_vouches;
drop index if exists public.profiles_vouch_count_idx;
alter table public.profiles drop column if exists vouch_count;
