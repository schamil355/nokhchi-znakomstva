--------------------------------------------------------------------------------
-- Profiles: privacy flags
--------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_incognito boolean not null default false,
  add column if not exists show_distance boolean not null default true,
  add column if not exists show_last_seen boolean not null default true;

--------------------------------------------------------------------------------
-- Photo assets + permissions
--------------------------------------------------------------------------------
create table if not exists public.photo_assets (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  blurred_path text,
  visibility_mode text not null default 'match_only'
    check (visibility_mode in ('public','match_only','whitelist','blurred_until_match')),
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.photo_permissions (
  photo_id bigint references public.photo_assets(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz default timezone('utc', now()),
  primary key (photo_id, viewer_id)
);

alter table public.photo_assets enable row level security;
alter table public.photo_permissions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'photo_assets_owner_manage') then
    create policy "photo_assets_owner_manage"
      on public.photo_assets
      using (auth.uid() = owner_id)
      with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'photo_permissions_owner_manage') then
    create policy "photo_permissions_owner_manage"
      on public.photo_permissions
      using (auth.uid() = (select owner_id from public.photo_assets where id = photo_id))
      with check (auth.uid() = (select owner_id from public.photo_assets where id = photo_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'photo_permissions_viewer_select') then
    create policy "photo_permissions_viewer_select"
      on public.photo_permissions
      for select
      using (auth.uid() = viewer_id);
  end if;
end $$;

--------------------------------------------------------------------------------
-- Storage buckets
--------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos_private', 'photos_private', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('photos_blurred', 'photos_blurred', true)
on conflict (id) do update set public = excluded.public;

--------------------------------------------------------------------------------
-- Storage policies for photos_private
--------------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'photos_private_insert_own'
  ) then
    create policy "photos_private_insert_own"
      on storage.objects
      for insert
      with check (
        bucket_id = 'photos_private'
        and auth.role() = 'authenticated'
        and auth.uid() = owner
        and position(concat(auth.uid(), '/') in name) = 1
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_private_select_owner_or_service'
  ) then
    create policy "photos_private_select_owner_or_service"
      on storage.objects
      for select
      using (
        bucket_id = 'photos_private'
        and (
          auth.uid() = owner
          or auth.role() = 'service_role'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_private_write_owner'
  ) then
    create policy "photos_private_write_owner"
      on storage.objects
      for update
      using (bucket_id = 'photos_private' and auth.uid() = owner)
      with check (bucket_id = 'photos_private' and auth.uid() = owner);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_private_delete_owner'
  ) then
    create policy "photos_private_delete_owner"
      on storage.objects
      for delete
      using (bucket_id = 'photos_private' and auth.uid() = owner);
  end if;
end $$;

--------------------------------------------------------------------------------
-- Storage policies for photos_blurred
--------------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'photos_blurred_public_read'
  ) then
    create policy "photos_blurred_public_read"
      on storage.objects
      for select
      using (bucket_id = 'photos_blurred');
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_blurred_owner_write'
  ) then
    create policy "photos_blurred_owner_write"
      on storage.objects
      for insert
      with check (
        bucket_id = 'photos_blurred'
        and auth.role() = 'authenticated'
        and auth.uid() = owner
        and position(concat(auth.uid(), '/') in name) = 1
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_blurred_owner_update'
  ) then
    create policy "photos_blurred_owner_update"
      on storage.objects
      for update
      using (bucket_id = 'photos_blurred' and auth.uid() = owner)
      with check (bucket_id = 'photos_blurred' and auth.uid() = owner);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_blurred_owner_delete'
  ) then
    create policy "photos_blurred_owner_delete"
      on storage.objects
      for delete
      using (bucket_id = 'photos_blurred' and auth.uid() = owner);
  end if;
end $$;

--------------------------------------------------------------------------------
-- Discovery view + RPC honouring incognito
--------------------------------------------------------------------------------
create or replace view public.discovery_profiles as
select p.*
from public.profiles p
where
  not coalesce(p.is_incognito, false)
  or exists (
      select 1
      from public.likes l
      where l.liker_id = p.id and l.likee_id = auth.uid()
    )
  or exists (
      select 1
      from public.matches m
      where (m.user_a = p.id and m.user_b = auth.uid())
         or (m.user_b = p.id and m.user_a = auth.uid())
    );

create or replace function public.get_discovery_profiles(p_limit integer default 50, p_offset integer default 0)
returns setof public.discovery_profiles
language sql
stable
security invoker
as $$
  select *
  from public.discovery_profiles
  order by updated_at desc nulls last, created_at desc
  limit greatest(coalesce(p_limit,50),1)
  offset greatest(coalesce(p_offset,0),0);
$$;
