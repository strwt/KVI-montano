-- Achievements / Latest News
-- Adds a public-read achievements table + storage bucket for images.

begin;

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  occurred_at timestamptz not null default now(),
  location text not null default '',
  description text not null default '',
  image_paths text[] not null default '{}'::text[],
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists achievements_set_updated_at on public.achievements;
create trigger achievements_set_updated_at
before update on public.achievements
for each row execute function public.set_updated_at();

alter table public.achievements enable row level security;

drop policy if exists achievements_select_public on public.achievements;
create policy achievements_select_public
on public.achievements for select
to anon, authenticated
using (true);

drop policy if exists achievements_insert_admin on public.achievements;
create policy achievements_insert_admin
on public.achievements for insert
to authenticated
with check (public.is_admin());

drop policy if exists achievements_update_admin on public.achievements;
create policy achievements_update_admin
on public.achievements for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists achievements_delete_admin on public.achievements;
create policy achievements_delete_admin
on public.achievements for delete
to authenticated
using (public.is_admin());

commit;

-- STORAGE (achievement images)
-- Public bucket for rendering images on Landing.

begin;

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'achievement-images') then
    begin
      insert into storage.buckets (id, name, "public")
      values ('achievement-images', 'achievement-images', true)
      on conflict (id) do nothing;
    exception
      when undefined_column then
        insert into storage.buckets (id, name)
        values ('achievement-images', 'achievement-images')
        on conflict (id) do nothing;
    end;
  end if;
end $$;

-- Read: public (supports landing page without login)
drop policy if exists "achievement_images_read_public" on storage.objects;
create policy "achievement_images_read_public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'achievement-images');

-- Upload/update/delete: admins only
drop policy if exists "achievement_images_write_admin" on storage.objects;
create policy "achievement_images_write_admin"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'achievement-images'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

drop policy if exists "achievement_images_update_admin" on storage.objects;
create policy "achievement_images_update_admin"
on storage.objects for update
to anon, authenticated
using (
  bucket_id = 'achievement-images'
  and (public.is_admin_jwt() or public.is_admin_storage())
)
with check (
  bucket_id = 'achievement-images'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

drop policy if exists "achievement_images_delete_admin" on storage.objects;
create policy "achievement_images_delete_admin"
on storage.objects for delete
to anon, authenticated
using (
  bucket_id = 'achievement-images'
  and (public.is_admin_jwt() or public.is_admin_storage())
);

commit;

