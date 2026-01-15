--------------------------------------------------------------------------------
-- Plans tab tables + RLS
--------------------------------------------------------------------------------
create table if not exists public.date_plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','published','cancelled','completed')),
  date_type text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  area_label text not null,
  vibe_tags text[],
  budget_min int,
  budget_max int,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_time > start_time)
);

create index if not exists date_plans_creator_idx on public.date_plans(creator_id);
create index if not exists date_plans_status_idx on public.date_plans(status);
create index if not exists date_plans_start_time_idx on public.date_plans(start_time);

drop trigger if exists trg_date_plans_updated_at on public.date_plans;
create trigger trg_date_plans_updated_at
before update on public.date_plans
for each row
execute function public.set_updated_at();

create table if not exists public.plan_invites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.date_plans(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','passed','cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index if not exists plan_invites_to_user_idx on public.plan_invites(to_user_id);
create index if not exists plan_invites_from_user_idx on public.plan_invites(from_user_id);
create index if not exists plan_invites_plan_idx on public.plan_invites(plan_id);
create index if not exists plan_invites_status_idx on public.plan_invites(status);

drop trigger if exists trg_plan_invites_updated_at on public.plan_invites;
create trigger trg_plan_invites_updated_at
before update on public.plan_invites
for each row
execute function public.set_updated_at();

create table if not exists public.plan_messages (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.plan_invites(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists plan_messages_invite_created_idx
  on public.plan_messages(invite_id, created_at desc);

create table if not exists public.plan_checkins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.date_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('on_my_way','arrived','all_good')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists plan_checkins_plan_created_idx
  on public.plan_checkins(plan_id, created_at desc);
create index if not exists plan_checkins_user_idx
  on public.plan_checkins(user_id);

--------------------------------------------------------------------------------
-- RLS policies
--------------------------------------------------------------------------------
alter table public.date_plans enable row level security;
alter table public.plan_invites enable row level security;
alter table public.plan_messages enable row level security;
alter table public.plan_checkins enable row level security;

drop policy if exists "date_plans creator select" on public.date_plans;
create policy "date_plans creator select"
  on public.date_plans
  for select
  using (creator_id = auth.uid());

drop policy if exists "date_plans invitee select" on public.date_plans;
create policy "date_plans invitee select"
  on public.date_plans
  for select
  using (
    exists (
      select 1 from public.plan_invites i
      where i.plan_id = date_plans.id
        and i.to_user_id = auth.uid()
    )
  );

drop policy if exists "date_plans creator insert" on public.date_plans;
create policy "date_plans creator insert"
  on public.date_plans
  for insert
  with check (creator_id = auth.uid());

drop policy if exists "date_plans creator update" on public.date_plans;
create policy "date_plans creator update"
  on public.date_plans
  for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "date_plans creator delete" on public.date_plans;
create policy "date_plans creator delete"
  on public.date_plans
  for delete
  using (creator_id = auth.uid());

drop policy if exists "plan_invites participants select" on public.plan_invites;
create policy "plan_invites participants select"
  on public.plan_invites
  for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "plan_invites creator insert" on public.plan_invites;
create policy "plan_invites creator insert"
  on public.plan_invites
  for insert
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.date_plans p
      where p.id = plan_invites.plan_id
        and p.creator_id = auth.uid()
        and p.status = 'published'
    )
  );

drop policy if exists "plan_invites invitee update" on public.plan_invites;
create policy "plan_invites invitee update"
  on public.plan_invites
  for update
  using (to_user_id = auth.uid() and status = 'pending')
  with check (to_user_id = auth.uid() and status in ('accepted','passed'));

drop policy if exists "plan_invites inviter cancel" on public.plan_invites;
create policy "plan_invites inviter cancel"
  on public.plan_invites
  for update
  using (from_user_id = auth.uid() and status = 'pending')
  with check (from_user_id = auth.uid() and status = 'cancelled');

drop policy if exists "plan_messages participants select" on public.plan_messages;
create policy "plan_messages participants select"
  on public.plan_messages
  for select
  using (
    exists (
      select 1 from public.plan_invites i
      where i.id = plan_messages.invite_id
        and i.status = 'accepted'
        and auth.uid() in (i.from_user_id, i.to_user_id)
    )
  );

drop policy if exists "plan_messages participants insert" on public.plan_messages;
create policy "plan_messages participants insert"
  on public.plan_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.plan_invites i
      where i.id = plan_messages.invite_id
        and i.status = 'accepted'
        and auth.uid() in (i.from_user_id, i.to_user_id)
    )
  );

drop policy if exists "plan_checkins participants select" on public.plan_checkins;
create policy "plan_checkins participants select"
  on public.plan_checkins
  for select
  using (
    exists (
      select 1 from public.date_plans p
      where p.id = plan_checkins.plan_id
        and p.creator_id = auth.uid()
    )
    or exists (
      select 1 from public.plan_invites i
      where i.plan_id = plan_checkins.plan_id
        and i.to_user_id = auth.uid()
        and i.status = 'accepted'
    )
  );

drop policy if exists "plan_checkins participants insert" on public.plan_checkins;
create policy "plan_checkins participants insert"
  on public.plan_checkins
  for insert
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.date_plans p
        where p.id = plan_checkins.plan_id
          and p.creator_id = auth.uid()
      )
      or exists (
        select 1 from public.plan_invites i
        where i.plan_id = plan_checkins.plan_id
          and i.to_user_id = auth.uid()
          and i.status = 'accepted'
      )
    )
  );

grant select, insert, update, delete on public.date_plans to authenticated;
grant select, insert, update on public.plan_invites to authenticated;
grant select, insert on public.plan_messages to authenticated;
grant select, insert on public.plan_checkins to authenticated;
