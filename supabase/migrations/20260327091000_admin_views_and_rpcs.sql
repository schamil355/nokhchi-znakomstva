--------------------------------------------------------------------------------
-- Admin RPCs + Views for moderation dashboard
-- - admin_search_users(search_term text)
-- - admin_ban_user(target_user uuid, ban_reason text)
-- - admin_unban_user(target_user uuid)
-- - reports_view / blocks_view / matches_view / messages_view
--------------------------------------------------------------------------------

set check_function_bodies = off;

--------------------------------------------------------------------------------
-- Helper table for bans (service role only)
--------------------------------------------------------------------------------
create table if not exists public.user_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create index if not exists user_bans_active_idx
  on public.user_bans(user_id)
  where revoked_at is null;

alter table public.user_bans enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_bans'
      and policyname = 'user_bans service role manage'
  ) then
    create policy "user_bans service role manage"
      on public.user_bans
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end
$$;

--------------------------------------------------------------------------------
-- admin_search_users: minimal lookup for dashboard autocompletes
--------------------------------------------------------------------------------
create or replace function public.admin_search_users(search_term text)
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email,
    coalesce(p.display_name, u.raw_user_meta_data->>'display_name') as display_name,
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where
    search_term is null
    or search_term = ''
    or u.email ilike '%' || search_term || '%'
    or p.display_name ilike '%' || search_term || '%'
  order by u.created_at desc
  limit 50;
$$;

--------------------------------------------------------------------------------
-- admin_ban_user / admin_unban_user
--------------------------------------------------------------------------------
create or replace function public.admin_ban_user(target_user uuid, ban_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if target_user is null then
    return;
  end if;

  insert into public.user_bans(user_id, reason, created_at, revoked_at)
  values (target_user, ban_reason, timezone('utc', now()), null)
  on conflict (user_id) do update
    set reason = excluded.reason,
        revoked_at = null,
        created_at = timezone('utc', now());
end;
$$;

create or replace function public.admin_unban_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if target_user is null then
    return;
  end if;

  update public.user_bans
  set revoked_at = timezone('utc', now())
  where user_id = target_user;
end;
$$;

--------------------------------------------------------------------------------
-- Views used by the admin dashboard
--------------------------------------------------------------------------------
create or replace view public.reports_view as
select
  r.id,
  r.reason,
  r.details,
  r.created_at,
  rep.email      as reporter_email,
  repd.email     as reported_email,
  coalesce(prep.display_name, rep.raw_user_meta_data->>'display_name')  as reporter_name,
  coalesce(prepd.display_name, repd.raw_user_meta_data->>'display_name') as reported_name,
  null::uuid     as match_id
from public.reports r
left join auth.users rep on rep.id = r.reporter_id
left join auth.users repd on repd.id = r.reported_user_id
left join public.profiles prep on prep.id = r.reporter_id
left join public.profiles prepd on prepd.id = r.reported_user_id;

create or replace view public.blocks_view as
select
  b.created_at,
  bl.email      as blocker_email,
  bd.email      as blocked_email,
  coalesce(pl.display_name, bl.raw_user_meta_data->>'display_name') as blocker_name,
  coalesce(pd.display_name, bd.raw_user_meta_data->>'display_name') as blocked_name
from public.blocks b
left join auth.users bl on bl.id = b.blocker_id
left join auth.users bd on bd.id = b.blocked_id
left join public.profiles pl on pl.id = b.blocker_id
left join public.profiles pd on pd.id = b.blocked_id;

create or replace view public.matches_view as
select
  m.id,
  m.created_at,
  ua.email as user_a_email,
  ub.email as user_b_email,
  coalesce(pa.display_name, ua.raw_user_meta_data->>'display_name') as user_a_name,
  coalesce(pb.display_name, ub.raw_user_meta_data->>'display_name') as user_b_name
from public.matches m
left join auth.users ua on ua.id = m.user_a
left join auth.users ub on ub.id = m.user_b
left join public.profiles pa on pa.id = m.user_a
left join public.profiles pb on pb.id = m.user_b;

create or replace view public.messages_view as
select
  msg.id::text as id,
  msg.match_id,
  msg.created_at,
  sender.email as sender_email,
  coalesce(ps.display_name, sender.raw_user_meta_data->>'display_name') as sender_name,
  msg.content as text,
  null::text as image_url
from public.messages msg
left join auth.users sender on sender.id = msg.sender_id
left join public.profiles ps on ps.id = msg.sender_id;

--------------------------------------------------------------------------------
-- Grants: restrict to service role (admin dashboard)
--------------------------------------------------------------------------------
grant select on public.reports_view, public.blocks_view, public.matches_view, public.messages_view to service_role;
grant execute on function public.admin_search_users(text) to service_role;
grant execute on function public.admin_ban_user(uuid, text) to service_role;
grant execute on function public.admin_unban_user(uuid) to service_role;
