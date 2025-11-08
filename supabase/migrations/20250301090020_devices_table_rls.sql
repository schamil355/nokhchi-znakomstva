--------------------------------------------------------------------------------
-- Devices table for Expo push tokens + RLS
--------------------------------------------------------------------------------

create table if not exists public.devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, token)
);

alter table public.devices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'devices_owner_manage'
  ) then
    create policy "devices_owner_manage"
      on public.devices
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'devices_owner_select'
  ) then
    create policy "devices_owner_select"
      on public.devices
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
