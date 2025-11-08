--------------------------------------------------------------------------------
-- Photo assets & permissions tables (private storage)
--------------------------------------------------------------------------------
create table if not exists public.photo_assets (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'photos_private',
  storage_path text not null,
  blurred_bucket text not null default 'photos_blurred',
  blurred_path text,
  visibility_mode text not null default 'blurred_until_match'
    check (visibility_mode in ('public','match_only','whitelist','blurred_until_match')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_photo_assets_owner on public.photo_assets(owner_id);

create table if not exists public.photo_permissions (
  photo_id bigint not null references public.photo_assets(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (photo_id, viewer_id)
);

--------------------------------------------------------------------------------
-- Storage buckets (private)
--------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('photos_private', 'photos_private', false),
  ('photos_blurred', 'photos_blurred', false)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public;

--------------------------------------------------------------------------------
-- Storage policies for private buckets
--------------------------------------------------------------------------------
-- helper expression for first path segment
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'private originals write own'
  ) then
    create policy "private originals write own"
      on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'photos_private'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'private originals modify own'
  ) then
    create policy "private originals modify own"
      on storage.objects
      for update to authenticated
      using (
        bucket_id = 'photos_private'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      )
      with check (
        bucket_id = 'photos_private'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'private originals delete own'
  ) then
    create policy "private originals delete own"
      on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'photos_private'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'blurred write own'
  ) then
    create policy "blurred write own"
      on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'photos_blurred'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'blurred modify own'
  ) then
    create policy "blurred modify own"
      on storage.objects
      for update to authenticated
      using (
        bucket_id = 'photos_blurred'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      )
      with check (
        bucket_id = 'photos_blurred'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'blurred delete own'
  ) then
    create policy "blurred delete own"
      on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'photos_blurred'
        and coalesce(split_part(name, '/', 1), '') = auth.uid()::text
      );
  end if;
end $$;

-- remove generic read access; photos served via signed URLs only
revoke select on storage.objects from anon;
revoke select on storage.objects from authenticated;

--------------------------------------------------------------------------------
-- RLS policies for relational tables
--------------------------------------------------------------------------------
alter table public.photo_assets enable row level security;
alter table public.photo_permissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'owner manages photo_assets'
      and tablename = 'photo_assets'
  ) then
    create policy "owner manages photo_assets"
      on public.photo_assets
      for all
      using (auth.uid() = owner_id)
      with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'owner manages photo_permissions'
      and tablename = 'photo_permissions'
  ) then
    create policy "owner manages photo_permissions"
      on public.photo_permissions
      for all
      using (
        auth.uid() = (
          select owner_id from public.photo_assets where id = photo_id
        )
      )
      with check (
        auth.uid() = (
          select owner_id from public.photo_assets where id = photo_id
        )
      );
  end if;
end $$;
