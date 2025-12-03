-- Verification support tables (selfie verification & audit helpers)

create table if not exists public.verification_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  failure_reason text,
  similarity_score double precision,
  liveness_score double precision,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verification_sessions_user_id_idx on public.verification_sessions (user_id);

create table if not exists public.verification_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.verification_sessions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  storage_url text,
  created_at timestamptz not null default now()
);

create index if not exists verification_artifacts_session_id_idx on public.verification_artifacts (session_id);
create index if not exists verification_artifacts_user_id_idx on public.verification_artifacts (user_id);
