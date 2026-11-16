begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gamebrowzr-avatars', 'gamebrowzr-avatars', false, 262144, array['image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy gamebrowzr_avatar_read on storage.objects for select to authenticated
  using (bucket_id = 'gamebrowzr-avatars' and name = (select auth.uid())::text || '/avatar.webp');
create policy gamebrowzr_avatar_create on storage.objects for insert to authenticated
  with check (bucket_id = 'gamebrowzr-avatars' and name = (select auth.uid())::text || '/avatar.webp');
create policy gamebrowzr_avatar_replace on storage.objects for update to authenticated
  using (bucket_id = 'gamebrowzr-avatars' and name = (select auth.uid())::text || '/avatar.webp')
  with check (bucket_id = 'gamebrowzr-avatars' and name = (select auth.uid())::text || '/avatar.webp');

commit;

