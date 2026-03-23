-- Attendance: extend login_activity with detailed time/status fields.
-- IMPORTANT: no default/demo seeding; data comes from real user/admin input only.

begin;

alter table public.login_activity
  add column if not exists status text,
  add column if not exists time_in timestamptz,
  add column if not exists time_out timestamptz,
  add column if not exists time_out_reason text;

alter table public.login_activity
  drop constraint if exists login_activity_status_not_blank,
  add constraint login_activity_status_not_blank check (status is null or btrim(status) <> '');

commit;

