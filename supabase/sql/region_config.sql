create table if not exists public.region_config (
  country_code text primary key,
  paywall_mode text not null check (paywall_mode in ('iap', 'none')),
  notes text
);

insert into public.region_config (country_code, paywall_mode, notes) values
  ('RU', 'none', 'Hide paywall; only external entitlements via login'),
  ('FR', 'iap', 'EU IAP'),
  ('DE', 'iap', 'EU IAP'),
  ('AT', 'iap', 'EU IAP'),
  ('BE', 'iap', 'EU IAP'),
  ('NO', 'iap', 'IAP')
on conflict (country_code) do update set
  paywall_mode = excluded.paywall_mode,
  notes = excluded.notes;
