-- Fix: avoid potential RLS recursion in `public.is_admin()` when policies call it.
-- Prefer JWT app_metadata.role (synced by profiles trigger) and only fall back to auth.uid() row.

begin;

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

commit;

