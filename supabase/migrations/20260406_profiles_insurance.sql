begin;

alter table public.profiles
  add column if not exists insurance_status text not null default 'N/A',
  add column if not exists insurance_year text;

commit;

