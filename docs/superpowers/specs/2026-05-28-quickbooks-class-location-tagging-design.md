# QuickBooks Class/Location → Division/SubDivision tagging

**Date:** 2026-05-28
**Status:** Design approved, pending spec review

## Summary

QuickBooks Online tracks two transaction-level dimensions beyond the chart of
accounts: **Class** (FR UI: *Catégorie/Classe*, API entity `Class`) and
**Location** (FR UI: *Lieu/Emplacement*, API entity `Department`). Modelisys
already models a `Division → SubDivision` hierarchy and tags GL accounts to them
via free-text `AccountMapping.divisions` / `AccountMapping.sub_divisions` CSV
fields, consumed by the financial-statements filter (`_mapping_csv_matches_entity`).

This feature auto-populates those tags during the existing QBO trial-balance
import by discovering, per account, which QBO Classes and Locations it appears
under. **Class → `divisions`, Location → `sub_divisions`.**

## Decisions (from brainstorming)

1. **Goal:** auto-tag account mappings only. The trial balance storage
   (`TrialBalanceEntry`, per account/month/company) is **not** restructured or
   dimensioned by division. Tags live on `AccountMapping` as today.
2. **Mapping direction:** QBO Class → `divisions`; QBO Location → `sub_divisions`.
3. **Division→SubDivision tree:** build **only observed combinations** — a
   Location is nested under a Class only if some account had a transaction line
   with that (Class, Location) pair.
4. **Trigger:** discovered during **preview**, shown per-row and **editable** in
   `QuickBooksReviewTable`; written on **commit**.
5. **Existing tags:** **merge (union, deduped)** — the displayed default is the
   union of any existing manual/prior tags and the freshly discovered QBO values.
6. **Discovery mechanism:** **General Ledger report** (Approach A) — a single
   report per import yields account→class, account→location, and observed
   (class, location) pairs.

## Current state (as of design)

- `Division` / `SubDivision` tables exist (`backend/app/models/company.py`):
  thin, `name` + parent link only. SubDivision is a child of Division.
- `AccountMapping.divisions` / `.sub_divisions` are `String(255)` free-text,
  comma-separated tokens (names, occasionally legacy UUIDs).
- `financial_statements.py` filters by these via `_mapping_csv_matches_entity`,
  which splits on comma and matches if any token equals the selected entity
  **name** (or UUID). Division and sub-division filters are applied
  **independently** — the sub-division match does not require the parent
  division to match, so the account-mapping CSV only needs location *names*.
- `TrialBalanceEntry` has **no** division dimension.
- QBO connector (`backend/app/integrations/quickbooks/`) pulls a company-wide
  `TrialBalance` report (`get_trial_balance_report`) over a YTD date range
  (`_date_range_for`) and runs a two-step preview → commit
  (`propose_trial_balance` / `commit_trial_balance`).
- Frontend `EntitySelector` renders Division → SubDivision dropdowns from
  `company.divisions[].subDivisions[]`; only sub-divisions nested under the
  chosen division are shown (so the tree shape matters for the UI).

## Architecture mismatch addressed

QBO Class and Location are **independent** axes; Modelisys nests SubDivision
under Division. We reconcile this by:
- Storing only **names** in the account-mapping CSV (filter matches by name,
  parent-independent) — tagging stays simple.
- Building the `Division`/`SubDivision` **rows** (for the selector tree) from
  **observed (class, location) pairs**, so the same Location may appear as a
  SubDivision under multiple Class divisions.

## Design

### 1. Backend — QBO data discovery

**`client.py` new methods:**
- `get_preferences(db, conn)` — reads class/location tracking flags
  (`AccountingInfoPrefs.ClassTrackingPerTxn` / `ClassTrackingPerTxnLine`,
  `TrackDepartments`). If both off, discovery is a no-op.
- `get_general_ledger_report(db, conn, start_date, end_date)` —
  `GET /reports/GeneralLedger`, `columns=account_name,klass_name,dept_name,subt_nat_amount`,
  `accounting_method=Accrual`, same YTD range as the TB pull. Handles report
  pagination; caps pages with a logged safety limit.

**`service.py` new functions:**
- `_parse_general_ledger(report) -> list[line]` — flattens the nested GL report;
  GL groups rows by account (section header carries account name + id), each
  line contributes its `klass_name` / `dept_name`. Pure function.
- `discover_class_location_tags(report, accounts_by_id) -> {
      by_account: { account_number: { classes: set[str], locations: set[str] } },
      observed_pairs: set[(class_name, location_name)],
      classes: set[str],
      locations: set[str],
  }`
  - Account number resolved via existing `accounts_by_id` map (same as TB
    parsing), falling back to GL account id/name.
  - Membership by **presence** of a line (not amount).
  - An **observed pair** requires a line with **both** class and location;
    single-dimension lines still feed the per-account sets.
  - Names taken verbatim from GL columns (incl. `Parent:Child` for nested classes).

### 2. Backend — preview & commit integration

**`propose_trial_balance` (preview):**
- After the account union, fetch preferences + GL and run discovery (best-effort).
- Per row, attach:
  - `discovered_divisions`: sorted classes for that account
  - `discovered_sub_divisions`: sorted locations for that account
  - `divisions`: union(existing `AccountMapping.divisions` CSV split, discovered
    classes), deduped + sorted — the editable default
  - `sub_divisions`: same merge for locations
- Response top-level additions:
  - `observed_pairs: list[{division, sub_division}]`
  - `class_location_tracking: {classes: bool, locations: bool}`
- Tracking disabled / no usage → discovered lists empty, existing tags pass through.

**`commit_trial_balance` (inside the existing TB write transaction):**
1. Each committed row carries final `divisions` / `sub_divisions` lists
   (post user-edit). On `AccountMapping` upsert, write them comma-joined (CSV),
   for new and existing mappings alike (user-approved merged value wins).
2. Division/SubDivision row upserts, company-scoped:
   - one `Division` per distinct committed class name;
   - per **observed (class, location) pair**, one `SubDivision(name=location)`
     under that class's `Division`.
   - Upsert = match by name within scope, create if absent; **additive only** —
     never delete divisions/sub-divisions no longer observed (protects
     manually created ones). Idempotent across re-commits.

**Schema changes (`schemas/quickbooks.py` or equivalent):**
- Preview row: `discovered_divisions`, `discovered_sub_divisions`, `divisions`,
  `sub_divisions`.
- Preview response: `observed_pairs`, `class_location_tracking`.
- Commit row request: `divisions: list[str] = []`, `sub_divisions: list[str] = []`.

### 3. Frontend — review table & API types

**`lib/api.ts`:**
- `QuickBooksPreviewRow`: `discoveredDivisions`, `discoveredSubDivisions`,
  `divisions`, `subDivisions` (string arrays).
- `QuickBooksPreviewResponse`: `observedPairs`, `classLocationTracking`.
- Commit row payload: `divisions`, `subDivisions`. (snake_case ↔ camelCase
  mapping per existing convention.)

**`QuickBooksReviewTable`:**
- Conditionally render **Division** and **Sous-division** columns only when
  `classLocationTracking.classes` / `.locations` are true.
- Each cell: editable multi-value chip input prefilled with merged values;
  add-control offers the union of discovered values across the preview plus free
  text. Reuse existing input + badge primitives — no new component library.
- Visual distinction between discovered vs. manual chips is **out of scope**
  (deliberate YAGNI cut) — merged values shown uniformly.
- On commit, send each row's current `divisions` / `subDivisions` arrays.
- State rides along in the existing editable-row state — no new fetch/context.

### 4. Edge cases, error handling & testing

**Edge cases:**
- Tracking disabled → skip GL entirely, empty discovery, columns hidden, no
  behavior change.
- GL/preferences call fails → log warning, return empty discovery, TB preview
  proceeds (best-effort, never blocks import).
- GL pagination → loop until exhausted, capped with logged max.
- Account in GL but not TB → ignored (no row to tag); TB-only account → no tags.
- Trim tokens, dedupe, skip empties — consistent with `_mapping_csv_matches_entity`.
- Commit atomic: Division/SubDivision upserts in the TB write transaction;
  failure rolls back the whole import.

**Testing:**
- Backend (`tests/integrations/quickbooks/`, respx):
  - `_parse_general_ledger` (class-only / location-only / both / neither rows).
  - `discover_class_location_tags` per-account sets + observed pairs.
  - Preview merge (union/dedupe) of existing CSV + discovered.
  - Commit writes CSV onto `AccountMapping` and creates Division/SubDivision rows
    for observed pairs only; re-commit idempotent.
  - Tracking-disabled path (no GL call). GL-failure path (preview still succeeds).
- Frontend e2e (`frontend/e2e/quickbooks.spec.ts`): mock preview with discovered
  tags → columns render, chip add/remove, commit sends edited arrays; mock with
  tracking off → columns absent.

## Verification carried into implementation

Confirm against QBO API docs **before** wiring the client:
- GeneralLedger report `columns` tokens (`klass_name`, `dept_name`,
  `subt_nat_amount`) and its row/section shape.
- `/preferences` field names for class & location tracking.

## Out of scope (YAGNI)

- Dimensioning `TrialBalanceEntry` by division (no per-class TB storage).
- Deleting stale Division/SubDivision rows.
- Distinguishing discovered vs. manual chips in the UI.
- Importing QBO classes/locations that have **no** transaction activity.
