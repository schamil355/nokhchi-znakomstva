--------------------------------------------------------------------------------
-- Add public photos bucket for faster web delivery
--------------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('photos_public', 'photos_public', true)
on conflict (id) do update set public = excluded.public;

--------------------------------------------------------------------------------
-- Storage policies for photos_public
--------------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'photos_public_select_all'
  ) then
    create policy "photos_public_select_all"
      on storage.objects
      for select
      using (bucket_id = 'photos_public');
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_public_insert_own'
  ) then
    create policy "photos_public_insert_own"
      on storage.objects
      for insert
      with check (
        bucket_id = 'photos_public'
        and auth.role() = 'authenticated'
        and auth.uid() = owner
        and position(concat(auth.uid(), '/') in name) = 1
      );
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_public_update_own'
  ) then
    create policy "photos_public_update_own"
      on storage.objects
      for update
      using (bucket_id = 'photos_public' and auth.uid() = owner)
      with check (bucket_id = 'photos_public' and auth.uid() = owner);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'photos_public_delete_own'
  ) then
    create policy "photos_public_delete_own"
      on storage.objects
      for delete
      using (bucket_id = 'photos_public' and auth.uid() = owner);
  end if;
end $$;
