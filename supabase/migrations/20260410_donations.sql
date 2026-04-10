begin;

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text,
  donor_email text,
  reference_no text,
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

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

commit;

-- Refresh PostgREST schema cache so /rest/v1/donations is available immediately.
notify pgrst, 'reload schema';

