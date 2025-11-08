--------------------------------------------------------------------------------
-- Feature flags table and policies
--------------------------------------------------------------------------------
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_pct int not null default 100 check (rollout_pct between 0 and 100),
  platform text not null default 'all' check (platform in ('all','mobile','web')),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

create policy if not exists "read feature flags"
  on public.feature_flags
  for select
  to authenticated
  using (true);

create policy if not exists "write feature flags (admin)"
  on public.feature_flags
  for all
  to authenticated
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

--------------------------------------------------------------------------------
-- Seed defaults
--------------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, rollout_pct, platform, updated_at)
values
  ('incognito', true, 100, 'mobile', now()),
  ('photo_blur_until_match', true, 100, 'mobile', now())
on conflict (key) do update
  set enabled = excluded.enabled,
      rollout_pct = excluded.rollout_pct,
      platform = excluded.platform,
      updated_at = now();
