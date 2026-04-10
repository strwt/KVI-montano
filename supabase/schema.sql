-- KUSGAN Volunteer - Supabase schema + RLS
-- Apply in Supabase SQL Editor (project: Settings -> SQL Editor).
-- Assumptions:
-- - One organization (shared data).
-- - Supabase Auth is the source of user identity.

begin;

-- Extensions (safe if already enabled)
create extension if not exists pgcrypto;

-- Timestamp helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (app users) linked to Supabase Auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'member' check (role in ('admin','member')),
  name text not null default '',
  id_number text unique,
  contact_number text,
  emergency_contact_number text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  address text,
  blood_type text,
  insurance_status text not null default 'N/A',
  insurance_year text,
  committee text,
  member_since date,
  profile_image text,
  account_status text not null default 'Active',
  status text not null default 'active',
  app_language text not null default 'English',
  dark_mode boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Helpers (depends on public.profiles existing)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- JWT-only helper for storage policies (recursion-safe).
create or replace function public.is_admin_jwt()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin';
$$;

-- Storage-safe admin helper: SECURITY DEFINER avoids RLS recursion and does not depend on `auth.jwt()` existing.
create or replace function public.is_admin_storage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- Recursion-safe UID helper for storage policies.
-- Storage can expose either `auth.uid()` or `auth.jwt()` depending on the request path/service.
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

revoke all on function public.is_admin_jwt() from public;
grant execute on function public.is_admin_jwt() to anon, authenticated;

revoke all on function public.is_admin_storage() from public;
grant execute on function public.is_admin_storage() to anon, authenticated;

revoke all on function public.storage_uid() from public;
grant execute on function public.storage_uid() to anon, authenticated;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, name, id_number)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_app_meta_data->>'role', ''), 'member'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'id_number', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        role = coalesce(nullif(new.raw_app_meta_data->>'role', ''), public.profiles.role);
  return new;
end;
$$;

create or replace function public.sync_auth_user_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role)
  where id = new.id
    and coalesce(raw_app_meta_data->>'role', '') is distinct from new.role;

  return new;
end;
$$;

-- Helper for ID-number login: resolve email without exposing profiles table to anon
create or replace function public.get_email_for_id_number(p_id_number text)
returns text
language sql
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id_number is not null
    and regexp_replace(lower(p.id_number), '[^a-z0-9]', '', 'g')
      = regexp_replace(lower(nullif(trim(p_id_number), '')), '[^a-z0-9]', '', 'g')
  limit 1;
$$;

revoke all on function public.get_email_for_id_number(text) from public;
grant execute on function public.get_email_for_id_number(text) to anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_sync_auth_user_role on public.profiles;
create trigger profiles_sync_auth_user_role
after insert or update of role on public.profiles
for each row execute function public.sync_auth_user_role();

-- Backfill helper: create missing profiles for existing auth.users
create or replace function public.backfill_profiles()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.profiles (id, email, name, id_number)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'id_number', '')
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
  on conflict (id) do nothing;

  get diagnostics inserted_count = row_count;

  update auth.users u
  set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
  from public.profiles p
  where p.id = u.id
    and coalesce(u.raw_app_meta_data->>'role', '') is distinct from p.role;

  return inserted_count;
end;
$$;

-- Committees (member grouping; used for USERS only)
create table if not exists public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.committees
  drop constraint if exists committees_name_not_blank,
  add constraint committees_name_not_blank check (btrim(name) <> '');

-- Legacy `event_categories` removed in favor of `public.categories` (typed fields + reporting).

-- Categories (admin-managed, strict typed dynamic fields for activity records + reports)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.categories
  drop constraint if exists categories_name_not_blank,
  add constraint categories_name_not_blank check (btrim(name) <> '');

create table if not exists public.category_fields (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  field_name text not null,
  field_type text not null check (field_type in ('text','number','date','boolean')),
  created_at timestamptz not null default now(),
  unique (category_id, field_name)
);

alter table public.category_fields
  drop constraint if exists category_fields_name_not_blank,
  add constraint category_fields_name_not_blank check (btrim(field_name) <> '');

create unique index if not exists category_fields_unique_lower_name_idx
on public.category_fields (category_id, lower(field_name));

create table if not exists public.activity_records (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_values (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.activity_records(id) on delete cascade,
  field_id uuid not null references public.category_fields(id) on delete cascade,
  value_text text null,
  value_number numeric null,
  value_date timestamptz null,
  value_boolean boolean null,
  created_at timestamptz not null default now(),
  unique (record_id, field_id)
);

alter table public.activity_values
  drop constraint if exists activity_values_exactly_one_value,
  add constraint activity_values_exactly_one_value check (
    (case when value_text is null then 0 else 1 end) +
    (case when value_number is null then 0 else 1 end) +
    (case when value_date is null then 0 else 1 end) +
    (case when value_boolean is null then 0 else 1 end)
    = 1
  );

create or replace function public.enforce_activity_values_typed()
returns trigger
language plpgsql
as $$
declare
  expected_type text;
  field_category uuid;
  record_category uuid;
begin
  select cf.field_type, cf.category_id
  into expected_type, field_category
  from public.category_fields cf
  where cf.id = new.field_id;

  if expected_type is null then
    raise exception 'Unknown field_id %', new.field_id using errcode = '23503';
  end if;

  select ar.category_id
  into record_category
  from public.activity_records ar
  where ar.id = new.record_id;

  if record_category is null then
    raise exception 'Unknown record_id %', new.record_id using errcode = '23503';
  end if;

  if record_category <> field_category then
    raise exception 'Field % does not belong to record category', new.field_id using errcode = '23514';
  end if;

  if expected_type = 'text' then
    if new.value_text is null or new.value_number is not null or new.value_date is not null or new.value_boolean is not null then
      raise exception 'field_type text requires value_text only' using errcode = '23514';
    end if;
  elsif expected_type = 'number' then
    if new.value_number is null or new.value_text is not null or new.value_date is not null or new.value_boolean is not null then
      raise exception 'field_type number requires value_number only' using errcode = '23514';
    end if;
  elsif expected_type = 'date' then
    if new.value_date is null or new.value_text is not null or new.value_number is not null or new.value_boolean is not null then
      raise exception 'field_type date requires value_date only' using errcode = '23514';
    end if;
  elsif expected_type = 'boolean' then
    if new.value_boolean is null or new.value_text is not null or new.value_number is not null or new.value_date is not null then
      raise exception 'field_type boolean requires value_boolean only' using errcode = '23514';
    end if;
  else
    raise exception 'Unsupported field_type %', expected_type using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists activity_values_enforce_typed on public.activity_values;
create trigger activity_values_enforce_typed
before insert or update on public.activity_values
for each row execute function public.enforce_activity_values_typed();

-- Events (kept close to current localStorage shape)
create table if not exists public.events (
  id bigint primary key,
  title text not null default '',
  content text not null default '',
  category text not null,
  date_time timestamptz not null,
  address text not null default '',
  location jsonb,
  branch text not null default '',
  members_involve text not null default '',
  assigned_member_ids text[] not null default '{}'::text[],
  status text not null default 'ongoing' check (status in ('ongoing','done')),
  category_data jsonb not null default '{}'::jsonb,
  viewed_by jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

-- Event views (recommended; avoids members needing to update events row)
create table if not exists public.event_views (
  event_id bigint not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- Recruitments (public inserts, admin reviews)
create table if not exists public.recruitments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  id_number text,
  contact_number text not null,
  emergency_contact_number text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  address text not null,
  blood_type text not null,
  insurance_status text not null default 'N/A',
  insurance_year text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id),
  notes text,
  unique (email)
);

-- Donations (public inserts, admin-only read/delete)
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text,
  donor_email text,
  reference_no text,
  created_at timestamptz not null default now()
);

-- Login activity (client upserts on login)
create table if not exists public.login_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  last_login_at timestamptz not null default now(),
  is_online boolean not null default false,
  last_status_at timestamptz,
  is_present boolean not null default false,
  present_at timestamptz,
  status text,
  time_in timestamptz,
  time_out timestamptz,
  time_out_reason text,
  unique (user_id, date)
);

alter table public.login_activity
  drop constraint if exists login_activity_status_not_blank,
  add constraint login_activity_status_not_blank check (status is null or btrim(status) <> '');

-- Fast lookup for today's present members (admin dashboard)
create index if not exists login_activity_present_by_date_idx
on public.login_activity (date, user_id)
where is_present is true;

-- In-app notifications (event assignment, reminders, etc.)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  event_id bigint references public.events(id) on delete cascade,
  title text not null default '',
  category text,
  date_time timestamptz,
  details text,
  assigned_by text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Event file metadata (storage objects referenced here)
create table if not exists public.event_files (
  id uuid primary key default gen_random_uuid(),
  event_id bigint not null references public.events(id) on delete cascade,
  bucket_id text not null default 'event-attachments',
  object_path text not null,
  filename text,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.committees enable row level security;
alter table public.categories enable row level security;
alter table public.category_fields enable row level security;
alter table public.activity_records enable row level security;
alter table public.activity_values enable row level security;
 alter table public.events enable row level security;
 alter table public.event_views enable row level security;
 alter table public.recruitments enable row level security;
 alter table public.donations enable row level security;
 alter table public.login_activity enable row level security;
 alter table public.event_files enable row level security;
 alter table public.notifications enable row level security;

-- PROFILES
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles for delete
to authenticated
using (public.is_admin());

-- COMMITTEES
drop policy if exists committees_select_auth on public.committees;
create policy committees_select_auth
on public.committees for select
to authenticated
using (true);

drop policy if exists committees_write_admin on public.committees;
create policy committees_write_admin
on public.committees for insert
to authenticated
with check (public.is_admin());

drop policy if exists committees_update_admin on public.committees;
create policy committees_update_admin
on public.committees for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists committees_delete_admin on public.committees;
create policy committees_delete_admin
on public.committees for delete
to authenticated
using (public.is_admin());

-- CATEGORIES (STRICT TYPED DYNAMIC FORMS)
drop policy if exists categories_select_auth on public.categories;
create policy categories_select_auth
on public.categories for select
to authenticated
using (true);

drop policy if exists categories_write_admin on public.categories;
create policy categories_write_admin
on public.categories for insert
to authenticated
with check (public.is_admin());

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin
on public.categories for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists categories_delete_admin on public.categories;
create policy categories_delete_admin
on public.categories for delete
to authenticated
using (public.is_admin());

drop policy if exists category_fields_select_auth on public.category_fields;
create policy category_fields_select_auth
on public.category_fields for select
to authenticated
using (true);

drop policy if exists category_fields_write_admin on public.category_fields;
create policy category_fields_write_admin
on public.category_fields for insert
to authenticated
with check (public.is_admin());

drop policy if exists category_fields_update_admin on public.category_fields;
create policy category_fields_update_admin
on public.category_fields for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists category_fields_delete_admin on public.category_fields;
create policy category_fields_delete_admin
on public.category_fields for delete
to authenticated
using (public.is_admin());

drop policy if exists activity_records_select_auth on public.activity_records;
create policy activity_records_select_auth
on public.activity_records for select
to authenticated
using (true);

drop policy if exists activity_records_write_admin on public.activity_records;
create policy activity_records_write_admin
on public.activity_records for insert
to authenticated
with check (public.is_admin());

drop policy if exists activity_records_update_admin on public.activity_records;
create policy activity_records_update_admin
on public.activity_records for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists activity_records_delete_admin on public.activity_records;
create policy activity_records_delete_admin
on public.activity_records for delete
to authenticated
using (public.is_admin());

drop policy if exists activity_values_select_auth on public.activity_values;
create policy activity_values_select_auth
on public.activity_values for select
to authenticated
using (true);

drop policy if exists activity_values_write_admin on public.activity_values;
create policy activity_values_write_admin
on public.activity_values for insert
to authenticated
with check (public.is_admin());

drop policy if exists activity_values_update_admin on public.activity_values;
create policy activity_values_update_admin
on public.activity_values for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists activity_values_delete_admin on public.activity_values;
create policy activity_values_delete_admin
on public.activity_values for delete
to authenticated
using (public.is_admin());

-- EVENTS
drop policy if exists events_select_auth on public.events;
create policy events_select_auth
on public.events for select
to authenticated
using (true);

drop policy if exists events_write_admin on public.events;
create policy events_write_admin
on public.events for insert
to authenticated
with check (public.is_admin());

drop policy if exists events_update_admin on public.events;
create policy events_update_admin
on public.events for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists events_delete_admin on public.events;
create policy events_delete_admin
on public.events for delete
to authenticated
using (public.is_admin());

-- EVENT VIEWS (members can record their own views)
drop policy if exists event_views_select_self_or_admin on public.event_views;
create policy event_views_select_self_or_admin
on public.event_views for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists event_views_insert_self on public.event_views;
create policy event_views_insert_self
on public.event_views for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists event_views_delete_self_or_admin on public.event_views;
create policy event_views_delete_self_or_admin
on public.event_views for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- RECRUITMENTS (public inserts)
drop policy if exists recruitments_insert_public on public.recruitments;
create policy recruitments_insert_public
on public.recruitments for insert
to anon, authenticated
with check (true);

drop policy if exists recruitments_select_admin on public.recruitments;
create policy recruitments_select_admin
on public.recruitments for select
to authenticated
using (public.is_admin());

drop policy if exists recruitments_update_admin on public.recruitments;
create policy recruitments_update_admin
on public.recruitments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

 drop policy if exists recruitments_delete_admin on public.recruitments;
 create policy recruitments_delete_admin
 on public.recruitments for delete
 to authenticated
 using (public.is_admin());

 -- DONATIONS
 drop policy if exists donations_insert_public on public.donations;
 create policy donations_insert_public
 on public.donations for insert
 to anon, authenticated
 with check (true);

 drop policy if exists donations_select_admin on public.donations;
 create policy donations_select_admin
 on public.donations for select
 to authenticated
 using (public.is_admin());

 drop policy if exists donations_delete_admin on public.donations;
 create policy donations_delete_admin
 on public.donations for delete
 to authenticated
 using (public.is_admin());

 -- LOGIN ACTIVITY
 drop policy if exists login_activity_select_self_or_admin on public.login_activity;
 create policy login_activity_select_self_or_admin
 on public.login_activity for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists login_activity_write_self on public.login_activity;
create policy login_activity_write_self
on public.login_activity for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists login_activity_update_self on public.login_activity;
create policy login_activity_update_self
on public.login_activity for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- EVENT FILES                                                                      
drop policy if exists event_files_select_auth on public.event_files;
create policy event_files_select_auth
on public.event_files for select
to authenticated
using (true);

drop policy if exists event_files_write_admin on public.event_files;
create policy event_files_write_admin
on public.event_files for insert
to authenticated
with check (public.is_admin());

drop policy if exists event_files_delete_admin on public.event_files;
create policy event_files_delete_admin
on public.event_files for delete
to authenticated
using (public.is_admin());

-- NOTIFICATIONS
drop policy if exists notifications_select_self_or_admin on public.notifications;
create policy notifications_select_self_or_admin
on public.notifications for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_insert_admin on public.notifications;
create policy notifications_insert_admin
on public.notifications for insert
to authenticated
with check (public.is_admin());

drop policy if exists notifications_update_read_self on public.notifications;
create policy notifications_update_read_self
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notifications_delete_self_or_admin on public.notifications;
create policy notifications_delete_self_or_admin
on public.notifications for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

commit;

-- STORAGE (event attachments)
-- Creates `event-attachments` bucket + policies on `storage.objects`.
-- Note: Supabase enables RLS on storage.objects by default.

begin;

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
end $$;

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
to anon, authenticated
with check (
  bucket_id = 'event-attachments'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

-- Delete: admins only
drop policy if exists "event_attachments_delete_admin" on storage.objects;
create policy "event_attachments_delete_admin"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'event-attachments'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

commit;

-- STORAGE (profile images)
-- Public bucket so profile images can be rendered in <img src="..."> without auth headers.

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

-- Upload/update/delete: user can manage their own avatar path; admins can manage all.
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
