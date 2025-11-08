--------------------------------------------------------------------------------
-- Admin ACL and audit tables
--------------------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator'
);

create table if not exists public.admin_audit (
  id bigserial primary key,
  admin_id uuid not null references public.admins(user_id) on delete cascade,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
