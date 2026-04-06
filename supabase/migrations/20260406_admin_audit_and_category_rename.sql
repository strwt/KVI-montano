begin;

-- ADMIN AUDIT LOG (minimal but useful for production)
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select_admin on public.admin_audit_log;
create policy admin_audit_log_select_admin
on public.admin_audit_log for select
to authenticated
using (public.is_admin());

-- Inserts happen via SECURITY DEFINER function; allow direct insert for admins too.
drop policy if exists admin_audit_log_insert_admin on public.admin_audit_log;
create policy admin_audit_log_insert_admin
on public.admin_audit_log for insert
to authenticated
with check (public.is_admin());

create or replace function public.log_admin_action(
  p_action text,
  p_entity text default null,
  p_entity_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  insert into public.admin_audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), coalesce(nullif(btrim(p_action), ''), 'unknown'), nullif(btrim(p_entity), ''), nullif(btrim(p_entity_id), ''), coalesce(p_meta, '{}'::jsonb));
end;
$$;

-- CATEGORY RENAME (transactional)
create or replace function public.rename_category_key(
  p_category_id uuid,
  p_old_key text,
  p_new_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text := btrim(coalesce(p_old_key, ''));
  v_new text := btrim(coalesce(p_new_key, ''));
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_category_id is null then
    raise exception 'Missing category id.';
  end if;

  if v_old = '' or v_new = '' then
    raise exception 'Category name is required.';
  end if;

  -- Ensure new key not taken by another category.
  if exists (
    select 1
    from public.categories
    where name = v_new
      and id <> p_category_id
  ) then
    raise exception 'Category name already exists.';
  end if;

  -- Update category row (guard with old key to avoid accidental overwrites).
  update public.categories
  set name = v_new
  where id = p_category_id
    and name = v_old;

  if not found then
    raise exception 'Category not found or already renamed.';
  end if;

  -- Update references (events + notifications store category key text)
  update public.events set category = v_new where category = v_old;
  update public.notifications set category = v_new where category = v_old;

  perform public.log_admin_action(
    'category.rename',
    'categories',
    p_category_id::text,
    jsonb_build_object('from', v_old, 'to', v_new)
  );
end;
$$;

commit;

