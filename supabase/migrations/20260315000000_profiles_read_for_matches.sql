-------------------------------------------------------------------------------
-- Allow authenticated users to read basic profile fields (names/photos)
-- Needed for showing match avatars/names in the client
-------------------------------------------------------------------------------

-- Ensure RLS is enabled
alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles read public'
  ) then
    create policy "profiles read public"
      on public.profiles
      for select
      using (true);
  end if;
end $$;

-- Optional: keep write access unchanged; this migration only adds read
