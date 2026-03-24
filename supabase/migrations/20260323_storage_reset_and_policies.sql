-- Storage reset + canonical buckets/policies for this project.
--
-- Purpose:
-- - Removes old/legacy storage.objects policies for `profile-images` and `event-attachments`.
-- - Recreates storage-safe helper functions (no `storage.objects.owner` dependency).
-- - Recreates secure, production-ready policies that match:
--     profile images path: avatars/{auth_user_id}/{filename}
--
-- Notes:
-- - Does NOT disable RLS.
-- - Does NOT allow public uploads: writes require a valid uid (auth.uid() or JWT sub) and correct folder.
-- - Includes `anon` in policy roles because Supabase Storage can execute under `anon` DB role even with a JWT,
--   while still populating request claims; policies remain strict via `storage_uid()` checks.

begin;

-- 1) Drop any existing policies on storage.objects that target these buckets.
do $$
declare
  r record;
  using_expr text;
  check_expr text;
begin
  for r in
    select pol.polname, pol.polrelid
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
  loop
    select pg_get_expr(pol.polqual, pol.polrelid),
           pg_get_expr(pol.polwithcheck, pol.polrelid)
      into using_expr, check_expr
    from pg_policy pol
    where pol.polrelid = r.polrelid
      and pol.polname = r.polname;

    if r.polname like 'profile_images_%'
       or r.polname like 'event_attachments_%'
       or coalesce(using_expr,'') like '%profile-images%'
       or coalesce(check_expr,'') like '%profile-images%'
       or coalesce(using_expr,'') like '%event-attachments%'
       or coalesce(check_expr,'') like '%event-attachments%'
    then
      execute format('drop policy if exists %I on storage.objects;', r.polname);
    end if;
  end loop;
end $$;

-- 2) Drop helper functions so we know exactly what code is in effect.
drop function if exists public.is_admin_jwt();
drop function if exists public.is_admin_storage();
drop function if exists public.storage_uid();

-- 3) Ensure buckets exist.
do $$
begin
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

-- 4) Recreate helpers (storage-safe).
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

-- 5) Canonical storage.objects policies.

-- event attachments: read for authenticated, write/delete for admins only
create policy "event_attachments_read_auth"
on storage.objects for select
to authenticated
using (bucket_id = 'event-attachments');

create policy "event_attachments_write_admin"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'event-attachments'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

create policy "event_attachments_delete_admin"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'event-attachments'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

-- profile images: user owns avatars/<uid>/..., admins all
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

