--------------------------------------------------------------------------------
-- Reports auto actions (block, unmatch, purge) + rate limit
--------------------------------------------------------------------------------

create table if not exists public.reports (
  id bigserial primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  details text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reports_reporter_created_idx on public.reports(reporter_id, created_at desc);

create or replace function public.on_report_auto_actions()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.blocks(blocker_id, blocked_id)
  values (new.reporter_id, new.reported_user_id)
  on conflict do nothing;

  delete from public.matches
  where (user_a = new.reporter_id and user_b = new.reported_user_id)
     or (user_a = new.reported_user_id and user_b = new.reporter_id);

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_reports_auto_actions'
  ) then
    create trigger trg_reports_auto_actions
      after insert on public.reports
      for each row
      execute function public.on_report_auto_actions();
  end if;
end
$$;

create or replace view public.report_rate_limit as
select reporter_id,
       count(*) filter (where created_at > timezone('utc', now()) - interval '10 minutes') as reports_last_10m
from public.reports
where created_at > timezone('utc', now()) - interval '10 minutes'
group by reporter_id;
