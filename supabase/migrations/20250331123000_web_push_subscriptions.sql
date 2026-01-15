--------------------------------------------------------------------------------
-- Web push subscriptions
--------------------------------------------------------------------------------

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, endpoint)
);

create index if not exists web_push_subscriptions_user_idx on public.web_push_subscriptions(user_id);

alter table public.web_push_subscriptions enable row level security;

create policy "web_push_owner_select"
  on public.web_push_subscriptions
  for select
  using (auth.uid() = user_id);

create policy "web_push_owner_insert"
  on public.web_push_subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy "web_push_owner_update"
  on public.web_push_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "web_push_owner_delete"
  on public.web_push_subscriptions
  for delete
  using (auth.uid() = user_id);

create trigger trg_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row
execute function public.set_updated_at();

grant select, insert, update, delete on public.web_push_subscriptions to authenticated;
