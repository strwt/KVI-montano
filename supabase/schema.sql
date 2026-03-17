-- KUSGAN Volunteer - Supabase schema + RLS
-- Apply in Supabase SQL Editor (project: Settings -> SQL Editor).
-- Assumptions:
-- - One organization (shared data).
-- - Supabase Auth is the source of user identity.

begin;

-- Extensions (safe if already enabled)
create extension if not exists pgcrypto;

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

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
  category text not null default 'General Member',
  id_number text unique,
  contact_number text,
  address text,
  blood_type text,
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

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, id_number)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'id_number', '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Categories/Committees (kept as "name" strings to match current app)
create table if not exists public.committees (
  name text primary key,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

drop trigger if exists committees_set_updated_at on public.committees;
create trigger committees_set_updated_at
before update on public.committees
for each row execute function public.set_updated_at();

-- Utilities linked to a committee name (same key used in current app utilitiesByCommittee)
create table if not exists public.committee_utilities (
  id uuid primary key default gen_random_uuid(),
  committee_name text not null references public.committees(name) on update cascade on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (committee_name, name)
);

-- Events (kept close to current localStorage shape)
create table if not exists public.events (
  id bigint primary key,
  title text not null default '',
  content text not null default '',
  category text not null default 'notes',
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

-- Login activity (client upserts on login)
create table if not exists public.login_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  last_login_at timestamptz not null default now(),
  is_online boolean not null default false,
  last_status_at timestamptz,
  unique (user_id, date)
);

-- In-app notifications (event assignment, reminders, etc.)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  event_id bigint references public.events(id) on delete cascade,
  title text not null default '',
  category text not null default 'notes',
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
alter table public.committee_utilities enable row level security;
alter table public.events enable row level security;
alter table public.event_views enable row level security;
alter table public.recruitments enable row level security;
alter table public.login_activity enable row level security;
alter table public.event_files enable row level security;
alter table public.notifications enable row level security;

-- PROFILES
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth
on public.profiles for select
to authenticated
using (true);

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

-- UTILITIES
drop policy if exists utilities_select_auth on public.committee_utilities;
create policy utilities_select_auth
on public.committee_utilities for select
to authenticated
using (true);

drop policy if exists utilities_write_admin on public.committee_utilities;
create policy utilities_write_admin
on public.committee_utilities for insert
to authenticated
with check (public.is_admin());

drop policy if exists utilities_update_admin on public.committee_utilities;
create policy utilities_update_admin
on public.committee_utilities for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists utilities_delete_admin on public.committee_utilities;
create policy utilities_delete_admin
on public.committee_utilities for delete
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
