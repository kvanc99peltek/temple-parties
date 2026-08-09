-- Epic 2 safe-early: storage buckets posters + avatars
-- Additive. Dev may have neither; prod may already have posters (reconcile limits/mimes).

-- posters: public read, 1 MB, common image types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posters',
  'posters',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- avatars: public read, 512 KB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  524288,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies (idempotent via drop-if-exists)
DROP POLICY IF EXISTS "Public can read posters" ON storage.objects;
CREATE POLICY "Public can read posters"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'posters');

DROP POLICY IF EXISTS "Authenticated can upload posters" ON storage.objects;
CREATE POLICY "Authenticated can upload posters"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'posters'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Owners can update own posters" ON storage.objects;
CREATE POLICY "Owners can update own posters"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'posters' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'posters' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can delete own posters" ON storage.objects;
CREATE POLICY "Owners can delete own posters"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'posters' AND owner = auth.uid());

DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Owners can update own avatars" ON storage.objects;
CREATE POLICY "Owners can update own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can delete own avatars" ON storage.objects;
CREATE POLICY "Owners can delete own avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());
