-- KUSGAN Volunteer - schema upgrade (idempotent)
-- Use this if you already ran `schema.sql` before this date and need to add new columns/tables.

begin;

create extension if not exists pgcrypto;

-- PROFILES additions (preferences)
alter table public.profiles add column if not exists app_language text not null default 'English';
alter table public.profiles add column if not exists dark_mode boolean not null default false;
alter table public.profiles add column if not exists settings jsonb not null default '{}'::jsonb;

-- LOGIN ACTIVITY additions
alter table public.login_activity add column if not exists is_online boolean not null default false;
alter table public.login_activity add column if not exists last_status_at timestamptz;
do $$
begin
  if to_regclass('public.login_activity') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'login_activity'
      and tc.constraint_type = 'UNIQUE'
    group by tc.constraint_name
    having array_agg(kcu.column_name::text order by kcu.ordinal_position) = array['user_id', 'date']::text[]
  ) then
    alter table public.login_activity
      add constraint login_activity_user_id_date_key unique (user_id, date);
  end if;
end $$;

-- RECRUITMENTS addition
alter table public.recruitments add column if not exists id_number text;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recruitments_email_key'
      and conrelid = 'public.recruitments'::regclass
  ) then
    alter table public.recruitments add constraint recruitments_email_key unique (email);
  end if;
end $$;

-- NOTIFICATIONS table + RLS
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

alter table public.notifications enable row level security;

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
