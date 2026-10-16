-- Phase 10 hardening of Storage.
-- 1. The `avatars` bucket used by /me was never created by a migration, so a
--    fresh project (or `supabase db reset`) had no working avatar upload.
-- 2. Both buckets now refuse anything that is not a raster image or is over
--    10MB, at the Storage API itself. SVG is excluded: it can carry script.
--    The avatar action additionally sniffs magic bytes (lib/images/sniff.ts).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'media';

create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

-- Members write only inside their own folder: <user id>/<file>.
create policy "avatars own folder insert" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars own folder delete" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
