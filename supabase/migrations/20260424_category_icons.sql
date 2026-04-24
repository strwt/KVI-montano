begin;

alter table public.categories
  add column if not exists icon_key text null,
  add column if not exists color text null;

commit;

