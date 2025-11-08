--------------------------------------------------------------------------------
-- RPC: get_feed_candidates
--------------------------------------------------------------------------------
create or replace function public.get_feed_candidates(uid uuid, lim int default 24)
returns table (
  user_id uuid,
  full_name text,
  country char(2),
  region_code text,
  verified_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select p.id,
           p.country,
           p.region_code,
           coalesce(sp.region_mode, 'NEARBY') as region_mode,
           coalesce(p.region_code = 'CHECHNYA', false) as in_chechnya,
           coalesce(p.country = 'RU', false) as in_russia
    from public.profiles p
    left join public.search_prefs sp on sp.user_id = p.id
    where p.id = uid
  ),
  already as (
    select likee_id as other from public.likes where liker_id = uid
    union
    select passee_id from public.passes where passer_id = uid
    union
    select case when m.user_a = uid then m.user_b else m.user_a end
    from public.matches m where uid in (m.user_a, m.user_b)
  )
  select p.id as user_id,
         p.display_name as full_name,
         p.country,
         p.region_code,
         p.verified_at
  from public.profiles p, me
  where p.id <> uid
    and p.id not in (select other from already)
    and (
      (me.region_mode = 'NEARBY'::search_region_mode and p.country = me.country)
      or (me.region_mode = 'CHECHNYA'::search_region_mode and p.region_code = 'CHECHNYA')
      or (
        me.region_mode = 'EUROPE'::search_region_mode
        and p.country = any (
          select unnest(country_codes) from public.region_sets where id = 'EU_BASE'
        )
      )
      or (me.region_mode = 'RUSSIA'::search_region_mode and p.country = 'RU')
    )
  limit coalesce(lim, 24);
$$;

revoke all on function public.get_feed_candidates(uid uuid, lim int) from public;
grant execute on function public.get_feed_candidates(uid uuid, lim int) to authenticated;
