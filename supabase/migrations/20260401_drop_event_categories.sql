-- Drop legacy event_categories table (replaced by public.categories + public.category_fields)

begin;

drop table if exists public.event_categories cascade;

commit;

