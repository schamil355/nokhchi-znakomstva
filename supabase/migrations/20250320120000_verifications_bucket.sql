-- Create private bucket for selfie verifications
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- Ensure RLS is enabled
alter table if exists storage.objects enable row level security;

-- Only allow owners to insert/select their own objects in verifications bucket
create policy if not exists "verifications_insert_own" on storage.objects
  for insert
  with check (
    bucket_id = 'verifications'
    and auth.uid() = owner
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy if not exists "verifications_select_own" on storage.objects
  for select
  using (
    bucket_id = 'verifications'
    and auth.uid() = owner
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Extend profiles with verification metadata
alter table public.profiles
  add column if not exists primary_photo_path text,
  add column if not exists verified boolean default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_method text,
  add column if not exists verified_face_score numeric;
