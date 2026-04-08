-- Allow admins to manage attendance edits for any member.
-- Required for Attendance Management manual time edits (upsert on public.login_activity).

begin;

drop policy if exists login_activity_insert_admin on public.login_activity;
create policy login_activity_insert_admin
on public.login_activity for insert
to authenticated
with check (public.is_admin());

drop policy if exists login_activity_update_admin on public.login_activity;
create policy login_activity_update_admin
on public.login_activity for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;

