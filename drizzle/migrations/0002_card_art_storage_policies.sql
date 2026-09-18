create policy "card art readable by authed"
on storage.objects for select to authenticated
using (bucket_id = 'card-art');

create policy "card art upload own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'card-art' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card art update own folder"
on storage.objects for update to authenticated
using (bucket_id = 'card-art' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card art delete own folder"
on storage.objects for delete to authenticated
using (bucket_id = 'card-art' and (storage.foldername(name))[1] = auth.uid()::text);
