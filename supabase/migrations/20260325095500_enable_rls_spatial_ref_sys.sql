--------------------------------------------------------------------------------
-- Enable RLS on spatial_ref_sys (public) to satisfy security lint
--------------------------------------------------------------------------------
do $$
declare
  owner_name text;
begin
  select pg_get_userbyid(relowner)
    into owner_name
  from pg_class
  where oid = 'public.spatial_ref_sys'::regclass;

  if owner_name = current_user then
    execute 'alter table public.spatial_ref_sys enable row level security';
  else
    raise notice 'Skipping RLS enable on spatial_ref_sys: current_user % is not owner %', current_user, owner_name;
  end if;
end $$;
