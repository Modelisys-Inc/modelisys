---
name: rbac-roles
description: Role-based access control model (superadmin/admin/user/viewer) and how it's enforced
metadata:
  type: project
---

RBAC added 2026-06-20 (sub-phase 1 of a larger plan). Four roles:
- **superadmin** = `User.is_superadmin` (platform staff, us): all orgs; only role that may manage the global chart of accounts.
- **admin** = `UserOrganization.role=admin`: all companies in their org + company-entity admin (create/update/delete, divisions) + (planned) grant management.
- **user** = `role=member`: read+write only on companies in `user_company_access` (or all org companies if `UserOrganization.all_companies=True`).
- **viewer** = `role=viewer`: read-only on granted companies; writes → 403.

Enforcement centralized in `app/dependencies.py`:
- `verify_company_access(db, user, company_id, require_write=False)` — single gate; 404 for no-access (no existence leak), 403 for viewer write.
- `enforce_company_write` — router-level dependency wired in `main.py` on company-scoped data routers; blocks writes (non-safe HTTP methods) for viewers/ungranted by HTTP method, so all mutations are covered without per-endpoint edits. QBO is gated explicitly (unauthenticated OAuth callback can't take the auth-forcing guard).
- `require_org_admin` / `require_superadmin` for org-admin / platform actions.

Sub-phase 2 DONE (2026-06-20): admin grant-management on the org members API (`/api/organizations/{org_id}/members`): `all_companies` toggle via PATCH, per-company grants via `PUT .../{user_id}/companies`; frontend "Accès" dialog on `/settings/users`. Sub-phase 3 DONE (2026-06-20): superadmin global-code CRUD — `POST/PATCH/DELETE /api/standard-link-codes` gated by require_superadmin (`app/services/coa_admin.py`; create additive+versioned, delete tombstones, edits in-place); `is_superadmin` on `/api/auth/me`; frontend `/settings/standard-codes` (superadmin-only). Retires MO.xlsx for ongoing edits. Polish DONE (2026-06-20): promotion now superadmin-only (writes the global chart); QBO import page gated for viewers; `python -m app.scripts.set_superadmin <email>` bootstraps superadmin (out-of-band, no UI); white-box test `test_write_guard_coverage.py` asserts every company-write route carries `enforce_company_write`. Backend suite fully green (385+). KNOWN pre-existing failure unrelated to RBAC: frontend e2e `quickbooks.spec.ts::create new link code from review table` (fails with RBAC changes stashed too — likely fallout from the merged CoA QBO picker refactor; needs separate investigation). Projections editing inputs remain viewer-visible (backend 403s on save) — diffuse, low-value.

Sub-phase 4 DONE (2026-06-20, core surfaces): `usePermissions()` hook (`hooks/use-permissions.ts`) exposes `canEdit` (false for viewers); edit controls hidden for viewers on mapping, trial-balance, and custom-link-codes panel. ALL 4 RBAC SUB-PHASES COMPLETE. Minor polish follow-up: gate secondary editors (budgets/notes/projections/company-info) too — backend already 403s viewer writes, so it's UX-only. Note: registration assigns the creating user ADMIN. coa_promotion mutations are NOT yet role-gated (tighten in sub-phase 3). See [[link-code-architecture-roadmap]].
