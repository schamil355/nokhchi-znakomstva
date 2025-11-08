--------------------------------------------------------------------------------
-- Events tracking table and daily aggregation view
--------------------------------------------------------------------------------

create table if not exists public.events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  props jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'events_insert_self'
  ) then
    create policy "events_insert_self"
      on public.events
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'events_service_read'
  ) then
    create policy "events_service_read"
      on public.events
      for select
      using (auth.role() = 'service_role');
  end if;
end
$$;

--------------------------------------------------------------------------------
-- Daily aggregation view
--------------------------------------------------------------------------------

create or replace view public.events_daily as
select
  name,
  date_trunc('day', created_at) as day,
  count(*) as total
from public.events
group by 1, 2;
