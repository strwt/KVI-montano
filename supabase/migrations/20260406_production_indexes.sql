begin;

-- PROFILES
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_committee_idx on public.profiles (committee);
create index if not exists profiles_insurance_status_idx on public.profiles (insurance_status);

-- EVENTS
create index if not exists events_category_idx on public.events (category);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_completed_at_idx on public.events (completed_at);
create index if not exists events_date_time_idx on public.events (date_time);

-- NOTIFICATIONS
create index if not exists notifications_user_created_at_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_category_idx on public.notifications (category);

-- ACTIVITY RECORDS / VALUES
create index if not exists activity_records_category_id_idx on public.activity_records (category_id);
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activity_values'
      and column_name = 'record_id'
  ) then
    execute 'create index if not exists activity_values_record_id_idx on public.activity_values (record_id)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activity_values'
      and column_name = 'activity_record_id'
  ) then
    execute 'create index if not exists activity_values_record_id_idx on public.activity_values (activity_record_id)';
  end if;
end $$;
create index if not exists activity_values_field_id_idx on public.activity_values (field_id);

-- LOGIN ACTIVITY
create index if not exists login_activity_user_date_idx on public.login_activity (user_id, date);

commit;
