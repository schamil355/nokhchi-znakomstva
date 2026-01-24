--------------------------------------------------------------------------------
-- Feature flags: allow public read + seed partner leads flag
--------------------------------------------------------------------------------

-- Allow anonymous users to read feature flags (for web landing pages).
drop policy if exists "read feature flags anon" on public.feature_flags;
create policy "read feature flags anon"
  on public.feature_flags
  for select
  to anon
  using (true);

-- Seed partner leads toggle (web only).
insert into public.feature_flags (key, enabled, rollout_pct, platform, updated_at)
values ('partner_leads', false, 100, 'web', now())
on conflict (key) do update
  set enabled = excluded.enabled,
      rollout_pct = excluded.rollout_pct,
      platform = excluded.platform,
      updated_at = now();
