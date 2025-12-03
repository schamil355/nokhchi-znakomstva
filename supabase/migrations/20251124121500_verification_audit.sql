--------------------------------------------------------------------------------
-- Verification audit log table
--------------------------------------------------------------------------------

create table if not exists public.verification_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists verification_audit_user_id_idx on public.verification_audit (user_id);
