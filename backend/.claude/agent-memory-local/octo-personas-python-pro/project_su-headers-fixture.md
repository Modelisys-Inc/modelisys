---
name: su-headers-fixture
description: Backend tests use su_headers (superadmin) for global standard-link-codes writes; auth_headers (regular org user) for everything else
metadata:
  type: project
---

Global chart-of-accounts writes (`POST/PATCH/DELETE /api/standard-link-codes`) require a SUPERADMIN. Tests authenticate these calls with the `su_headers` fixture (`tests/conftest.py`), which mints a superadmin token. All other endpoints (companies, account-mappings, trial-balance, auth) use the regular `auth_headers` fixture (a normal org user).

**Why:** A merge made the global chart superadmin-only (see CLAUDE.md "Authorization (RBAC)" — only superadmin manages `standard_link_codes`). Tests that POSTed link codes with `auth_headers` started failing with 403.

**How to apply:** When a test mixes standard-link-codes calls with company/mapping calls, it needs BOTH fixtures in its signature, switching only the standard-link-codes call's `headers=` to `su_headers`. If a test ONLY touches standard-link-codes, swap its `auth_headers` param to `su_headers` entirely. Do not change `auth_headers` on company/mapping/TB/auth endpoints.
