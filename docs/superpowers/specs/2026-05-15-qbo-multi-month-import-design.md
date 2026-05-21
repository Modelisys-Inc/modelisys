# QuickBooks multi-month trial balance import

## Background

The QuickBooks Online (QBO) connector currently imports a single (fiscal_year, month) trial balance per request. Users catching up a fiscal year — or initial-loading a new connection — must repeat preview → mapping review → commit once per month. With six to twelve months of history this is tedious, and re-doing per-row link-code review every month is the bulk of the friction.

QBO TB reports are always cumulative year-to-date (fiscal-year-start through end-of-target-month). Importing N months therefore requires N TB API calls; there is no "give me Jan + Feb separately in one call" endpoint. Each pull is stored as its own `TrialBalanceEntry(fiscal_year, month)` row, and the company is forced into `is_cumulative_tb=True` so the financial-statement service de-cumulates on read.

## Goal

Let users import a contiguous range of months within a single fiscal year in one flow: pick FY + start month + end month, review mappings **once** across the union of accounts that appear in any month, then commit all months atomically.

Non-goals:

- Cross–fiscal-year ranges (e.g. Dec FY1 + Jan FY2). Out of scope.
- Arbitrary non-contiguous multi-select. The backend will accept any month list, but the frontend only emits contiguous ranges.
- Per-month mapping overrides. One link code per account applies to every month in the range.
- Backwards compatibility with the existing single-month request shape. The QBO connector was added recently and the frontend is the only caller; we update both in the same PR.

## Backend API

### Request/response shapes

Both endpoints replace `month: int` with `months: list[int]` (each in `[1, 12]`, deduped, sorted ascending server-side).

**`POST /api/quickbooks/companies/{id}/trial-balance/preview`**

```json
// Request
{ "fiscal_year": 2026, "months": [1, 2, 3, 4, 5, 6] }
```

```json
// Response
{
  "fiscal_year": 2026,
  "months": [1, 2, 3, 4, 5, 6],
  "currency": "USD",
  "fetched_at": "2026-05-15T12:00:00Z",
  "existing_months": [1, 2],
  "rows": [
    {
      "qbo_account_id": "42",
      "account_number": "1000",
      "account_name": "Cash",
      "qbo_account_type": "Bank",
      "qbo_account_sub_type": "Checking",
      "existing_link_code": "BS.CA.CASH",
      "monthly_amounts": {
        "1": { "debit": 12345.67, "credit": 0 },
        "2": { "debit": 13500.00, "credit": 0 },
        "6": { "debit": 21000.00, "credit": 0 }
      }
    }
  ]
}
```

`monthly_amounts` is sparse: a month key is present only if the account had a non-zero entry in that month's QBO TB report. `existing_months` lists which months in the requested range already have stored `TrialBalanceEntry` rows.

**`POST /api/quickbooks/companies/{id}/trial-balance/commit`**

```json
// Request
{
  "fiscal_year": 2026,
  "months": [1, 2, 3, 4, 5, 6],
  "overwrite_existing_tb": false,
  "rows": [
    { "account_number": "1000", "account_name": "Cash", "link_code": "BS.CA.CASH", "skip": false }
  ]
}
```

The commit body mirrors today's shape: one row per unique account in the union, with the user's chosen `link_code` or `skip=true`. Amounts are **not** sent from the client — the server re-pulls QBO for every committed month (see Behavior below).

```json
// Response (201)
{
  "months_imported": 6,
  "accounts_imported": 47,
  "mappings_created": 12,
  "mappings_updated": 3
}
```

### Behavior — preview

1. Validate `months`: non-empty, all in `[1, 12]`, dedupe, sort. Otherwise 422.
2. For each month, call `qbo_client.get_trial_balance_report(start_iso, end_of_month_iso)` where `start_iso` is the fiscal-year start (same `_date_range_for` logic as today, evaluated per month). N HTTP calls.
3. Call `qbo_client.list_accounts` once and reuse for metadata.
4. Build the union: a dict keyed by `account_number`, accumulating per-month debit/credit. Carry `existing_link_code` from `AccountMapping` if present.
5. Query `TrialBalanceEntry` for the company filtered to `fiscal_year` and `month IN months` to derive `existing_months`.
6. Map QBO client errors with the existing translations (rate-limit → 503, timeout → 504, other → 502).

No DB writes.

### Behavior — commit

1. Validate `months` (same rules as preview).
2. Validate link codes for non-skipped rows against `CompanyStatementStructure` (same as today). Any unknown code → 422 with the offending `(account_number, link_code)` list.
3. **Re-pull QBO TB for every month** before opening the write transaction. If any pull fails → return 502/503/504, nothing written. This is the insurance step against stale preview data and the reason commit doesn't trust client-supplied amounts.
4. Acquire `Company` row lock (existing pattern).
5. Count existing `TrialBalanceEntry` rows for `(company, fiscal_year, month IN months)`. If any month conflicts and `overwrite_existing_tb=false` → 409 with the list of conflicting months, no writes.
6. If overwriting: delete existing entries for the conflicting months only (months without conflicts are untouched as a no-op delete).
7. **Data-drift check**: build the union of `account_number`s in the re-pulled reports. If any account appears in the re-pull but is missing from the client-supplied `rows`, return 409 with `detail: "Data drift detected, re-preview"` and the list of new account numbers. (Accounts that existed in preview but disappear from the re-pull are simply not written for that month — no error.)
8. Upsert `ChartOfAccount` and `AccountMapping` once per non-skipped row in `rows`.
9. For each month in `months`, iterate the re-pulled report's rows. For each row whose `account_number` matches a non-skipped row in the user's selection, insert one `TrialBalanceEntry(company, account, fiscal_year, month, amount=debit-credit)`. Skipped rows are not written for any month.
10. Force `company.is_cumulative_tb = True` if not already.
11. Commit transaction. Response counts: `months_imported = len(months)`; `accounts_imported` = number of unique non-skipped accounts written at least once; `mappings_created` / `mappings_updated` as today.

Atomicity: steps 3 and 5 are guard rails before the transaction. Steps 4–10 are one transaction — any failure rolls back the entire commit.

### Why re-pull on commit

The preview response contains amounts but commit deliberately re-pulls instead of trusting them. Three reasons:

1. The user may sit on the preview for a long time; QBO data could change.
2. It keeps the commit payload small (no per-month amount dict per row × hundreds of rows).
3. It mirrors today's single-month behavior, which also re-derives from a fresh source on commit (the client doesn't send amounts in the current implementation either).

## Frontend UX

### Connect screen — month picker

[frontend/app/settings/companies/[id]/quickbooks/page.tsx](frontend/app/settings/companies/[id]/quickbooks/page.tsx) replaces the single `Month` input with two number inputs:

- **Start month** (1–12)
- **End month** (1–12)

Client-side validation: both required, both in `[1, 12]`, `start <= end`. The fiscal year input is unchanged. The preview button label changes from "Preview trial balance" to "Preview <N> months" once a valid range is chosen.

Loading state during preview: "Pulling N months from QuickBooks…" (N reflects the chosen range).

### Review table

[frontend/components/quickbooks-review-table.tsx](frontend/components/quickbooks-review-table.tsx) gets the following additions:

- **Range header** above the table: "Trial balance for FY 2026, January – June (6 months)." If `existing_months` is non-empty: append "2 months already have data — overwrite to replace them."
- **Per-month amount columns**: replace the single Debit/Credit pair with N small columns labeled by month abbreviation (Jan, Feb, …). Each cell shows `debit - credit` formatted compactly (e.g. `12.3k`, `(4.5k)` for negatives) and is blank when the account has no entry that month.
- **Wide-range collapse**: when N > 6, the per-month columns collapse to a single "Activity" column showing the sum across the range, with a hover/popover (or expandable row) revealing the per-month breakdown. Keeps the table usable.
- The existing **link-code picker** stays as is — one selection per account, applied across all months.
- The existing **"Overwrite existing trial balance"** checkbox stays. Its label updates dynamically: "Overwrite the 2 months already imported" when `existing_months.length > 0`, hidden otherwise.
- **Commit button** label: "Import N months."

The success toast on commit becomes: "Trial balance imported — N months, X accounts, Y new mappings, Z updated."

### API client

Add to [frontend/lib/api.ts](frontend/lib/api.ts):

- `previewQboTrialBalance(companyId, fiscalYear, months: number[])` — replace existing single-month version.
- `commitQboTrialBalance(companyId, fiscalYear, months, rows, overwriteExistingTb)` — replace existing single-month version.
- Updated TypeScript types: `QboTrialBalancePreview` now has `months: number[]`, `existing_months: number[]`, and each row has `monthly_amounts: Record<string, { debit: number; credit: number }>`.

## Testing

### Backend ([backend/tests/integrations/quickbooks/](backend/tests/integrations/quickbooks/))

Preview:

- Pulls N times for a contiguous range, builds union of accounts, populates `monthly_amounts` sparsely.
- Returns `existing_months` correctly when some months already have `TrialBalanceEntry` rows.
- 422 on `months=[]`, on out-of-range months, on `months=[6, 13]`.
- Server dedupes and sorts: `months=[3, 1, 2, 2]` → `months=[1, 2, 3]` in response.
- QBO rate-limit / timeout on any month → 503 / 504 (no partial response).

Commit:

- All-new months → success, counts reflect N months, `TrialBalanceEntry` rows exist for every (account, month) in `monthly_amounts`.
- Overlap + `overwrite_existing_tb=false` → 409 listing conflicting months; DB row counts unchanged.
- Overlap + `overwrite_existing_tb=true` → existing entries for conflicting months replaced; non-conflicting months added.
- QBO pull fails on month 4 of 6 → 502; DB row counts unchanged (transaction never opened).
- Data drift: re-pull surfaces a new account that wasn't in preview → 409 with that account number; nothing written.
- Invalid link codes for non-skipped rows → 422 with offending list; nothing written.
- `skip=true` rows are not committed for any month.
- Forces `is_cumulative_tb=True` on a company that wasn't already cumulative.

### Frontend e2e ([frontend/e2e/quickbooks.spec.ts](frontend/e2e/quickbooks.spec.ts))

- Pick start=1, end=3, preview → review table shows three Jan/Feb/Mar amount columns and the union of accounts across them.
- Commit → success banner says "3 months imported."
- Conflict path: stub `existing_months=[1, 2]` in the preview mock → range header mentions "2 months already have data," overwrite checkbox label updates to match.
- Wide-range collapse: start=1, end=10 → review table shows the single "Activity" column with per-month expansion.

All backend tests mock Intuit via `respx`. Frontend e2e mocks the QBO backend endpoints.

## Migration / compatibility

- **Schema changes** are in Pydantic request/response models only (`TrialBalancePreviewRequest`, `TrialBalanceCommitRequest`, `TrialBalancePreviewResponse`, `TrialBalanceCommitResponse`). No Alembic migration — `TrialBalanceEntry` already stores per-(FY, month) rows.
- **Backwards compatibility**: the old `month: int` field is removed, not aliased. The frontend is the only caller and is updated in the same PR. The release checklist in [docs/quickbooks-release-checklist.md](docs/quickbooks-release-checklist.md) is updated to reflect the new request shape.
- **Rollout**: ship in one PR; no feature flag. The connector is recent enough that the existing single-month flow has no production users we need to grandfather.
