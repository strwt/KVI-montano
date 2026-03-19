begin;

alter table public.login_activity
  add column if not exists is_present boolean not null default false,
  add column if not exists present_at timestamptz;

create index if not exists login_activity_present_by_date_idx
on public.login_activity (date, user_id)
where is_present is true;

commit;

