begin;

alter table public.profiles
  add column if not exists committee_role text not null default 'Member';

alter table public.profiles
  drop constraint if exists profiles_committee_role_valid,
  add constraint profiles_committee_role_valid
    check (committee_role in ('Member', 'OIC')) not valid;

commit;

