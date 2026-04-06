# Production checklist (Supabase + Vite + Vercel)

This repo can be deployed, but for “major company” usage you should verify and implement the items below.

## 1) Database security (RLS)

- Confirm RLS is enabled for every table used by the app (`supabase/schema.sql`).
- Confirm policies match your intended rules:
  - `profiles`: users can read/update only themselves; admins can manage all.
  - `recruitments`: public insert only; admin-only read/update/delete.
  - `events`, `activity_records`, `activity_values`: currently readable by any authenticated user.
    - If your company needs “per-branch/per-committee” restrictions, adjust these policies before go-live.

## 2) Admin routes security

- Ensure `SUPABASE_SERVICE_ROLE_KEY` exists only in server env vars (never `VITE_*`).
- Admin endpoints are in `api/admin/*` and require:
  - valid bearer token
  - caller role check in `profiles`
- Rate limiting is enabled by default via `RATE_LIMIT_ENABLED=true`.

## 3) Audit logging

- Apply migration `supabase/migrations/20260406_admin_audit_and_category_rename.sql`.
- Admin routes write audit entries via `public.log_admin_action(...)`.
- Verify audit table access is admin-only (RLS policy on `public.admin_audit_log`).

## 4) Data safety (backups / retention)

- Turn on automated backups / PITR in Supabase for production.
- Define retention policy for:
  - events and attachments
  - login_activity
  - recruitments
  - audit logs

## 5) Scalability and performance

- Apply `supabase/migrations/20260406_production_indexes.sql`.
- For large organizations, avoid loading “all users/events” in the client:
  - move list views to paginated Supabase queries (server-side filtering).
- Load test with realistic data volumes.

## 6) Compliance and security operations

- Enforce MFA for admins (Supabase Auth settings).
- If needed, add SSO (SAML/OIDC) via Supabase Auth (plan-dependent).
- Set up monitoring/alerting:
  - Supabase logs
  - Vercel function logs
- Run dependency vulnerability scanning in CI (npm audit / Dependabot).
- Document incident response and key rotation procedures.

