--------------------------------------------------------------------------------
-- Fix mutable search_path on functions (only alter if function exists)
--------------------------------------------------------------------------------

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'on_report_auto_actions'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'handle_like_to_match'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'match_candidates_by_vector'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'sync_profile_ids'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'set_updated_at'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'geo_distance_km'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;

do $$
declare f regprocedure;
begin
  select p.oid::regprocedure into f
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_candidates_region'
  limit 1;
  if f is not null then
    execute format('alter function %s set search_path = public', f);
  end if;
end $$;
