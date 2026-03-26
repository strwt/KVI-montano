-- Provides a safe way for authenticated users to look up basic profile details
-- for a list of user IDs (e.g., to render "Members Involve" labels).
--
-- Note: We DROP + CREATE because changing a function's return type cannot be done
-- with CREATE OR REPLACE.

drop function if exists public.get_profile_summaries(uuid[]);

create function public.get_profile_summaries(p_ids uuid[])
returns table (
  id uuid,
  name text,
  id_number text,
  committee text,
  contact_number text,
  blood_type text,
  member_since date,
  profile_image text,
  status text,
  account_status text
)
language sql
security definer
set search_path = public
set row_security = off
as $$
  select
    p.id,
    p.name,
    p.id_number,
    p.committee,
    p.contact_number,
    p.blood_type,
    p.member_since,
    p.profile_image,
    p.status,
    p.account_status
  from public.profiles p
  where p_ids is not null
    and array_length(p_ids, 1) is not null
    and array_length(p_ids, 1) <= 200
    and p.id = any (p_ids);
$$;

revoke all on function public.get_profile_summaries(uuid[]) from public;
grant execute on function public.get_profile_summaries(uuid[]) to authenticated;

-- Refresh PostgREST schema cache so /rest/v1/rpc/get_profile_summaries sees the latest signature.
notify pgrst, 'reload schema';
