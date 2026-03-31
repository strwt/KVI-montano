-- Admin Category Management (strict typed dynamic fields)
-- Adds:
-- - categories
-- - category_fields
-- - activity_records
-- - activity_values (typed columns + trigger enforcement)

begin;

-- Categories (dynamic forms/reports)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.categories
  drop constraint if exists categories_name_not_blank,
  add constraint categories_name_not_blank check (btrim(name) <> '');

-- Category fields (strict typing)
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

-- Prevent case-only duplicates (e.g. "Seedling Count" vs "seedling count").
create unique index if not exists category_fields_unique_lower_name_idx
on public.category_fields (category_id, lower(field_name));

-- Activity records (one record per category occurrence)
create table if not exists public.activity_records (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Activity field values (typed columns)
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

-- Enforce correct typed column based on category_fields.field_type and prevent mismatched record/category.
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

-- RLS
alter table public.categories enable row level security;
alter table public.category_fields enable row level security;
alter table public.activity_records enable row level security;
alter table public.activity_values enable row level security;

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

commit;
