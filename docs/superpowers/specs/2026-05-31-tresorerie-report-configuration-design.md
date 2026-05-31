# Trésorerie report configuration — full parity with Bilan/Résultats

**Date:** 2026-05-31
**Status:** Approved (design)

## Goal

Bring the **Trésorerie** (cash-flow) Sommaire and Détail views up to full parity
with **Résultats** (income-statement) and **Bilan** (balance-sheet): an inline
"report configuration" editor that lets users customize the statement
*structure* — add/remove/reorder rows, sections, hide rows, set liaison/link
codes (unique / somme / différence) that map GL accounts to rows, and control
Annexe → Détail. The configured structure drives the computed numbers.

Additionally, make default structures behave consistently across all three
reports: when a company has not saved a structure, the **computed statement**
(not just the editor) falls back to a standard default instead of rendering
blank.

## Background / current state

- **Backend is already structure-driven for cash-flow.** `get_cash_flow`
  (`backend/app/routers/financial_statements.py:133`) calls the same generic
  `compute_financial_statement(db, company, "cash-flow", …)` used by
  income-statement and balance-sheet. The docstring's "derived from income
  statement and balance sheet deltas" is legacy wording; in practice cash-flow
  is computed from its `CompanyStatementStructure` + `AccountMapping` link
  codes, exactly like the other two.
- The structure endpoints already accept cash-flow:
  `VALID_STATEMENT_TYPES = {"income-statement", "balance-sheet", "cash-flow", "capex", "baiia"}`
  (`backend/app/routers/statement_structures.py:23`).
- The structure-edit hook is **generic**: `useStatementStructureEdit(companyId,
  active, statementType)` in
  `frontend/hooks/use-income-statement-structure-edit.ts`, with thin wrappers
  `useIncomeStatementStructureEdit` / `useBalanceSheetStructureEdit`. The type
  is currently `"income-statement" | "balance-sheet"`.
- The liaison editor `frontend/components/income-statement-liaison-cell.tsx`
  and the helpers in `frontend/lib/income-statement-structure-utils.ts` are
  statement-type-agnostic.
- **Gap is purely frontend:** `frontend/components/cash-flow-summary.tsx` and
  `cash-flow-detail.tsx` are simple renderers with none of the inline edit UI
  (settings button, liaison columns, add/remove/hide rows, annexes) that
  `income-statement-summary.tsx` / `balance-sheet-summary.tsx` have. In Bilan,
  **both** Summary and Detail receive `showBalanceSheetStructureSettings`,
  `structureVersion`, and `onBalanceSheetStructureSaved`
  (`balance-sheet/page.tsx:507,535`).
- **Two inconsistencies in default handling:**
  - `GET /statement-structures/{type}` returns `DEFAULT_INCOME_STATEMENT` /
    `DEFAULT_BALANCE_SHEET` when none stored (so the *editor* shows defaults),
    but there is **no `DEFAULT_CASH_FLOW`**.
  - `compute_financial_statement` returns `rows: []` when no structure row
    exists (`backend/app/services/financial_statements.py:1629`), so the actual
    statement is blank until the user opens the editor and saves — for all
    three types.

## Approach

**Approach A — Mirror Bilan.** Port the inline edit UI into the cash-flow
components, reusing the already-generic substrate (hook, liaison cell, utils).
Leave Résultats/Bilan UI untouched. Chosen for lowest regression risk; the
genuinely shared pieces are already extracted, and extracting a fully shared
editor (Approach B) would be a large, risky refactor of working code with
income-statement-specific annex-detail logic that resists clean extraction.

## Detailed design

### 1. Backend — defaults + consistent fallback

**1a. Shared defaults module.** Create
`backend/app/services/statement_structure_defaults.py` (or equivalent shared
location). Move `DEFAULT_INCOME_STATEMENT` and `DEFAULT_BALANCE_SHEET` there
from `routers/statement_structures.py`, and add `DEFAULT_CASH_FLOW`:

```python
DEFAULT_CASH_FLOW = [
    {"label": "flux de trésorerie liés à l'exploitation", "isBold": True, "isSection": True},
    {"label": "flux de trésorerie liés aux activités d'investissement", "isBold": True, "isSection": True},
    {"label": "flux de trésorerie liés aux activités de financement", "isBold": True, "isSection": True},
    {"label": "variation nette de la trésorerie", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "trésorerie au début de l'exercice"},
    {"label": "trésorerie à la fin de l'exercice", "isBold": True, "isResult": True},
]

DEFAULT_STRUCTURES = {
    "income-statement": DEFAULT_INCOME_STATEMENT,
    "balance-sheet": DEFAULT_BALANCE_SHEET,
    "cash-flow": DEFAULT_CASH_FLOW,
}
```

(Exact section labels/flags may be tuned during implementation; the three
operating/investing/financing sections + net change + opening/closing cash are
the required content.)

**1b. Router.** `routers/statement_structures.py` imports the defaults from the
shared module. The `GET` fallback (currently `defaults = {…}` at lines
114–123) becomes `DEFAULT_STRUCTURES.get(statement_type, [])`, now covering
cash-flow.

**1c. Computation fallback.** In `compute_financial_statement`
(`financial_statements.py:1587`) and `compute_financial_statement_series`
(`:2253`), replace the "no structure → empty rows" early return with a default
fallback. Introduce a `structure_rows` list:

```python
structure_rows = list(structure.structure) if structure else DEFAULT_STRUCTURES.get(statement_type, [])
```

and use `structure_rows` for the downstream computation (rows render with zero
amounts until link codes are mapped). Applies to all three statement types.

**Behavior change (accepted):** companies with no saved structure will now show
the default rows with zero values instead of a blank statement, on all three
reports.

### 2. Frontend — editor parity

**2a. Hook.** In `frontend/hooks/use-income-statement-structure-edit.ts`:
- Extend the statement-type union (`StatementStructureEditKind`) to include
  `"cash-flow"`.
- Export `useCashFlowStructureEdit(companyId, active)` →
  `useStatementStructureEdit(companyId, active, "cash-flow")`.
- Annex scheme: the hook currently sets `scheme = statementType ===
  "balance-sheet" ? "number" : "letter"`. Cash-flow falls into the `"letter"`
  branch (like Résultats). Acceptable default; trivially switchable.

**2b. `CashFlowSummary` & `CashFlowDetail`.** Add props
`showCashFlowStructureSettings?: boolean`, `structureVersion?: number`,
`onCashFlowStructureSaved?: () => void`. Port the inline edit UI from the Bilan
components:
- Paramètres (enter edit) / Enregistrer / Annuler buttons, gated on
  `showCashFlowStructureSettings && companyId && !comparisonMode`.
- Structure columns: Libellé, Séparation (separatorAbove), Masquer (hidden),
  Code (defineMapping), **Liaison** (via shared `IncomeStatementLiaisonCell`),
  Annexe (showInDetail), Lettre (annex identifier), Actions (insert/remove).
- Reuse `lib/income-statement-structure-utils.ts` helpers.
- When `structureEditMode` is on, render the editable structure-driven table
  (mirroring Bilan); otherwise the normal summary/detail render is unchanged.

**2c. Cash-flow page** (`app/financial-statements/cash-flow/page.tsx`):
- Add `const [structureVersion, setStructureVersion] = useState(0)`.
- Pass `structure_rev: structureVersion` in the `getCashFlow` params and add
  `structureVersion` to the fetch effect deps.
- Pass `showCashFlowStructureSettings`, `structureVersion`, and
  `onCashFlowStructureSaved={() => setStructureVersion(v => v + 1)}` to both
  `CashFlowSummary` and `CashFlowDetail`.
- Pass `structureVersion` to the Tableau-de-bord `StatementChart` too (as Bilan
  does at `balance-sheet/page.tsx:497`).
- Confirm `FinancialStatementParams` / `getCashFlow` in `lib/api.ts` accept
  `structure_rev` (income-statement and balance-sheet pages already pass it).

### 3. Data flow

Open Trésorerie → Sommaire/Détail → **Paramètres** → hook loads
`GET /statement-structures/cash-flow` (returns `DEFAULT_CASH_FLOW` if none) →
user edits rows / maps liaison codes → **Enregistrer** →
`PUT /statement-structures/cash-flow` → `onCashFlowStructureSaved` bumps
`structureVersion` → page refetches `getCashFlow?…&structure_rev=N` → recomputed
rows reflect the new structure and mappings.

### 4. Testing

**Backend (pytest):**
- `GET /statement-structures/cash-flow` returns `DEFAULT_CASH_FLOW` when none
  stored.
- `PUT /statement-structures/cash-flow` persists and round-trips.
- `compute_financial_statement` and `compute_financial_statement_series` return
  the default rows (non-empty) for `income-statement`, `balance-sheet`, and
  `cash-flow` when no structure is stored.

**Frontend (Playwright):**
- On Trésorerie Sommaire, the **Paramètres** button is visible.
- Entering edit mode renders the structure-edit table.
- Toggling a row hidden + setting a liaison code + **Enregistrer** (mocked
  `PUT`) triggers a refetch (assert `structure_rev` increments / refetch
  occurs).
- Mirror the existing Bilan structure-edit e2e if one exists.

## Out of scope

- Refactoring Résultats/Bilan into a shared editor component (Approach B).
- Re-seeding default structures into the database for existing companies
  (runtime fallback only).
- Changing the cash-flow computation semantics beyond the structure-driven path
  that already exists.

## Files touched (anticipated)

- `backend/app/services/statement_structure_defaults.py` (new)
- `backend/app/routers/statement_structures.py`
- `backend/app/services/financial_statements.py`
- `frontend/hooks/use-income-statement-structure-edit.ts`
- `frontend/components/cash-flow-summary.tsx`
- `frontend/components/cash-flow-detail.tsx`
- `frontend/app/financial-statements/cash-flow/page.tsx`
- `frontend/lib/api.ts` (only if `structure_rev` not already on cash-flow params)
- Tests: `backend/tests/…`, `frontend/e2e/…`
