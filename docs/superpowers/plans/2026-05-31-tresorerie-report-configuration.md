# Trésorerie Report Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Trésorerie (cash-flow) Sommaire/Détail a report-structure editor with full functional parity to Bilan/Résultats, via a shared editor component, plus a standard default cash-flow structure and consistent default-fallback in the computation for all three statements.

**Architecture:** Backend already computes cash-flow from `CompanyStatementStructure` + link codes (same path as IS/BS). We (1) add a `DEFAULT_CASH_FLOW`, seed it for new companies, and make the computation fall back to defaults when no structure is stored; (2) extract the *edit experience* into a self-contained shared `StatementStructureStudio` component that composes the already-shared row/header pieces (`statement-summary-structure-shared.tsx`) + the generic `useStatementStructureEdit` hook, and adopt it in the cash-flow components. Résultats/Bilan read views are untouched; migrating their edit mode onto the studio is a separate follow-up plan (Phase 3).

**Tech Stack:** FastAPI / SQLAlchemy / pytest (backend); Next.js / React / TypeScript / Playwright (frontend).

**Spec:** `docs/superpowers/specs/2026-05-31-tresorerie-report-configuration-design.md`

---

## Phases

- **Phase 1 (Tasks 1–4):** Backend defaults + seeding + computation fallback. Independently shippable.
- **Phase 2 (Tasks 5–11):** Shared `StatementStructureStudio` + Trésorerie adoption + e2e. Delivers the user-facing feature.
- **Phase 3 (follow-up plan, not in this document):** Migrate Résultats & Bilan edit mode onto the shared studio and delete their bespoke inline-edit code (the DRY consolidation). Its exact shape depends on the studio produced in Phase 2, so it gets its own plan after Phase 2 lands.

---

## File Structure

**Backend**
- Create `backend/app/services/statement_structure_defaults.py` — single source of truth for `DEFAULT_INCOME_STATEMENT`, `DEFAULT_BALANCE_SHEET`, `DEFAULT_CASH_FLOW`, and `DEFAULT_STRUCTURES`.
- Modify `backend/app/routers/statement_structures.py` — import + re-export defaults from the new module; GET fallback uses `DEFAULT_STRUCTURES`.
- Modify `backend/app/routers/companies.py` — seed cash-flow on company creation.
- Modify `backend/app/services/financial_statements.py` — `compute_financial_statement` and `compute_financial_statement_series` fall back to `DEFAULT_STRUCTURES` when no structure row exists.
- Tests: `backend/tests/test_statement_structures.py`, `backend/tests/test_financial_statements.py`.

**Frontend**
- Modify `frontend/lib/api.ts` — add `"cash-flow"` to `StatementType`.
- Modify `frontend/hooks/use-income-statement-structure-edit.ts` — widen `StatementStructureEditKind`; export `useCashFlowStructureEdit`.
- Create `frontend/components/statement-structure-studio.tsx` — self-contained shared editor (toolbar + table) composing the existing shared pieces.
- Modify `frontend/components/cash-flow-summary.tsx` — add structure-settings props + render studio in edit mode.
- Modify `frontend/components/cash-flow-detail.tsx` — add structure-settings props + render studio in edit mode.
- Modify `frontend/app/financial-statements/cash-flow/page.tsx` — `structureVersion` state + wiring.
- Tests: `frontend/e2e/cash-flow-structure-edit.spec.ts` (new).

---

# PHASE 1 — Backend

### Task 1: Shared defaults module with `DEFAULT_CASH_FLOW`

**Files:**
- Create: `backend/app/services/statement_structure_defaults.py`
- Modify: `backend/app/routers/statement_structures.py` (defaults block at lines 41–73; GET fallback at lines 112–123)
- Test: `backend/tests/test_statement_structures.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_statement_structures.py`:

```python
def test_get_cash_flow_structure_returns_default_when_unset(client, auth_headers):
    """An unconfigured company returns the standard cash-flow default, not empty."""
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures/cash-flow",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["statement_type"] == "cash-flow"
    labels = [r["label"].lower() for r in data["structure"]]
    assert any("exploitation" in l for l in labels)
    assert any("investissement" in l for l in labels)
    assert any("financement" in l for l in labels)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_statement_structures.py::test_get_cash_flow_structure_returns_default_when_unset -v`
Expected: FAIL — `structure` is `[]` (cash-flow not in the GET fallback map), so the `any(...)` asserts fail.

- [ ] **Step 3: Create the shared defaults module**

Create `backend/app/services/statement_structure_defaults.py`:

```python
"""Single source of truth for default financial-statement structures.

Used both to seed new companies (routers/companies.py) and as the runtime
fallback when a company has no saved structure (routers/statement_structures.py
GET, services/financial_statements.py compute).
"""

DEFAULT_BALANCE_SHEET = [
    {"label": "actifs", "isBold": True, "isSection": True},
    {"label": "actifs courants", "isSection": True, "indent": True},
    {"label": "actifs non courants", "isSection": True, "indent": True},
    {"label": "total des actifs", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "passifs", "isBold": True, "isSection": True},
    {"label": "passifs courants", "indent": True},
    {"label": "passifs non courants", "indent": True},
    {"label": "total des passifs", "isBold": True},
    {"label": ""},
    {"label": "capitaux propres", "isBold": True, "isResult": True},
    {"label": "total passifs et capitaux propres", "isBold": True, "isResult": True},
]

DEFAULT_INCOME_STATEMENT = [
    {"label": "revenus", "isBold": True, "isSection": True},
    {"label": "coût des produits vendus", "isSection": True, "indent": True},
    {"label": "bénéfice brut", "isBold": True, "isResult": True},
    {"label": ""},
    {"label": "charges d'exploitation", "isBold": True, "isSection": True},
    {"label": "frais d'administration", "indent": True},
    {"label": "frais de vente", "indent": True},
    {"label": "frais financiers", "indent": True},
    {"label": "autres dépenses (revenus)", "indent": True},
    {"label": "total des charges", "isBold": True},
    {"label": ""},
    {"label": "bénéfice avant impôts", "isBold": True, "isResult": True},
    {"label": "impôts (26%)", "indent": True},
    {"label": "bénéfice net", "isBold": True, "isNetIncome": True},
    {"label": ""},
    {"label": "BAIIA", "isBold": True, "isEBITA": True},
]

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

- [ ] **Step 4: Point the router at the shared module**

In `backend/app/routers/statement_structures.py`:
1. Delete the local `DEFAULT_BALANCE_SHEET = [...]` (lines 41–54) and `DEFAULT_INCOME_STATEMENT = [...]` (lines 56–73) definitions.
2. Add near the top imports:

```python
from app.services.statement_structure_defaults import (
    DEFAULT_BALANCE_SHEET,
    DEFAULT_INCOME_STATEMENT,
    DEFAULT_STRUCTURES,
)
```

(Keep the names importable from this module — `companies.py` currently does `from app.routers.statement_structures import DEFAULT_BALANCE_SHEET, DEFAULT_INCOME_STATEMENT`; re-importing them here preserves that.)

3. Replace the GET fallback (currently lines 112–123):

```python
    if not structure:
        # Return the standard default structure instead of 404 / empty.
        return StatementStructureResponse(
            id=None,
            company_id=company_id,
            statement_type=statement_type,
            structure=DEFAULT_STRUCTURES.get(statement_type, []),
        )
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_statement_structures.py::test_get_cash_flow_structure_returns_default_when_unset -v`
Expected: PASS

- [ ] **Step 6: Run the full structures test file (no regressions)**

Run: `cd backend && python -m pytest tests/test_statement_structures.py -v`
Expected: PASS (all existing tests still green)

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/statement_structure_defaults.py backend/app/routers/statement_structures.py backend/tests/test_statement_structures.py
git commit -m "feat(backend): shared statement-structure defaults + DEFAULT_CASH_FLOW"
```

---

### Task 2: Seed cash-flow structure for new companies

**Files:**
- Modify: `backend/app/routers/companies.py:14` (import) and `:113-122` (seed loop)
- Test: `backend/tests/test_statement_structures.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_statement_structures.py`:

```python
def test_new_company_seeds_cash_flow_structure(client, auth_headers):
    company_id = _create_company(client, auth_headers)
    response = client.get(
        f"/api/companies/{company_id}/statement-structures", headers=auth_headers
    )
    assert response.status_code == 200
    types = {s["statement_type"] for s in response.json()["structures"]}
    assert "cash-flow" in types
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_statement_structures.py::test_new_company_seeds_cash_flow_structure -v`
Expected: FAIL — only `income-statement` and `balance-sheet` are seeded.

- [ ] **Step 3: Add cash-flow to the seed loop**

In `backend/app/routers/companies.py`:
1. Update the import at line 14:

```python
from app.routers.statement_structures import (
    DEFAULT_BALANCE_SHEET,
    DEFAULT_INCOME_STATEMENT,
)
from app.services.statement_structure_defaults import DEFAULT_CASH_FLOW
```

2. Update the seed list (lines 114–116):

```python
    for stmt_type, structure in [
        ("income-statement", DEFAULT_INCOME_STATEMENT),
        ("balance-sheet", DEFAULT_BALANCE_SHEET),
        ("cash-flow", DEFAULT_CASH_FLOW),
    ]:
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/test_statement_structures.py::test_new_company_seeds_cash_flow_structure -v`
Expected: PASS

- [ ] **Step 5: Update the count assertions in the existing list tests**

Two existing tests assert exact structure counts that now change from 2 → 3:
- `test_list_both_structures` (line 141): change `assert len(structures) == 2` → `assert len(structures) == 3`, and `assert types == {"income-statement", "balance-sheet"}` → `assert types == {"income-statement", "balance-sheet", "cash-flow"}`.

Run: `cd backend && python -m pytest tests/test_statement_structures.py -v`
Expected: PASS (all green, including the updated assertions)

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/companies.py backend/tests/test_statement_structures.py
git commit -m "feat(backend): seed cash-flow structure for new companies"
```

---

### Task 3: Computation falls back to default structure (all three statements)

**Files:**
- Modify: `backend/app/services/financial_statements.py` — `compute_financial_statement` (no-structure early return at lines 1629–1637) and `compute_financial_statement_series` (structure load at ~2272)
- Test: `backend/tests/test_financial_statements.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/test_financial_statements.py` (uses the existing `client`/`auth_headers` fixtures; a freshly-created company is seeded with structures, so to exercise the *fallback* we delete the cash-flow structure row first via the API-less path is awkward — instead assert the computed statement is non-empty for a seeded company, which also guards the seed+compute path):

```python
def _create_company(client, auth_headers, name="CF Co"):
    r = client.post("/api/companies", json={"name": name}, headers=auth_headers)
    assert r.status_code == 201
    return r.json()["id"]


def test_cash_flow_returns_default_rows_for_new_company(client, auth_headers):
    """A new company (seeded cash-flow default) computes non-empty cash-flow rows."""
    company_id = _create_company(client, auth_headers)
    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 12},
        headers=auth_headers,
    )
    assert r.status_code == 200
    rows = r.json()["rows"]
    assert len(rows) > 0
    labels = [row["label"].lower() for row in rows]
    assert any("exploitation" in l for l in labels)
```

> NOTE: confirm the cash-flow route prefix matches the router mount. The router declares `@router.get("/cash-flow", ...)`; verify the full path with `grep -n "include_router" backend/app/main.py` and adjust the test URL to the actual prefix (e.g. `/api/companies/{id}/financial-statements/cash-flow`).

- [ ] **Step 2: Run test to verify it passes or fails**

Run: `cd backend && python -m pytest tests/test_financial_statements.py::test_cash_flow_returns_default_rows_for_new_company -v`
Expected: With Task 2 done, a new company is seeded, so this likely PASSES already. That is fine — it guards the seed→compute path. Proceed to add the explicit fallback test below for companies with NO row.

- [ ] **Step 3: Write the fallback-specific failing test**

Add a test that removes the seeded row to force the fallback branch (use a direct DB session via the `db_session`/`TestingSessionLocal` fixture used elsewhere in this file — match the existing fixture name in `conftest.py`):

```python
def test_compute_falls_back_to_default_when_structure_missing(client, auth_headers):
    """Even with the structure row deleted, compute returns the default rows."""
    from app.models.financial_statement_mapping import CompanyStatementStructure
    from app.database import SessionLocal  # adjust to the project's session factory

    company_id = _create_company(client, auth_headers, name="No-CF Co")

    # Delete the seeded cash-flow structure row to exercise the fallback.
    db = SessionLocal()
    try:
        db.query(CompanyStatementStructure).filter(
            CompanyStatementStructure.company_id == company_id,
            CompanyStatementStructure.statement_type == "cash-flow",
        ).delete()
        db.commit()
    finally:
        db.close()

    r = client.get(
        f"/api/companies/{company_id}/financial-statements/cash-flow",
        params={"fiscal_year": 2026, "month": 12},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert len(r.json()["rows"]) > 0
```

> NOTE: the SQLite test DB and the request `client` must share the same session/engine. Inspect `backend/tests/conftest.py` for the correct session factory and dependency override, and use it here (the project already shares one engine across the test client). If a direct session isn't available, instead delete via a future admin endpoint is out of scope — use the conftest session.

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_financial_statements.py::test_compute_falls_back_to_default_when_structure_missing -v`
Expected: FAIL — `rows == []` because `compute_financial_statement` returns empty when no structure row exists.

- [ ] **Step 5: Implement the fallback in `compute_financial_statement`**

In `backend/app/services/financial_statements.py`, add the import at the top with the other `app.` imports:

```python
from app.services.statement_structure_defaults import DEFAULT_STRUCTURES
```

Replace the no-structure early return (lines 1629–1637):

```python
    if not structure:
        structure_rows = DEFAULT_STRUCTURES.get(statement_type, [])
    else:
        structure_rows = list(structure.structure or [])
    if not structure_rows:
        return {
            "companyId": str(company.id),
            "statementType": statement_type,
            "fiscalYear": fiscal_year,
            "month": month,
            "period": period,
            "rows": [],
        }
```

Then, find every downstream reference to `structure.structure` within `compute_financial_statement` and replace it with the local `structure_rows`. (Search the function body: `grep -n "structure.structure" backend/app/services/financial_statements.py` and update the occurrences that belong to this function; leave `compute_financial_statement_series` for Step 7.)

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_financial_statements.py::test_compute_falls_back_to_default_when_structure_missing -v`
Expected: PASS

- [ ] **Step 7: Mirror the fallback in `compute_financial_statement_series`**

At the structure load in `compute_financial_statement_series` (~line 2272), apply the same pattern:

```python
    structure_rows = list(structure.structure or []) if structure else DEFAULT_STRUCTURES.get(statement_type, [])
    if not structure_rows:
        # ...existing empty-series return shape...
```

Replace the function's downstream `structure.structure` references with `structure_rows`.

- [ ] **Step 8: Run the full financial-statements test file**

Run: `cd backend && python -m pytest tests/test_financial_statements.py -v`
Expected: PASS (no regressions; existing IS/BS tests still green — they seed structures, so behavior is unchanged).

- [ ] **Step 9: Run the whole backend suite**

Run: `cd backend && python -m pytest -q`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add backend/app/services/financial_statements.py backend/tests/test_financial_statements.py
git commit -m "feat(backend): compute falls back to default structure for IS/BS/cash-flow"
```

---

### Task 4: Add `"cash-flow"` to the frontend `StatementType`

**Files:**
- Modify: `frontend/lib/api.ts:555`

- [ ] **Step 1: Make the change**

In `frontend/lib/api.ts`, line 555:

```typescript
export type StatementType = "income-statement" | "balance-sheet" | "cash-flow" | "capex" | "baiia";
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "lib/api.ts|use-income-statement-structure-edit"`
Expected: no new errors referencing these files. (Pre-existing project-wide errors unrelated to this change may appear; ignore those.)

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(frontend): allow cash-flow in StatementType"
```

---

# PHASE 2 — Frontend: shared studio + Trésorerie adoption

### Task 5: Extend the structure-edit hook for cash-flow

**Files:**
- Modify: `frontend/hooks/use-income-statement-structure-edit.ts:28` and `:359-373`

- [ ] **Step 1: Widen the kind union**

Line 28:

```typescript
export type StatementStructureEditKind = Extract<
  StatementType,
  "income-statement" | "balance-sheet" | "cash-flow"
>
```

- [ ] **Step 2: Export a cash-flow wrapper hook**

After `useBalanceSheetStructureEdit` (line 373), add:

```typescript
export function useCashFlowStructureEdit(
  companyId: string | null | undefined,
  active: boolean
) {
  return useStatementStructureEdit(companyId, active, "cash-flow")
}
```

(No other change needed: `setShowInDetail`'s `scheme` falls into the `"letter"` branch for cash-flow, and `newPostRow` falls into the `newBalanceSheetPostRow` branch — both acceptable per the spec.)

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "use-income-statement-structure-edit"`
Expected: no errors referencing this file.

- [ ] **Step 4: Commit**

```bash
git add frontend/hooks/use-income-statement-structure-edit.ts
git commit -m "feat(frontend): useCashFlowStructureEdit hook"
```

---

### Task 6: Create the shared `StatementStructureStudio` component

**Files:**
- Create: `frontend/components/statement-structure-studio.tsx`

This composes the EXISTING shared pieces (`StatementSummaryStructureColgroup`, `StatementSummaryStructureThead`, `StatementSummaryStructureRowCells` from `statement-summary-structure-shared.tsx`) and the generic hook into a self-contained editor: a toolbar (Ajouter un poste / Ajouter un espace / Annuler / Enregistrer) and a structure table with the Libellé input column. The parent renders it only while in edit mode.

- [ ] **Step 1: Write the component**

Create `frontend/components/statement-structure-studio.tsx`:

```tsx
"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Loader2, PanelTop, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useCashFlowStructureEdit,
  type StatementStructureEditKind,
} from "@/hooks/use-income-statement-structure-edit"
import {
  StatementSummaryStructureColgroup,
  StatementSummaryStructureThead,
  StatementSummaryStructureRowCells,
} from "@/components/statement-summary-structure-shared"
import {
  collectDistinctLinkCodesFromStructure,
  isStructureRowEmptyLabel,
  mapLinkCodesToOwnerLabel,
} from "@/lib/income-statement-structure-utils"

interface StatementStructureStudioProps {
  companyId: string
  statementType: StatementStructureEditKind
  /** Called after a successful save (parent bumps its structureVersion). */
  onSaved?: () => void
  /** Called to leave edit mode (Annuler, or after a successful save). */
  onClose: () => void
}

export function StatementStructureStudio({
  companyId,
  statementType,
  onSaved,
  onClose,
}: StatementStructureStudioProps) {
  // active=true: this component only mounts while editing.
  const structEdit = useCashFlowStructureEdit(companyId, true)

  const displayIndices = structEdit.summaryStructureDisplayIndices
  const allLiaisonCodes = useMemo(
    () => collectDistinctLinkCodesFromStructure(structEdit.structure),
    [structEdit.structure]
  )
  const linkCodeLabels = useMemo(
    () => mapLinkCodesToOwnerLabel(structEdit.structure),
    [structEdit.structure]
  )

  const lastGlobalIdx =
    displayIndices.length > 0 ? displayIndices[displayIndices.length - 1]! : -1

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50/80 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
          disabled={structEdit.loading}
          onClick={() => structEdit.insertEmptySpacerBelow(Math.max(lastGlobalIdx, 0))}
        >
          <PanelTop className="h-4 w-4 text-[#E0742D]" />
          Ajouter un espace
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
          disabled={structEdit.loading}
          onClick={() => structEdit.insertPostBelow(Math.max(lastGlobalIdx, 0), { indent: true })}
        >
          <Plus className="h-4 w-4 text-[#E0742D]" />
          Ajouter un poste
        </Button>
        <Separator orientation="vertical" className="hidden h-7 sm:block" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-xl text-[#5C5F66] hover:bg-slate-100"
          disabled={structEdit.saving}
          onClick={() => {
            structEdit.discard()
            void structEdit.reload()
            onClose()
          }}
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-xl bg-[#E0742D] px-4 font-semibold text-white shadow-sm hover:bg-[#c96526] disabled:opacity-60"
          disabled={structEdit.saving || structEdit.loading || !companyId}
          onClick={async () => {
            const ok = await structEdit.save()
            if (ok) {
              onSaved?.()
              structEdit.discard()
              void structEdit.reload()
              onClose()
            }
          }}
        >
          {structEdit.saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </div>

      {structEdit.loading && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-center text-sm text-slate-600">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#E0742D]" />
          Chargement de la structure…
        </div>
      )}
      {structEdit.error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-center text-sm text-red-700">
          {structEdit.error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <StatementSummaryStructureColgroup />
          <thead className="bg-slate-50/70">
            <tr>
              <StatementSummaryStructureThead posteHeader="Poste" />
            </tr>
          </thead>
          <tbody>
            {displayIndices.map((globalIdx, idx) => {
              const structRow = structEdit.structure[globalIdx]!
              const isEmpty = isStructureRowEmptyLabel(structRow)
              const isBoldRow = structRow.isBold === true
              return (
                <tr
                  key={globalIdx}
                  className={cn(
                    "border-b border-b-slate-200 hover:bg-slate-100/70",
                    idx % 2 === 1 && "bg-slate-50/50"
                  )}
                >
                  <td className="min-w-0 px-3 py-3 pl-4">
                    {isEmpty ? (
                      <span className="inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-400">
                        Ligne vide — renommez ou supprimez
                      </span>
                    ) : (
                      <Input
                        value={String(structRow.label ?? "")}
                        onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                        className={cn(
                          "h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20",
                          isBoldRow ? "font-semibold" : "font-normal"
                        )}
                      />
                    )}
                  </td>
                  <StatementSummaryStructureRowCells
                    structRow={structRow}
                    globalIdx={globalIdx}
                    structEdit={structEdit}
                    allLiaisonCodes={allLiaisonCodes}
                    linkCodeLabels={linkCodeLabels}
                    showSeparatorAbove={structRow.separatorAbove === true}
                  />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

> NOTE: `StatementSummaryStructureRowCells` expects a `structEdit` matching `StatementSummaryStructureEditApi` (`updateRow`, `setShowInDetail`, `canRemoveRowAt`, `removeStructureRowAt`) — the hook return value satisfies this. `onEditPresentation` is optional and omitted here (presentation/bold editing is available via "Ajouter un poste" options and is a Phase 3 nicety).

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "statement-structure-studio"`
Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/statement-structure-studio.tsx
git commit -m "feat(frontend): shared StatementStructureStudio editor component"
```

---

### Task 7: Wire the studio into `CashFlowSummary`

**Files:**
- Modify: `frontend/components/cash-flow-summary.tsx` (props interface lines 19–34; component signature lines 48–63; render `return (...)`)

- [ ] **Step 1: Add props + edit-mode state + studio render**

1. Add imports near the top:

```tsx
import { useState } from "react"  // ensure useState is imported (already imported alongside useEffect)
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
```

2. Extend `CashFlowSummaryProps` (after line 33 `loading?: boolean`):

```tsx
  showCashFlowStructureSettings?: boolean
  structureVersion?: number
  onCashFlowStructureSaved?: () => void
```

3. Add to the destructured props (after `loading = false,`):

```tsx
  showCashFlowStructureSettings = false,
  structureVersion = 0,
  onCashFlowStructureSaved,
```

4. Add edit-mode state at the top of the component body:

```tsx
  const [structureEditMode, setStructureEditMode] = useState(false)
  const canInlineStructureEdit =
    showCashFlowStructureSettings && !!companyId && view !== "comparison"
```

5. In the component's JSX, render the studio when editing and a "Paramètres" trigger when not. Locate the top of the rendered card (the outermost wrapper of the normal summary). Insert, just inside that wrapper, before the normal table:

```tsx
      {canInlineStructureEdit && !structureEditMode && (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setStructureEditMode(true)}
          >
            <Settings className="h-4 w-4 text-[#E0742D]" />
            Paramètres
          </Button>
        </div>
      )}
      {canInlineStructureEdit && structureEditMode && companyId ? (
        <StatementStructureStudio
          companyId={companyId}
          statementType="cash-flow"
          onSaved={onCashFlowStructureSaved}
          onClose={() => setStructureEditMode(false)}
        />
      ) : (
        <>
          {/* existing normal summary render goes here (table etc.) */}
        </>
      )}
```

> NOTE: wrap the component's existing normal render (the table block) in the `: ( <> … </> )` branch so the studio fully replaces it in edit mode. Keep the existing data-fetching hooks above this conditional untouched. `structureVersion` is consumed by the parent page's refetch; the summary itself doesn't need to read it, but accept the prop so the page can pass it without a type error.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "cash-flow-summary"`
Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/cash-flow-summary.tsx
git commit -m "feat(frontend): structure editor in CashFlowSummary"
```

---

### Task 8: Wire the studio into `CashFlowDetail`

**Files:**
- Modify: `frontend/components/cash-flow-detail.tsx`

- [ ] **Step 1: Apply the same wiring as Task 7**

Mirror Task 7 in `cash-flow-detail.tsx`: add `showCashFlowStructureSettings`, `structureVersion`, `onCashFlowStructureSaved` to its props interface and destructuring; add `structureEditMode` state and `canInlineStructureEdit`; render the "Paramètres" trigger + `<StatementStructureStudio companyId statementType="cash-flow" onSaved={onCashFlowStructureSaved} onClose={() => setStructureEditMode(false)} />` in edit mode, wrapping the existing detail render in the non-edit branch.

> NOTE: read `cash-flow-detail.tsx` first to find its props interface and outermost render wrapper; the structure of the change is identical to the summary. Use the same `Button`/`Settings`/`StatementStructureStudio` imports.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "cash-flow-detail"`
Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/cash-flow-detail.tsx
git commit -m "feat(frontend): structure editor in CashFlowDetail"
```

---

### Task 9: Wire the cash-flow page

**Files:**
- Modify: `frontend/app/financial-statements/cash-flow/page.tsx`

- [ ] **Step 1: Add structureVersion state and pass it through**

1. Add state near the other `useState` calls:

```tsx
  const [structureVersion, setStructureVersion] = useState(0)
```

2. In the `getCashFlow` params object inside the fetch effect, add:

```tsx
          structure_rev: structureVersion,
```

and add `structureVersion` to that effect's dependency array.

3. On both `<CashFlowSummary … />` and `<CashFlowDetail … />`, add:

```tsx
              showCashFlowStructureSettings
              structureVersion={structureVersion}
              onCashFlowStructureSaved={() => setStructureVersion((v) => v + 1)}
```

4. (Consistency with Bilan) On the Tableau-de-bord `<StatementChart … />`, add `structureVersion={structureVersion}` if `StatementChart` accepts it. Verify the prop exists: `rg "structureVersion" frontend/components/statement-chart.tsx`. If it does not accept the prop, skip this sub-step.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "cash-flow/page"`
Expected: no errors referencing this file.

- [ ] **Step 3: Build sanity (optional, faster than full e2e)**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "cash-flow|statement-structure-studio"`
Expected: no errors referencing the touched files.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/financial-statements/cash-flow/page.tsx
git commit -m "feat(frontend): wire cash-flow page to structure editor"
```

---

### Task 10: Playwright e2e for the Trésorerie editor

**Files:**
- Create: `frontend/e2e/cash-flow-structure-edit.spec.ts`

Model the auth/route mocking on `frontend/e2e/dashboard-cash-flow.spec.ts` (`setupAuth`) and the structure-edit interaction on `frontend/e2e/annex-auto-increment.spec.ts` (which mocks `**/api/companies/*/statement-structures/*`, clicks `Sommaire` then `Paramètres`).

- [ ] **Step 1: Write the e2e spec**

```ts
import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

const CASH_FLOW_DEFAULT = [
  { label: "flux de trésorerie liés à l'exploitation", isBold: true, isSection: true },
  { label: "flux de trésorerie liés aux activités d'investissement", isBold: true, isSection: true },
  { label: "flux de trésorerie liés aux activités de financement", isBold: true, isSection: true },
  { label: "variation nette de la trésorerie", isBold: true, isResult: true },
]

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]) }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }) })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ budgets: [] }) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rows: [] }) }),
  )
}

test.describe("Trésorerie structure editor", () => {
  test("Sommaire exposes Paramètres, opens the studio, and saves", async ({ page }) => {
    await setupAuth(page)

    let putCalled = false
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow*`, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: null, company_id: COMPANY_ID, statement_type: "cash-flow", structure: CASH_FLOW_DEFAULT }) })
      }
      if (method === "PUT") {
        putCalled = true
        return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    // Go to Sommaire and open the editor.
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    // The studio shows the default rows as editable inputs.
    await expect(page.getByDisplayValue(/exploitation/i).first()).toBeVisible({ timeout: 10000 })

    // Save.
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect.poll(() => putCalled, { timeout: 10000 }).toBe(true)

    // Editor closes (Paramètres trigger returns).
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 2: Run the spec (local Playwright binary)**

Run: `cd frontend && pnpm exec playwright test e2e/cash-flow-structure-edit.spec.ts --reporter=list`
Expected: PASS. (Use `pnpm exec playwright`, not `npx playwright` — `npx` may resolve a mismatched global Playwright in this repo.)

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/cash-flow-structure-edit.spec.ts
git commit -m "test(e2e): Trésorerie structure editor"
```

---

### Task 11: Full verification

- [ ] **Step 1: Backend suite**

Run: `cd backend && python -m pytest -q`
Expected: PASS

- [ ] **Step 2: Frontend typecheck (no new errors in touched files)**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | rg "cash-flow|statement-structure-studio|use-income-statement-structure-edit|lib/api.ts"`
Expected: no errors referencing the touched files.

- [ ] **Step 3: Relevant e2e**

Run: `cd frontend && pnpm exec playwright test e2e/cash-flow-structure-edit.spec.ts e2e/dashboard-cash-flow.spec.ts --reporter=list`
Expected: PASS

- [ ] **Step 4: Manual smoke (optional)**

Use the `run` skill / `pnpm dev` to open `/financial-statements/cash-flow`, go to Sommaire → Paramètres, edit a row label, map a liaison code, Enregistrer; confirm the table refetches.

---

## Self-Review notes

- **Spec coverage:** §1a DEFAULT_CASH_FLOW → Task 1; §1b router fallback → Task 1; §1c compute fallback (all three) → Task 3; new-company seeding (implied by existing seed pattern) → Task 2; §2a hook → Task 5; §2b editor parity → Tasks 6–8; §2c page wiring → Task 9; §4 tests → Tasks 1–3, 10–11. `StatementType` gap (cash-flow missing) → Task 4.
- **Approach note:** the spec said "port the inline edit UI"; after discovering the row/header cells are already shared (`statement-summary-structure-shared.tsx`) and the user chose Approach B, this plan builds a shared `StatementStructureStudio` composing those pieces and adopts it in Trésorerie. Migrating Résultats/Bilan onto the same studio (full DRY) is Phase 3 — a separate plan to write after Phase 2, since its scope (replacing their dialog-based flows) depends on the studio delivered here.
- **Type consistency:** `StatementStructureStudio` props (`companyId`, `statementType`, `onSaved`, `onClose`) used identically in Tasks 7 & 8; `StatementSummaryStructureEditApi` satisfied by the hook return; `structure_rev` already exists on `FinancialStatementParams`.
- **Known follow-ups flagged in steps:** confirm cash-flow route prefix (Task 3 Step 1), confirm conftest session factory for the delete-row test (Task 3 Step 3), confirm `StatementChart` accepts `structureVersion` (Task 9 Step 1 sub-4).
