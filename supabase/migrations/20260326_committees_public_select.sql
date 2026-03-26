-- Allow the landing page to display committees without requiring authentication.

alter table if exists public.committees enable row level security;
grant select on table public.committees to anon, authenticated;

drop policy if exists committees_select_auth on public.committees;
drop policy if exists committees_select_all on public.committees;

create policy committees_select_all
on public.committees for select
to anon, authenticated
using (true);
