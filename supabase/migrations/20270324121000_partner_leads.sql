--------------------------------------------------------------------------------
-- Partner leads (B2B)
--------------------------------------------------------------------------------

create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  city text not null,
  region text,
  monthly_volume text,
  package_interest text,
  notes text,
  locale text,
  source text not null default 'web',
  status text not null default 'new'
);

alter table public.partner_leads enable row level security;

-- Allow anonymous lead submissions from the web landing page.
drop policy if exists "partner_leads_insert" on public.partner_leads;
create policy partner_leads_insert
  on public.partner_leads
  for insert
  to anon, authenticated
  with check (true);
