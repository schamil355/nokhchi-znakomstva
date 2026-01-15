-- Vouch policies and admin RPCs

set check_function_bodies = off;

create or replace function public.sync_vouch_count_from_verified()
returns trigger
language plpgsql
as $$
declare
  vouch_total integer;
begin
  select count(*)
  into vouch_total
  from public.profile_vouches
  where vouched_id = new.id;

  new.vouch_count := greatest(
    case when new.verified is true then 1 else 0 end,
    coalesce(vouch_total, 0)
  );

  return new;
end;
$$;

drop policy if exists "profile_vouches self insert" on public.profile_vouches;
create policy "profile_vouches self insert"
  on public.profile_vouches
  for insert
  with check (
    auth.uid() = voucher_id
    and exists (
      select 1
      from public.matches m
      join public.messages msg on msg.match_id = m.id
      where (
        (m.user_a = auth.uid() and m.user_b = vouched_id)
        or (m.user_b = auth.uid() and m.user_a = vouched_id)
      )
      and msg.sender_id = auth.uid()
    )
  );

drop policy if exists "profile_vouches service role manage" on public.profile_vouches;
create policy "profile_vouches service role manage"
  on public.profile_vouches
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.admin_list_vouches(target_user uuid)
returns table (
  id uuid,
  voucher_id uuid,
  voucher_email text,
  voucher_name text,
  vouched_id uuid,
  vouched_email text,
  vouched_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  select
    pv.id,
    pv.voucher_id,
    u1.email,
    coalesce(p1.display_name, u1.raw_user_meta_data->>'display_name') as voucher_name,
    pv.vouched_id,
    u2.email,
    coalesce(p2.display_name, u2.raw_user_meta_data->>'display_name') as vouched_name,
    pv.created_at
  from public.profile_vouches pv
  left join auth.users u1 on u1.id = pv.voucher_id
  left join public.profiles p1 on p1.id = pv.voucher_id
  left join auth.users u2 on u2.id = pv.vouched_id
  left join public.profiles p2 on p2.id = pv.vouched_id
  where target_user is not null
    and pv.vouched_id = target_user
  order by pv.created_at desc;
end;
$$;

create or replace function public.admin_add_vouch(voucher_id uuid, vouched_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if voucher_id is null or vouched_id is null or voucher_id = vouched_id then
    return;
  end if;

  insert into public.profile_vouches (voucher_id, vouched_id)
  values (voucher_id, vouched_id)
  on conflict (voucher_id, vouched_id) do nothing;
end;
$$;

create or replace function public.admin_remove_vouch(vouch_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if vouch_id is null then
    return;
  end if;

  delete from public.profile_vouches
  where id = vouch_id;
end;
$$;

grant execute on function public.admin_list_vouches(uuid) to service_role;
grant execute on function public.admin_add_vouch(uuid, uuid) to service_role;
grant execute on function public.admin_remove_vouch(uuid) to service_role;
