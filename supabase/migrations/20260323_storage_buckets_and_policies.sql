-- Storage buckets + RLS policies (canonical).
-- - No dependency on `storage.objects.owner` (it is not reliably set by Supabase Storage).
-- - Works even when Storage executes under the `anon` DB role (policies include anon+authenticated),
--   while still requiring a valid authenticated identity (auth.uid() or JWT sub).
-- - Avoids calling `public.is_admin()` inside storage policies (recursion-prone).

begin;

-- Buckets
do $$
begin
  -- Private bucket: event attachments
  if not exists (select 1 from storage.buckets where id = 'event-attachments') then
    begin
      insert into storage.buckets (id, name, "public")
      values ('event-attachments', 'event-attachments', false)
      on conflict (id) do nothing;
    exception
      when undefined_column then
        insert into storage.buckets (id, name)
        values ('event-attachments', 'event-attachments')
        on conflict (id) do nothing;
    end;
  end if;

  -- Public bucket: profile images (renderable without auth headers)
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

-- Helpers (storage-safe)
create or replace function public.is_admin_jwt()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin';
$$;

create or replace function public.storage_uid()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.uid()::text, ''),
    nullif(auth.jwt() ->> 'sub', '')
  );
$$;

-- SECURITY DEFINER so it can safely read profiles without RLS recursion.
-- plpgsql avoids hard dependency on `public.profiles` existing at function creation time.
create or replace function public.is_admin_storage()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.profiles') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
end;
$$;

revoke all on function public.is_admin_jwt() from public;
grant execute on function public.is_admin_jwt() to anon, authenticated;

revoke all on function public.storage_uid() from public;
grant execute on function public.storage_uid() to anon, authenticated;

revoke all on function public.is_admin_storage() from public;
grant execute on function public.is_admin_storage() to anon, authenticated;

-- STORAGE POLICIES: event attachments
drop policy if exists "event_attachments_read_auth" on storage.objects;
create policy "event_attachments_read_auth"
on storage.objects for select
to authenticated
using (bucket_id = 'event-attachments');

drop policy if exists "event_attachments_write_admin" on storage.objects;
create policy "event_attachments_write_admin"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'event-attachments'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

drop policy if exists "event_attachments_delete_admin" on storage.objects;
create policy "event_attachments_delete_admin"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'event-attachments'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

-- STORAGE POLICIES: profile images
drop policy if exists "profile_images_insert_own_or_admin" on storage.objects;
create policy "profile_images_insert_own_or_admin"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'profile-images'
  and (
    public.is_admin_jwt()
    or public.is_admin_storage()
    or (
      public.storage_uid() is not null
      and (storage.foldername(ltrim(name, '/')))[1] = 'avatars'
      and (storage.foldername(ltrim(name, '/')))[2] = public.storage_uid()
    )
  )
);

drop policy if exists "profile_images_update_own_or_admin" on storage.objects;
create policy "profile_images_update_own_or_admin"
on storage.objects for update
to anon, authenticated
using (
  bucket_id = 'profile-images'
  and (
    public.is_admin_jwt()
    or public.is_admin_storage()
    or (
      public.storage_uid() is not null
      and (storage.foldername(ltrim(name, '/')))[1] = 'avatars'
      and (storage.foldername(ltrim(name, '/')))[2] = public.storage_uid()
    )
  )
)
with check (
  bucket_id = 'profile-images'
  and (
    public.is_admin_jwt()
    or public.is_admin_storage()
    or (
      public.storage_uid() is not null
      and (storage.foldername(ltrim(name, '/')))[1] = 'avatars'
      and (storage.foldername(ltrim(name, '/')))[2] = public.storage_uid()
    )
  )
);

drop policy if exists "profile_images_delete_own_or_admin" on storage.objects;
create policy "profile_images_delete_own_or_admin"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'profile-images'
  and (
    public.is_admin_jwt()
    or public.is_admin_storage()
    or (
      public.storage_uid() is not null
      and (storage.foldername(ltrim(name, '/')))[1] = 'avatars'
      and (storage.foldername(ltrim(name, '/')))[2] = public.storage_uid()
    )
  )
);

commit;

