--------------------------------------------------------------------------------
-- Account privacy hardening: RLS + verification helper
--------------------------------------------------------------------------------

-- Blocks table (if missing) with strict row level security
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blocks'
      and policyname = 'blocks blocker manage'
  ) then
    create policy "blocks blocker manage"
      on public.blocks
      for all
      using (auth.uid() = blocker_id or auth.role() = 'service_role')
      with check (auth.uid() = blocker_id or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blocks'
      and policyname = 'blocks participants read'
  ) then
    create policy "blocks participants read"
      on public.blocks
      for select
      using (auth.uid() = blocker_id or auth.uid() = blocked_id or auth.role() = 'service_role');
  end if;
end
$$;

--------------------------------------------------------------------------------
-- Profiles: lock base table to the owner (discovery uses views / RPCs)
--------------------------------------------------------------------------------
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles self select'
  ) then
    create policy "profiles self select"
      on public.profiles
      for select
      using (auth.uid() = id or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles self write'
  ) then
    create policy "profiles self write"
      on public.profiles
      for all
      using (auth.uid() = id or auth.role() = 'service_role')
      with check (auth.uid() = id or auth.role() = 'service_role');
  end if;
end
$$;

--------------------------------------------------------------------------------
-- Reports: reporters + affected users only
--------------------------------------------------------------------------------
alter table public.reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'reports reporter write'
  ) then
    create policy "reports reporter write"
      on public.reports
      for insert
      with check (auth.uid() = reporter_id or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'reports participants read'
  ) then
    create policy "reports participants read"
      on public.reports
      for select
      using (
        auth.uid() = reporter_id
        or auth.uid() = reported_user_id
        or auth.role() = 'service_role'
      );
  end if;
end
$$;

--------------------------------------------------------------------------------
-- Messages/photos: make sure RLS cannot be disabled accidentally
--------------------------------------------------------------------------------
alter table public.messages enable row level security;
alter table public.photo_assets enable row level security;
alter table public.photo_permissions enable row level security;

--------------------------------------------------------------------------------
-- RLS verification helper view (documentation / negative test cases)
--------------------------------------------------------------------------------
create or replace view public.rls_negative_checks as
select
  v.table_name,
  v.scenario,
  v.expected_outcome,
  coalesce(c.relrowsecurity, false) as rls_enabled
from (
  values
    ('profiles', 'User A tries to SELECT/UPDATE profile row of User B', 'Request should yield 0 rows / be rejected'),
    ('messages', 'User A attempts to read chat messages of foreign match', 'RLS denies access'),
    ('blocks', 'Random account enumerates block graph of others', 'No rows returned'),
    ('reports', 'Random account reads moderation reports of others', 'RLS denies access'),
    ('photo_assets', 'Random account lists private photos of others', 'No rows returned'),
    ('photo_permissions', 'Random account lists permissions it does not own', 'No rows returned')
) as v(table_name, scenario, expected_outcome)
left join pg_class c
  on c.relname = v.table_name
 and c.relnamespace = 'public'::regnamespace;
