--------------------------------------------------------------------------------
-- Ensure matches table exposes a real unique constraint for upsert_match
--------------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'matches'
      and indexname = 'matches_pair_unique'
  ) then
    execute 'drop index if exists public.matches_pair_unique';
  end if;
end $$;

alter table public.matches
  drop constraint if exists matches_pair_unique,
  add constraint matches_pair_unique unique (user_a, user_b);
