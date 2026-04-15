# QuickBooks Connector — Design

**Date:** 2026-04-14
**Branch:** `feat/add-quickbooks-connector`
**Status:** Approved for planning

## Summary

Integrate Intuit QuickBooks Online (QBO) as a data source for Modelisys, enabling
users to (1) connect a Modelisys Company to a QBO company via OAuth2 and (2) pull
a trial balance with auto-proposed account mappings that the user reviews before
committing. The first shippable version eliminates the manual trial-balance
import step and dramatically shortens new-client onboarding by bootstrapping
`AccountMapping.link_codes` from QBO's account taxonomy.

## Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Scope for v1: TB pull + mapping bootstrap (not scheduled sync) | Ship the pain-killing UX before investing in background workers and webhook plumbing. |
| 2 | 1:1 Modelisys Company ↔ QBO realm | Matches how most SMBs run books; simplifies data model. Divisions/sub-divisions already cover internal carve-ups. |
| 3 | Mapping bootstrap uses "suggest + review" (not auto-apply) | Mapping is the audit-trail foundation; silent errors are the worst failure mode. Review screen also teaches the model to new users. |
| 4 | Intuit sandbox for v1; production app review as a separate later milestone | Intuit production review takes 1–4 weeks and requires a working demo; sandbox is the only path anyway. |
| 5 | Architecture: dedicated `app/integrations/quickbooks/` module | Integrations have their own lifecycle (OAuth, rate limits, vendor quirks) that doesn't belong in domain services. One day of upfront cost buys clean extension for future integrations. |

## Architecture

### Backend module layout

```
backend/app/integrations/quickbooks/
  __init__.py
  client.py          # httpx-based QBO API wrapper (TB, Company, Account endpoints)
  oauth.py           # Intuit OAuth2 flow: authorize URL, token exchange, refresh
  encryption.py      # Fernet encrypt/decrypt helpers for token persistence
  service.py         # orchestration: pull_trial_balance, propose_mappings
  mapping_rules.py   # QBO AccountType/AccountSubType -> Modelisys link_code rules
  router.py          # FastAPI endpoints under /api/quickbooks
  schemas.py         # Pydantic I/O models
```

### New database model — `QuickBooksConnection`

One row per connected Modelisys Company (UNIQUE constraint on `company_id` enforces 1:1).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `company_id` | UUID FK → `companies`, UNIQUE | enforces 1:1 |
| `realm_id` | str | QBO company identifier |
| `access_token` | str (encrypted) | Fernet-encrypted at rest |
| `refresh_token` | str (encrypted) | same |
| `access_token_expires_at` | datetime | |
| `refresh_token_expires_at` | datetime | Intuit refresh tokens expire at ~100 days |
| `status` | str (enum: `active`, `revoked`) | |
| `connected_at` / `updated_at` | datetime | |
| `connected_by_user_id` | UUID FK → `users` | audit |

### New configuration

Added to `config.py` and `.env.example`:

- `QBO_TOKEN_ENCRYPTION_KEY` — Fernet key, distinct from `JWT_SECRET_KEY`
- `INTUIT_CLIENT_ID`
- `INTUIT_CLIENT_SECRET`
- `INTUIT_ENVIRONMENT` — `sandbox` or `production`
- `INTUIT_REDIRECT_URI`

Fernet (AES-128-CBC + HMAC) is available via the `cryptography` library, already
a transitive dependency through `python-jose`.

### API endpoints

All endpoints live under `/api/quickbooks` and enforce org-scoping via the
existing `get_current_user` dependency + company/org check.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/quickbooks/authorize?company_id=<id>` | Redirects to Intuit consent screen |
| GET | `/api/quickbooks/callback` | OAuth callback; creates/updates connection; redirects to frontend |
| GET | `/api/quickbooks/companies/{company_id}/connection` | Connection status (`connected`, `revoked`, `not_connected`) |
| DELETE | `/api/quickbooks/companies/{company_id}/connection` | Revoke at Intuit, delete row |
| POST | `/api/quickbooks/companies/{company_id}/trial-balance/preview` | Pull TB + mapping proposals; **no DB writes** |
| POST | `/api/quickbooks/companies/{company_id}/trial-balance/commit` | Persist user-accepted TB rows + mappings |

## OAuth flow

Intuit OAuth 2.0 Authorization Code flow with `com.intuit.quickbooks.accounting`
scope only (no payroll, no payments).

1. User clicks "Connect QuickBooks" on a Company's settings page.
2. Frontend calls `GET /api/quickbooks/authorize?company_id=<id>`.
3. Backend generates a signed `state` JWT containing
   `{company_id, user_id, nonce, exp, aud: "qbo-oauth"}`. Signed with
   `JWT_SECRET_KEY`, 10-minute TTL, stateless.
4. Backend responds with a redirect to Intuit's consent URL (with `state`,
   `redirect_uri`, `scope`, `response_type=code`).
5. Intuit redirects to `GET /api/quickbooks/callback?code=...&realmId=...&state=<jwt>`.
6. Backend verifies the `state` JWT (signature, exp, audience, org match). On
   failure, returns 400. This is the CSRF gate.
7. Backend exchanges `code` for tokens via Intuit's token endpoint. Receives
   `access_token` (~1h), `refresh_token` (~100d), `x_refresh_token_expires_in`.
8. Backend upserts `QuickBooksConnection` with encrypted tokens, `realm_id`,
   and expiry timestamps.
9. Backend redirects to `{FRONTEND_URL}/settings/companies/{company_id}/quickbooks?qbo=connected`.

### Token refresh

Single helper `get_valid_access_token(connection)` wraps every QBO API call:

- If `access_token_expires_at > now + 60s` → return as-is.
- Else → call Intuit refresh endpoint, update both tokens (Intuit may rotate
  refresh tokens), persist, return new access token.
- If refresh fails with `invalid_grant` → mark connection `status='revoked'`,
  delete tokens, surface a "Reconnect QuickBooks" banner on the frontend.

### Disconnect

Calls Intuit's revoke endpoint, then deletes the row. Revocation failure logs a
warning but still deletes locally — user intent to disconnect always wins.

### OAuth edge cases

- **Consent denied:** callback has `error=access_denied` → redirect to
  `?qbo=denied`; frontend shows informational message.
- **Stale `state` JWT (>10 min):** 400 "Authorization expired, please try again."
- **Callback `realmId` differs from existing connection's realmId:** overwrite
  with a UI warning.
- **Re-connect to same company:** allowed; new tokens overwrite old.

## Trial balance pull flow

Two-step (preview → commit) to satisfy "suggest + review" (decision #3).

### Preview — `POST /api/quickbooks/companies/{id}/trial-balance/preview`

**Request:**
```json
{ "as_of_date": "2026-03-31", "currency": "USD" }
```

**Backend steps:**

1. Load connection, refresh token if needed.
2. Call QBO Reports API:
   `GET /v3/company/{realmId}/reports/TrialBalance?start_date=...&end_date=...&accounting_method=Accrual`.
3. Parse nested report into flat rows:
   `{qbo_account_id, account_name, account_number, account_type, account_sub_type, debit, credit}`.
4. In parallel, fetch `/v3/company/{realmId}/query?query=SELECT * FROM Account` to
   get type/subtype metadata for every account (TB report alone does not always
   include subtype).
5. For each TB row call `mapping_rules.propose(account_type, account_sub_type, account_name)`
   → `{proposed_link_code, confidence: "high"|"medium"|"low", reason}`.
6. Check existing `AccountMapping` for `(company_id, account_number)` — if present,
   include `existing_link_code` so the UI can flag "already mapped" rows.
7. Return structured response. **No DB writes.**

**Response shape:**
```json
{
  "as_of_date": "2026-03-31",
  "currency": "USD",
  "fetched_at": "2026-04-14T14:22:00Z",
  "rows": [
    {
      "qbo_account_id": "42",
      "account_number": "4000",
      "account_name": "Sales",
      "qbo_account_type": "Income",
      "qbo_account_sub_type": "SalesOfProductIncome",
      "debit": 0,
      "credit": 125000.00,
      "proposed_link_code": "revenue.product_sales",
      "confidence": "high",
      "existing_link_code": null
    }
  ]
}
```

### Commit — `POST /api/quickbooks/companies/{id}/trial-balance/commit`

**Request:**
```json
{
  "as_of_date": "2026-03-31",
  "currency": "USD",
  "rows": [
    { "account_number": "4000", "account_name": "Sales", "debit": 0, "credit": 125000.00, "link_code": "revenue.product_sales" }
  ],
  "overwrite_existing_tb": false
}
```

**Backend steps (single DB transaction):**

1. TB conflict check: if a `TrialBalance` already exists for
   `(company_id, as_of_date)` and `overwrite_existing_tb=false` → return
   **409 Conflict** with a message. Frontend shows a confirm dialog and retries
   with `true`. No silent overwrites.
2. If `overwrite_existing_tb=true`, delete the conflicting TB rows for that date.
3. Insert new `TrialBalance` rows.
4. Upsert `AccountMapping` rows — one per `account_number`, with the user-accepted
   `link_code`. Existing mappings for `(company_id, account_number)` are
   **updated** (user explicitly reviewed).
5. Concurrency: conflict check uses `SELECT ... FOR UPDATE` on the `Company` row
   to serialize concurrent commits for the same company.
6. Return `201` with TB summary.

### Mapping rules

`mapping_rules.py` is a static dict keyed by `(AccountType, AccountSubType)`
returning a Modelisys `link_code` and a confidence level:

- `high` — the combo uniquely determines a link_code.
- `medium` — only `AccountType` matches, subtype unknown.
- `low` — guessing from account name (last resort).

The canonical mapping table is produced during Phase 0 (discovery) and committed
as `docs/quickbooks-account-mapping.md` for review before any code references it.

### Commit edge cases

- **Unknown `link_code` at commit time** (user edited `FinancialStatementMapping` in another tab mid-review): 422 with offending row numbers.
- **Zero-balance accounts:** included in preview; user can skip via per-row checkbox. Default = not skipped (avoid silently dropping accounts).
- **Partial commit failure:** full rollback; user sees "Import failed, please try again."

## Frontend UX

### Page: `/settings/companies/[id]/quickbooks`

Single page, three state-driven views. Connection status comes from
`GET /api/quickbooks/companies/{id}/connection`.

**State A — Not connected.** Empty-state card with explanation and a "Connect
QuickBooks" primary button. Clicking triggers a full-page navigation to
`/api/quickbooks/authorize?company_id=...` (not `fetch` — Intuit consent must
own the window).

**State B — Connected, no pull in progress.**

- Connection summary: realm ID, connected-by user, connected-at.
- Form: `as_of_date` date picker (defaults to last day of prior month),
  `currency` select (defaults to company's reporting currency).
- Primary: **"Preview trial balance"** → calls preview endpoint, transitions to
  State C. Spinner during the 1–3s pull.
- Secondary: **"Disconnect"** (with confirm dialog).
- Banner if `status='revoked'`: "QuickBooks access expired — reconnect to continue."

**State C — Review & commit.**

Single table with sticky header and scrollable body:

| Col | Content |
|---|---|
| Account # | from QBO, read-only |
| Account name | from QBO, read-only |
| QBO type / subtype | muted text, read-only — context for the mapper |
| Debit / Credit | right-aligned, formatted via existing `financial-utils.ts` |
| Link code | searchable combobox, pre-filled with `proposed_link_code`; options from `FinancialStatementMapping` |
| Confidence | badge: green (high) / amber (medium) / gray (low); amber "Already mapped" badge when `existing_link_code != proposed_link_code` |
| Action | per-row "Skip" checkbox |

**Above the table:**
- Summary counts ("X high-confidence, Y need review, Z already mapped") — clickable filters.
- "Accept all high-confidence" bulk action.
- Read-only echo of currency + as-of-date.

**Below the table:**
- Live debit/credit balance check. Red if the two sides don't match within a cent.
- Primary: **"Import trial balance"** (disabled if any non-skipped row has an empty link code).
- Secondary: **"Cancel"** — discards preview, returns to State B.

**409 handling:** confirmation modal "A trial balance for {date} already exists. Overwrite?" → retries commit with `overwrite_existing_tb=true`.

**On success:** toast "Trial balance imported — N accounts, M new mappings created"; redirect to the existing TB view.

### Frontend implementation notes

- New hook `useQuickBooksConnection(companyId)` — status + mutations.
- Preview response held in React state only (not URL, not localStorage). Refresh restarts the pull; avoids stale-preview bugs.
- Table uses existing shadcn `Table` + `Combobox` primitives; no new UI deps.
- Single page, state-driven — no wizard navigation. Matches existing `/settings` patterns.

## Error handling

### QBO API errors (handled in `client.py`)

| Failure | Backend | User sees |
|---|---|---|
| `401 invalid_token` | Refresh + retry once. Second 401 → mark revoked, return 424. | "QuickBooks access expired — reconnect" banner. |
| `429 throttled` | Honor `Retry-After`, retry once. Second throttle → 503. | "QuickBooks is rate-limiting us, try again in a moment." |
| `5xx` | Retry once after 1s. Still failing → 502. | "QuickBooks is unavailable right now." |
| Timeout (>15s) | No retry; return 504. | "Request to QuickBooks timed out." |
| Malformed report | Log full response; 500 with correlation ID. | "Couldn't parse the trial balance — error ID {id}." |

All QBO HTTP errors are logged with `realm_id`, endpoint, status, and Intuit's
`intuit_tid` response header (their correlation ID for support tickets).

### Security boundaries

- Tokens never returned to the frontend — ever. Frontend sees only connection
  status and `realm_id` (not a secret; appears in every OAuth URL).
- `state` JWT signed with existing `JWT_SECRET_KEY`, includes `aud: "qbo-oauth"`
  to prevent cross-use with auth JWTs.
- Token encryption key (`QBO_TOKEN_ENCRYPTION_KEY`) is distinct from `JWT_SECRET_KEY`.
- Redirect URI is an exact-match allowlist in Intuit's developer console. No
  open-redirect risk from `state` manipulation.
- Every endpoint enforces org-scoping, including the OAuth callback
  (via `state.user_id` → user lookup → org check).

## Testing strategy

### Backend (pytest, SQLite in-memory)

Mock Intuit at the `httpx` level via `respx` (add to `requirements.txt`). No
real network calls in unit or integration tests.

**Unit tests:**
- `test_quickbooks_oauth.py` — state JWT create/verify, expiry, audience
  rejection, org-mismatch rejection.
- `test_quickbooks_token_refresh.py` — near-expiry refresh; expired refresh
  marks connection revoked; rotated refresh token persists correctly.
- `test_quickbooks_mapping_rules.py` — every rule points to a real `link_code`;
  confidence assigned correctly; unknown subtype falls back to type; unknown
  type returns `None`.
- `test_quickbooks_client.py` — 401 refresh-and-retry; 429 Retry-After; 5xx
  single retry; timeout raises without retry; malformed report parser tolerance.
- `test_token_encryption.py` — round-trip; ciphertext differs across calls;
  wrong key raises.

**Integration tests (TestClient + respx):**
- `test_quickbooks_authorize.py` — redirect shape; state round-trips through
  callback; cross-org user gets 403.
- `test_quickbooks_callback.py` — valid code creates connection; `access_denied`
  redirects gracefully; invalid state → 400; duplicate connect overwrites;
  different realm warns.
- `test_quickbooks_preview.py` — returns proposals; no DB writes; existing
  mappings surfaced; 429 returns 503.
- `test_quickbooks_commit.py` — happy path; 409 without overwrite; successful
  overwrite; unknown link_code → 422; concurrent commits serialize.
- `test_quickbooks_disconnect.py` — revokes + deletes; revoke failure still
  deletes locally.

**Fixtures:**
- `qbo_connection` factory — Company + QuickBooksConnection with fake tokens.
- `qbo_trial_balance_fixture.json` — sanitized sandbox response, in
  `backend/tests/fixtures/quickbooks/`.

### Frontend (Playwright e2e)

Mock QBO-backed endpoints at the API level with `page.route()`. We test the
review UX, not Intuit.

- `quickbooks-connect.spec.ts` — unconnected state; clicking connect navigates
  to stubbed Intuit URL.
- `quickbooks-preview-and-commit.spec.ts` — stubbed preview renders correctly;
  "Accept all high-confidence" bulk action; empty link_code disables import;
  successful commit toasts and redirects.
- `quickbooks-conflict.spec.ts` — 409 → modal → overwrite retries successfully.
- `quickbooks-revoked.spec.ts` — revoked status shows reconnect banner.

### Explicitly NOT tested

- Real Intuit sandbox in CI (flaky, credentialed, slow).
- The `cryptography` library itself.
- Intuit's OAuth server behavior.

### Manual sandbox verification before each release

Documented in `docs/quickbooks-release-checklist.md`:

1. Connect to Intuit sandbox company with seeded TB data.
2. Pull TB, accept proposed mappings, commit.
3. Verify imported TB matches Intuit sandbox's trial balance report.
4. Disconnect, reconnect, verify no duplicate connection row.

## Phasing & milestones

Each phase is independently shippable and leaves the system in a working state.

### Phase 0 — Discovery (½ day, non-code)

- Register Intuit developer account; create sandbox app; capture credentials +
  redirect URI.
- Audit existing `FinancialStatementMapping.link_code` values in dev DB →
  produce the canonical list the mapping rules will target.
- Build the QBO `AccountType × AccountSubType` → `link_code` mapping table as
  a reviewed document (not code yet). Most error-prone piece of the project;
  deserves its own review cycle.
- **Deliverable:** `docs/quickbooks-account-mapping.md` committed.

### Phase 1 — Data model + encryption (½ day)

- `QuickBooksConnection` model + Alembic migration.
- `QBO_TOKEN_ENCRYPTION_KEY`, `INTUIT_*` env vars in `config.py` and `.env.example`.
- Token encryption helpers + Fernet round-trip tests.
- **Deliverable:** migration runs clean; encryption tests pass. No user-visible change.

### Phase 2 — OAuth flow (1 day)

- `oauth.py`: authorize URL builder, state JWT, token exchange, refresh.
- `authorize` / `callback` / `disconnect` / `connection-status` routers.
- Pytest coverage for all OAuth edge cases.
- Frontend: connect button on `/settings/companies/[id]/quickbooks`; connected
  + disconnected states only. No TB pull yet.
- **Deliverable:** user can connect a sandbox QBO company, see "Connected"
  status, and disconnect. Verified manually against sandbox.

### Phase 3 — QBO client + TB preview (1½ days)

- `client.py` with retry/refresh/throttle handling. Respx-backed tests.
- TB report fetcher + account metadata fetcher + parser.
- `mapping_rules.py` from the Phase 0 document.
- `/trial-balance/preview` endpoint (no commit yet).
- **Deliverable:** preview endpoint returns structured rows with proposals.
  Sandbox smoke test confirms real TB parses correctly.

### Phase 4 — Review UI + commit (1½ days)

- Commit endpoint with 409 conflict handling and transactional writes.
- Review table UI: combobox, confidence badges, filters, bulk "Accept all
  high-confidence", skip checkboxes, balance-check footer, import button.
- 409 overwrite-confirm modal.
- Playwright e2e specs.
- **Deliverable:** end-to-end flow works against sandbox. Phase B of the
  original scope (TB pull + mapping bootstrap) is now shippable.

### Phase 5 — Polish + release checklist (½ day)

- Revoked-connection banner; toast/redirect polish; empty-state copy; loading states.
- `docs/quickbooks-release-checklist.md`.
- README section on sandbox setup for local dev.
- **Deliverable:** ready to merge to main behind sandbox credentials only.

### Phase 6 — Production app review (external, calendar time)

- Submit Intuit production app review (requires working demo, privacy policy
  URL, terms-of-service URL). Typical turnaround 1–4 weeks.
- Once approved, flip `INTUIT_ENVIRONMENT=production` in Azure Container Apps
  config and restart. No code change.
- **Deliverable:** live customers can connect real QBO files.

**Total coding effort:** ~5 days for Phases 0–5.

## Out of scope (explicitly deferred)

- Scheduled background TB refresh.
- Webhook subscriptions for QBO change notifications.
- Pulling anything other than TB (journal entries, invoices, bills).
- Multi-realm / consolidation (Question 2 decision; 1:1 only).
- Generic `ExternalConnection` model for future integrations (premature until
  integration #2 exists).
