-- Profile vouches: support trusted vouch counts

create table if not exists public.profile_vouches (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.profiles(id) on delete cascade,
  vouched_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  check (voucher_id <> vouched_id)
);

create unique index if not exists profile_vouches_unique
  on public.profile_vouches (voucher_id, vouched_id);

create index if not exists profile_vouches_vouched_idx
  on public.profile_vouches (vouched_id);

create index if not exists profile_vouches_voucher_idx
  on public.profile_vouches (voucher_id);

alter table public.profile_vouches enable row level security;

-- Recalculate vouch_count from vouch rows (minimum 1 when verified)
create or replace function public.recompute_vouch_count(p_profile_id uuid)
returns void
language plpgsql
as $$
begin
  update public.profiles p
  set vouch_count = greatest(
    case when p.verified is true then 1 else 0 end,
    (select count(*) from public.profile_vouches pv where pv.vouched_id = p_profile_id)
  )
  where p.id = p_profile_id;
end;
$$;

create or replace function public.sync_vouch_count_from_vouches()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recompute_vouch_count(new.vouched_id);
  elsif tg_op = 'DELETE' then
    perform public.recompute_vouch_count(old.vouched_id);
  elsif tg_op = 'UPDATE' then
    if new.vouched_id is distinct from old.vouched_id then
      perform public.recompute_vouch_count(old.vouched_id);
    end if;
    perform public.recompute_vouch_count(new.vouched_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_profile_vouches_sync on public.profile_vouches;
create trigger trg_profile_vouches_sync
after insert or update or delete on public.profile_vouches
for each row
execute function public.sync_vouch_count_from_vouches();
