-- Extend landing committees RPC to include `committee_role` (supports OIC display).
-- NOTE: We DROP + CREATE because changing a function's return type cannot be done
-- with CREATE OR REPLACE.

begin;

drop function if exists public.get_landing_committee_members();

create function public.get_landing_committee_members()
returns table(
  name text,
  id_number text,
  profile_image text,
  contact_number text,
  blood_type text,
  member_since date,
  committee text,
  committee_role text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.name,
    p.id_number,
    p.profile_image,
    p.contact_number,
    p.blood_type,
    p.member_since,
    p.committee,
    p.committee_role,
    p.status
  from public.profiles p
  where p.name is not null
    and btrim(p.name) <> ''
    and coalesce(p.status, 'active') = 'active'
    and coalesce(p.account_status, 'Active') = 'Active'
  order by p.name asc
  limit 5000;
$$;

revoke all on function public.get_landing_committee_members() from public;
grant execute on function public.get_landing_committee_members() to anon, authenticated;

-- Refresh PostgREST schema cache so /rest/v1/rpc/get_landing_committee_members sees the function.
notify pgrst, 'reload schema';

commit;

