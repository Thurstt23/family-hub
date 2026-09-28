-- Create media bucket for post photos
insert into storage.buckets (id, name, public) 
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects for select
using (bucket_id = 'media');

create policy "media insert members" on storage.objects for insert
with check (bucket_id = 'media' and auth.role() = 'authenticated');
