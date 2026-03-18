# Supabase setup (SQL + env)

This app uses Supabase as the source of truth (no `localStorage` persistence).

## 1) Supabase SQL (run this in SQL Editor)

Run:

1. `supabase/schema.sql`

This single script now includes:
- Full schema + RLS
- Storage bucket (`event-attachments`) + policies
- ID-number login helper `public.get_email_for_id_number(p_id_number text)`

If you see a `400 Bad Request` on `login_activity?on_conflict=user_id,date`, ensure `login_activity` has a UNIQUE constraint on `(user_id, date)`.

## 2) Create your admin user

1. Create a user in Supabase Dashboard -> Authentication -> Users (set an email + password).
2. In Supabase Table Editor -> `profiles`, set `role = 'admin'` and set an `id_number` for that user.

SQL example:

```sql
update public.profiles
set role = 'admin',
    id_number = 'ADMIN001'
where email = 'admin@example.com';
```

## 3) Environment variables

Local `.env` (see `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vercel:
- Project -> Settings -> Environment Variables -> add the same keys.

If you want admins to create users inside the web app (server-side invite/create flow), also add:
- `SUPABASE_URL` (same as `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard -> Project Settings -> API -> Service role key)

## Notes

- Event assignments notify members via the `notifications` table.
- Language/theme/settings are stored in `profiles` (`app_language`, `dark_mode`, `settings`).
- Admin “Create Member” requires an invite/admin API route (Service Role) if you want admins to create Auth users.
