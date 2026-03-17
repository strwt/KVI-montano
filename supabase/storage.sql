-- KUSGAN Volunteer - Supabase Storage setup (event attachments)
-- Apply in Supabase SQL Editor after `schema.sql`.

begin;

-- Create bucket (id must match bucket_id used in `event_files`)
-- Note: `storage.create_bucket(...)` signature differs across Supabase versions.
-- This insert/upsert works reliably in SQL Editor.
insert into storage.buckets (id, name, public)
values ('event-attachments', 'event-attachments', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- Storage RLS policies live on `storage.objects`
-- Note: Supabase enables RLS on storage.objects by default.

-- Read: any authenticated user can view attachments
drop policy if exists "event_attachments_read_auth" on storage.objects;
create policy "event_attachments_read_auth"
on storage.objects for select
to authenticated
using (bucket_id = 'event-attachments');

-- Upload: admins only
drop policy if exists "event_attachments_write_admin" on storage.objects;
create policy "event_attachments_write_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-attachments'
  and public.is_admin()
);

-- Delete: admins only
drop policy if exists "event_attachments_delete_admin" on storage.objects;
create policy "event_attachments_delete_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-attachments'
  and public.is_admin()
);

commit;
