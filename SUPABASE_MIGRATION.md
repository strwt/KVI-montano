# Supabase setup (SQL + env)

This app uses Supabase as the source of truth (no `localStorage` persistence).

## 1) Supabase SQL (run these in SQL Editor)

Run in order:

1. `supabase/schema.sql`
2. `supabase/storage.sql` (creates `event-attachments` bucket + policies)

If you already ran an older version of `schema.sql`, run `supabase/migrations/20260317_upgrade.sql` as well.

If you see a `400 Bad Request` on `login_activity?on_conflict=user_id,date`, ensure `login_activity` has a UNIQUE constraint on `(user_id, date)` (the upgrade migration now enforces this).

If you want users to sign in with an ID number (instead of email), `schema.sql` / the upgrade migration creates `public.get_email_for_id_number(p_id_number text)` and grants execute to `anon` so the client can resolve ID -> email securely (without opening `profiles` to anon).

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
