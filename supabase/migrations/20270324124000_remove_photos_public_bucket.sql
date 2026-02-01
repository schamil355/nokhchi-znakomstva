-- Remove redundant photos_public bucket and policies

-- Drop policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photos_public_select_all') THEN
    DROP POLICY "photos_public_select_all" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photos_public_insert_own') THEN
    DROP POLICY "photos_public_insert_own" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photos_public_update_own') THEN
    DROP POLICY "photos_public_update_own" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photos_public_delete_own') THEN
    DROP POLICY "photos_public_delete_own" ON storage.objects;
  END IF;
END $$;

-- Remove objects first to avoid FK constraints (no-op if empty)
DELETE FROM storage.objects WHERE bucket_id = 'photos_public';

-- Remove the bucket itself
DELETE FROM storage.buckets WHERE id = 'photos_public';
