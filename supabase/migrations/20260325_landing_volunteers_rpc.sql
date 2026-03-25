-- Public landing: fetch a limited set of member cards for the landing modal.
-- Returns only for the provided volunteer-name allowlist and only "active" accounts.
--
-- IMPORTANT:
-- - We DROP then CREATE because Postgres cannot `create or replace` when the return type changes.
-- - SECURITY DEFINER is used so the landing page can read these specific fields without exposing full profiles.

begin;

drop function if exists public.get_landing_volunteers(text[]);

create function public.get_landing_volunteers(p_names text[])
returns table(
  name text,
  profile_image text,
  contact_number text,
  blood_type text,
  member_since date,
  committee text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  with wanted as (
    select regexp_replace(lower(btrim(n)), '\s+', ' ', 'g') as wanted_name
    from unnest(coalesce(p_names, '{}'::text[])) n
    where btrim(coalesce(n, '')) <> ''
    limit 200
  )
  select
    p.name,
    p.profile_image,
    p.contact_number,
    p.blood_type,
    p.member_since,
    p.committee,
    p.status
  from public.profiles p
  join wanted w
    on regexp_replace(lower(btrim(p.name)), '\s+', ' ', 'g') = w.wanted_name
  where p.name is not null
    and coalesce(p.status, 'active') = 'active'
    and coalesce(p.account_status, 'Active') = 'Active';
$$;

revoke all on function public.get_landing_volunteers(text[]) from public;
grant execute on function public.get_landing_volunteers(text[]) to anon, authenticated;

commit;
