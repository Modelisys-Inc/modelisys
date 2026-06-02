# Auto-create & increment annex when checking "Annexe"

**Date:** 2026-05-30
**Status:** Approved (approach A)

## Problem

In the statement structure editor, checking the "Annexe" box (`showInDetail`)
on a row sets `showInDetail: true` but leaves the "Lettre" (`annexLetter`)
field blank. The user must manually type the next free identifier (A, B, C…)
and remember which are already taken. `save()` then rejects a checked-Annexe
row whose letter is blank.

## Goal

When the user checks "Annexe" on a row, automatically assign the next annex
identifier (always **next-after-highest**), so the annex is "created" without
manual bookkeeping:

- **Résultats (income statement):** letters — A, B, C… (after Z: AA, AB…).
- **Bilan (balance sheet):** numbers — 1, 2, 3…

The "Lettre" field stays manually editable, so users can still change the value
or type a shared identifier to merge several rows into the same annex.

## Definition: "next-after-highest"

Computed from the live structure for the row's statement scheme:

- **number scheme:** among existing `annexLetter` values that are pure integers
  (`^\d+$`), take the max and add 1; `"1"` if none.
- **letter scheme:** among existing values matching `^[A-Z]+$`, decode as
  bijective base-26 (A=1 … Z=26, AA=27 …), take the max, add 1, re-encode
  (A→B, Z→AA, AZ→BA); `"A"` if none.

Values that don't match the row's scheme are ignored when finding the max (e.g.
a stray letter in a balance-sheet row doesn't affect the numeric max).

## Approach A — logic in the structure-edit hook

The hook `useStatementStructureEdit(companyId, active, statementType)` already
knows `statementType` and holds the live `structure`, so the scheme decision and
the increment live in exactly one place.

### 1. New util — `frontend/lib/income-statement-structure-utils.ts`

```
export type AnnexScheme = "letter" | "number"
export function nextAnnexIdentifier(
  structure: Record<string, unknown>[],
  scheme: AnnexScheme
): string
```

Pure, side-effect-free; uses bijective base-26 encode/decode helpers for the
letter scheme.

### 2. Hook — `frontend/hooks/use-income-statement-structure-edit.ts`

Add `setShowInDetail(index, checked)`:

- Derive `scheme = statementType === "balance-sheet" ? "number" : "letter"`.
- Inside `setStructure(prev => …)` (so the max is computed from the freshest
  array, never stale):
  - `checked === true`: `showInDetail = true`; if `annexLetter` is blank, set it
    to `nextAnnexIdentifier(prev, scheme)`.
  - `checked === false`: `showInDetail = false`, `annexLetter = undefined`,
    `posteNature = undefined` (the Revenus/Dépenses choice is meaningless
    without an annex; this unifies behavior — IS Sommaire already cleared it).
- Expose it from the returned API and add it to the narrowed
  `StatementSummaryStructureEditApi` type in
  `statement-summary-structure-shared.tsx`.

### 3. Wire the three "Annexe" checkboxes to `setShowInDetail`

Replace the inline `updateRow(..., { showInDetail, annexLetter })` calls in:

- `income-statement-summary.tsx` (IS Sommaire, inline) — uses the full hook.
- `statement-summary-structure-shared.tsx` (`StatementSummaryStructureRowCells`,
  used by BS Sommaire) — via the API type.
- `income-statement-structure-studio-cols.tsx` (IS & BS Détail) — add a
  `setShowInDetail` prop, passed by its callers (`income-statement-detail.tsx`,
  `balance-sheet-detail.tsx`) as `structEdit.setShowInDetail`.

The "Lettre" `<Input>` onChange is unchanged (manual edits still allowed).

## Out of scope

- Newly-added rows (`newChargeRow` / `newBalanceSheetPostRow`) default
  `showInDetail: true` with a blank letter; they do not auto-assign because no
  checkbox toggle fires. Left as-is.
- No change to the letter ↔ number display formatting (`formatDetailLabelWithAnnex`
  already renders any identifier as "Annexe X — …"). The "Lettre" input keeps
  its current placeholder.

## Testing

Playwright e2e (backend mocked, structure-editor card rendered as in the
existing link-code spec):

- IS Sommaire: check "Annexe" on a row whose structure has annex "A" → the
  Lettre input shows "B" (next-after-highest); on a structure with no annexes →
  "A".
- BS Sommaire: same flow yields a number ("1" when none, max+1 otherwise).
