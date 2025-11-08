-- Extensions
create extension if not exists postgis;
create extension if not exists "pgcrypto";

-------------------------------------------------------------------------------
-- 1) Likes / Passes
-------------------------------------------------------------------------------
create table if not exists public.likes (
  liker_id uuid not null references public.profiles(id) on delete cascade,
  likee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (liker_id, likee_id),
  check (liker_id <> likee_id)
);

create index if not exists likes_likee_idx on public.likes(likee_id);

create table if not exists public.passes (
  passer_id uuid not null references public.profiles(id) on delete cascade,
  passee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (passer_id, passee_id),
  check (passer_id <> passee_id)
);

-------------------------------------------------------------------------------
-- 2) Matches
-------------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  check (user_a <> user_b)
);

create unique index if not exists matches_pair_unique
  on public.matches (least(user_a, user_b), greatest(user_a, user_b));

-------------------------------------------------------------------------------
-- 3) Messages
-------------------------------------------------------------------------------
create table if not exists public.messages (
  id bigserial primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists messages_match_idx on public.messages(match_id, created_at desc);

-------------------------------------------------------------------------------
-- 4) Trigger: bei Like → ggf. Match erzeugen
-------------------------------------------------------------------------------
create or replace function public.handle_like_to_match()
returns trigger
language plpgsql
as $$
declare
  a uuid := least(new.liker_id, new.likee_id);
  b uuid := greatest(new.liker_id, new.likee_id);
begin
  if exists (
    select 1 from public.likes
    where liker_id = new.likee_id and likee_id = new.liker_id
  ) then
    insert into public.matches(user_a, user_b)
    values (a, b)
    on conflict (least(user_a, user_b), greatest(user_a, user_b)) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_like_to_match on public.likes;
create trigger trg_like_to_match
after insert on public.likes
for each row execute function public.handle_like_to_match();

-------------------------------------------------------------------------------
-- 5) RLS + Policies
-------------------------------------------------------------------------------
alter table public.likes    enable row level security;
alter table public.passes   enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;

drop policy if exists "likes self rw" on public.likes;
create policy "likes self rw" on public.likes
  using (auth.uid() = liker_id)
  with check (auth.uid() = liker_id);

drop policy if exists "passes self rw" on public.passes;
create policy "passes self rw" on public.passes
  using (auth.uid() = passer_id)
  with check (auth.uid() = passer_id);

drop policy if exists "matches participants r" on public.matches;
create policy "matches participants r" on public.matches
  for select using (auth.uid() in (user_a, user_b));

drop policy if exists "messages participants r" on public.messages;
create policy "messages participants r" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and auth.uid() in (m.user_a, m.user_b)
    )
  );

drop policy if exists "messages sender w" on public.messages;
create policy "messages sender w" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and auth.uid() in (m.user_a, m.user_b)
    )
  );

grant select, insert, delete on public.likes, public.passes to authenticated;
grant select on public.matches to authenticated;
grant select, insert on public.messages to authenticated;
