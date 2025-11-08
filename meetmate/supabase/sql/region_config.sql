create type if not exists public.region_paywall_mode as enum ('iap', 'none');

create table if not exists public.region_config (
  country_code text primary key,
  paywall_mode public.region_paywall_mode not null default 'iap',
  notes text
);

alter table public.region_config enable row level security;

create policy if not exists "Allow read access to region config"
  on public.region_config
  for select
  using (true);

insert into public.region_config (country_code, paywall_mode, notes)
values ('RU', 'none', 'IAP not available in this region')
on conflict (country_code) do update
set paywall_mode = excluded.paywall_mode,
    notes = excluded.notes;

insert into public.region_config (country_code, paywall_mode, notes)
values ('DEFAULT', 'iap', 'Fallback configuration for paywall')
on conflict (country_code) do update
set paywall_mode = excluded.paywall_mode,
    notes = excluded.notes;
