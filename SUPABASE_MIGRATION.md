# Supabase setup (SQL + env)

This app uses Supabase as the source of truth (no `localStorage` persistence).

## 1) Supabase SQL (run these in SQL Editor)

Run in order:

1. `supabase/schema.sql`
2. `supabase/storage.sql` (creates `event-attachments` bucket + policies)

If you already ran an older version of `schema.sql`, run `supabase/migrations/20260317_upgrade.sql` as well.

## 2) Create your admin user

1. Sign up in the app (or Supabase Auth UI).
2. In Supabase Table Editor -> `profiles`, set `role = 'admin'` for your user.

## 3) Environment variables

Local `.env` (see `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vercel:
- Project -> Settings -> Environment Variables -> add the same keys.

## Notes

- Event assignments notify members via the `notifications` table.
- Language/theme/settings are stored in `profiles` (`app_language`, `dark_mode`, `settings`).
- Admin “Create Member” requires an invite/admin API route (Service Role) if you want admins to create Auth users.
