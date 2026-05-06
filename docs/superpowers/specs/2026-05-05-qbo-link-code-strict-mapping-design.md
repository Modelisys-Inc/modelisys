# QBO link-code mapping: strict picker + inline creation

**Date:** 2026-05-05
**Status:** Approved (verbal)
**Replaces:** parts of `2026-04-14-quickbooks-connector-design.md` (auto-proposal via `mapping_rules.py`)

## Goal

When a user imports a trial balance from QuickBooks, every account must be either:
- mapped to a **link code that already exists** in the company's statement structure, or
- mapped to a **brand-new link code** that the user creates inline (which is added to the company's statement structure as part of the action), or
- explicitly **skipped**.

No silent fallbacks. No generic auto-proposal. No imports that produce orphan link codes (i.e. codes that are stored on `AccountMapping` / `TrialBalanceEntry` but appear on no financial statement).

## Why

The current QBO flow uses `mapping_rules.py` — a generic French-language `(AccountType, AccountSubType) -> link_code` table — to pre-fill `proposed_link_code` and a `high/medium/low` confidence badge. Two problems:

1. **The proposals are usually wrong.** Each org's `CompanyStatementStructure` has org-specific link codes (`20-101`, `44-330`, etc.). The hardcoded rules don't match.
2. **Free-form link codes create orphans.** The current review-table input lets the user type any string. If that string isn't in the company's statement structure, the imported amounts are stored but no statement renders them.

There's also a latent bug: the existing `list_link_codes` endpoint reads from `FinancialStatementMapping` (org-level, types `bilan`/`resultats`/...) but actual statements are rendered from `CompanyStatementStructure` (company-level, types `income-statement`/`balance-sheet`/...). The picker is reading from the wrong table.

## Source of truth

**`CompanyStatementStructure`** — one row per `(company_id, statement_type)`, types in `{income-statement, balance-sheet, cash-flow, capex, baiia}`. The `structure` JSON is a tree of nodes; leaves carry a `linkCode` (camelCase, sometimes `link_code`) field.

A "valid link code" for a company is any leaf-level `linkCode` (or `link_code`) found across all of the company's `CompanyStatementStructure` rows.

## Backend changes

### Remove

- `backend/app/integrations/quickbooks/mapping_rules.py` — delete
- `backend/tests/integrations/quickbooks/test_mapping_rules.py` — delete
- `from app.integrations.quickbooks.mapping_rules import propose` in `service.py`
- `proposed_link_code` and `confidence` fields from the preview row response (`schemas/quickbooks.py` or wherever they live)
- All references to `proposed_link_code` / `confidence` in tests

### Repoint `GET /api/quickbooks/companies/{id}/link-codes`

Implementation switches from `FinancialStatementMapping` to `CompanyStatementStructure`. For each of the company's structures, walk the tree and emit one entry per leaf with a link code. Response shape:

```json
[
  {
    "code": "20-101",
    "label": "Développement sur mesure",
    "statement_type": "income-statement",
    "parent_id": "revenue",
    "parent_label": "Revenus"
  },
  ...
]
```

Sort: by `statement_type`, then by leaf order within the structure. Dedupe on `code` (first occurrence wins) so a code that somehow appears under two parents shows up once.

### New endpoint `POST /api/companies/{id}/link-codes`

Adds a new leaf to a specific parent in one of the company's `CompanyStatementStructure` trees.

Request:
```json
{
  "statement_type": "income-statement",
  "parent_id": "admin-expenses",
  "link_code": "44-999",
  "label": "Nouveau poste"
}
```

Response: same shape as one entry from `list_link_codes`.

Validation:
- `statement_type ∈ VALID_STATEMENT_TYPES` (already defined in `routers/statement_structures.py`)
- Parent node with `id == parent_id` must exist in that structure (recursive search)
- `link_code` must NOT already appear anywhere in the company's structures (uniqueness across all statement types of this company)
- `label` non-empty

Effect: locates the parent, appends `{"id": link_code, "label": label, "linkCode": link_code}` to its `children` array (creates the array if missing). Persist with the same upsert path used by `PUT /statement-structures/{type}` (i.e. write to `CompanyStatementStructure.structure`).

Errors:
- 404 if company not accessible by user
- 422 with structured detail for validation failures (specify which check failed)

### Strict validation in `commit_trial_balance`

Before writing rows:

1. Build `valid_codes: set[str]` by walking every `CompanyStatementStructure` for this company.
2. For each row where `skip is False`:
   - `link_code` must be non-empty
   - `link_code` must be in `valid_codes`
3. If any row fails, raise a structured exception → router translates to 422 with body listing the offending account numbers + their codes.

Skipped rows are exempt from validation (consistent with current behaviour).

### `propose_trial_balance`

- Drops the call to `propose(...)` and the `proposed_link_code` / `confidence` fields.
- Keeps `existing_link_code` (lookup against `AccountMapping` by `account_number`) — used to pre-fill the picker on re-import.

## Frontend changes

### `frontend/components/quickbooks-review-table.tsx`

- Remove `confidence` from `RowState`.
- Remove the **Confidence** column and badge.
- Filters change: `All` / `Unmapped` / `Mapped`. (`Mapped` = `link_code != null`; `Unmapped` = `!skip && !link_code`.)
- Initial `link_code` per row = `existing_link_code` if present, else `null`.
- Replace the free-form `<Input list="qbo-link-codes">` with a **Combobox**:
  - Built from shadcn `Popover` + `Command`. Items: the list returned by `listQboLinkCodes`, grouped by `statement_type` (income-statement, balance-sheet, ...), labels show `code — label` with parent section as caption.
  - Sticky top item: `+ Create new link code…` → opens `CreateLinkCodeDialog` pre-seeded with the row's account name as default `label`.
  - Selecting an existing code sets `row.link_code`.
- After dialog confirm, refresh `linkCodes`, then set the current row's `link_code` to the new code.
- `canCommit`: every non-skipped row must have a `link_code`. (No additional client-side validation against the picker list — the server enforces.)

### New `CreateLinkCodeDialog`

Fields:
- **Statement type** — `<Select>`, options: income-statement, balance-sheet, cash-flow, capex, baiia.
- **Parent section** — `<Select>`, options dependent on the chosen statement type. Loaded by fetching `GET /api/companies/{id}/statement-structures/{statement_type}` and listing nodes that have either `isSection: true` or any existing `children` (i.e. plausible parents). Display: indented label.
- **Link code** — `<Input>`, required, validated client-side against the existing `linkCodes` list (no duplicates).
- **Label** — `<Input>`, required, defaults to the QBO row's account name.

Submit: `POST /api/companies/{id}/link-codes`. On 422, surface the server message inline. On success, fire `onCreated(newCode)`.

### `frontend/lib/api.ts`

- Drop `proposed_link_code` and `confidence` from `QboTrialBalancePreviewRow`.
- Add:
  ```ts
  export async function createLinkCode(
    companyId: string,
    body: { statement_type: string; parent_id: string; link_code: string; label: string },
  ): Promise<QboLinkCode>
  ```
- Extend `QboLinkCode` with `parent_id` and `parent_label`. (Consumers updated accordingly.)

## Tests

### Backend

- `tests/integrations/quickbooks/test_router.py`:
  - Update existing preview tests: remove `proposed_link_code`/`confidence` assertions.
  - Add `list_link_codes` tests against seeded `CompanyStatementStructure` (was previously testing against `FinancialStatementMapping`).
  - Add `POST /link-codes` tests: happy path, invalid statement_type (422), missing parent (422), duplicate code (422), persistence verified by re-fetching the structure.
  - Add `commit_trial_balance` tests: rejects unknown link codes (422 with offending list), accepts skipped rows even with unknown codes, accepts when all codes are valid.
- Delete `tests/integrations/quickbooks/test_mapping_rules.py`.

### Frontend

- `frontend/e2e/quickbooks.spec.ts`:
  - Mock new `link-codes` endpoint with realistic shape.
  - Mock `POST /link-codes`.
  - Exercise: open review table, pick an existing code, open the create dialog, fill it, confirm, see the new code applied to the row, commit.

## Out of scope (future)

- Standalone "Manage link codes" page — only inline creation for now.
- Sort order within children — append-to-end. A future structure-editor pass can reorder.
- Editing or deleting existing link codes from the QBO flow.
- Backfill / migration: existing `AccountMapping.link_code` values that don't match any structure leaf are NOT cleaned up by this change. They remain orphans until someone touches them.
