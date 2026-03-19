-- Profile images storage bucket + policies.
-- Public bucket so images can be used directly in <img src="..."> without auth headers.

begin;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'profile-images') then
    begin
      insert into storage.buckets (id, name, "public")
      values ('profile-images', 'profile-images', true)
      on conflict (id) do nothing;
    exception
      when undefined_column then
        insert into storage.buckets (id, name)
        values ('profile-images', 'profile-images')
        on conflict (id) do nothing;
    end;
  end if;
end $$;

-- Allow authenticated users to upload/update/delete their own avatar path, admins can manage all.
drop policy if exists "profile_images_insert_own_or_admin" on storage.objects;
create policy "profile_images_insert_own_or_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (
    public.is_admin()
    or (
      owner = auth.uid()
      and name like ('avatars/' || auth.uid() || '/%')
    )
  )
);

drop policy if exists "profile_images_update_own_or_admin" on storage.objects;
create policy "profile_images_update_own_or_admin"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (public.is_admin() or owner = auth.uid())
)
with check (
  bucket_id = 'profile-images'
  and (
    public.is_admin()
    or (
      owner = auth.uid()
      and name like ('avatars/' || auth.uid() || '/%')
    )
  )
);

drop policy if exists "profile_images_delete_own_or_admin" on storage.objects;
create policy "profile_images_delete_own_or_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (
    public.is_admin()
    or (
      owner = auth.uid()
      and name like ('avatars/' || auth.uid() || '/%')
    )
  )
);

commit;

