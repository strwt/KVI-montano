-- Refactor: committees (users)
-- IMPORTANT: no default/demo seeding; admins create records via UI.

begin;

-- COMMITTEES
create table if not exists public.committees (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.committees enable row level security;

-- If an older schema exists (name primary key), migrate in-place without seeding.
do $$
declare
  fk record;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'committees'
      and column_name = 'name'
  ) then
    -- Ensure id exists and becomes the primary key.
    begin
      alter table public.committees add column if not exists id uuid;
    exception when duplicate_column then
      null;
    end;

    alter table public.committees alter column id set default gen_random_uuid();
    update public.committees set id = gen_random_uuid() where id is null;

    -- Ensure name is unique and present.
    create unique index if not exists committees_name_key on public.committees (name);

    -- If legacy tables reference committees(name) via the old primary key index,
    -- drop and recreate those FKs before changing the primary key.
    if to_regclass('public.committee_utilities') is not null then
      -- Drop any FK(s) from committee_utilities -> committees to unblock primary key changes.
      begin
        for fk in
          select conname
          from pg_constraint
          where contype = 'f'
            and conrelid = 'public.committee_utilities'::regclass
            and confrelid = 'public.committees'::regclass
        loop
          execute format('alter table public.committee_utilities drop constraint if exists %I', fk.conname);
        end loop;
      exception when undefined_table then
        null;
      end;
    end if;

    -- Replace primary key with id (safe if already applied).
    alter table public.committees drop constraint if exists committees_pkey;
    alter table public.committees add constraint committees_pkey primary key (id);

    -- Recreate FK(s) against committees(name) using the unique index.
    if to_regclass('public.committee_utilities') is not null
      and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'committee_utilities'
          and column_name = 'committee_name'
      )
    then
      alter table public.committee_utilities
        add constraint committee_utilities_committee_name_fkey
        foreign key (committee_name) references public.committees(name)
        on update cascade on delete cascade;
    end if;
  end if;
end $$;

-- Basic integrity for new/updated rows; existing rows are not forced to comply immediately.
alter table public.committees
  drop constraint if exists committees_name_not_blank,
  add constraint committees_name_not_blank check (btrim(name) <> '') not valid;

-- EVENTS / NOTIFICATIONS: remove default category so UI must pick from DB
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'category'
  ) then
    alter table public.events alter column category drop default;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'category'
  ) then
    alter table public.notifications alter column category drop default;
  end if;
end $$;

-- RLS: profiles should only be readable by the user or admins.
alter table public.profiles enable row level security;

drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

commit;
