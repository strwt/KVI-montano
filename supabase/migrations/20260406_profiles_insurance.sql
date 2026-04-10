begin;

alter table public.profiles
  add column if not exists insurance_status text not null default 'N/A',
  add column if not exists insurance_year text,
  add column if not exists emergency_contact_number text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relationship text;

alter table if exists public.recruitments
  add column if not exists emergency_contact_number text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relationship text;

commit;
