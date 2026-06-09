# Bilan per-month balance & annexes behavior — design

Date: 2026-06-09
Status: Approved (pending spec review)

## Context

Four product changes to the financial-statements UI, spanning the balance-sheet
summary ("bilan" Sommaire) and the annexes system shared by the income
statement (Résultats) and the balance sheet (Bilan).

1. The bilan Sommaire must show whether **each month/period column** balances,
   not just the single reference period.
2. For **automatic annexes**, the annexe identifier (letter/number) must not be
   hand-editable.
3. There must be **no annexe by default** — newly added structure rows are not
   annexes until explicitly toggled.
4. Annexe numbering must follow the **order annexes appear in the built report**,
   not the order their checkboxes were ticked.

Tasks 2 and 4 are the same underlying change: once the identifier is derived from
report appearance order, the "Lettre" field becomes a computed, read-only value.

## Relevant code

- `frontend/components/balance-sheet-summary.tsx`
  - Current single-period balance check: lines ~650-665 (`balanceEcart`,
    `showBalanceMismatch`).
  - Amber banner: lines ~1693-1706.
  - Per-column values live in each `SummaryRow.trendValues` (aligned arrays);
    multi-column views are `12months`, `quarters`, `years`, and monthly
    comparison. `current` / `prior` are the two-column default view.
- `frontend/lib/income-statement-structure-utils.ts`
  - `nextAnnexIdentifier()` (lines ~74-90): current check-order, max+1 assignment.
  - `newChargeRow()` (lines ~114-131): defaults `showInDetail: true`.
  - `newBalanceSheetPostRow()` (lines ~133-151): already `showInDetail: false`.
  - `isAnnexLetterInputEditable()` (lines ~593-601): gates the "Lettre" input.
  - `normalizeAnnexLetter`, `compareAnnexLetters`, bijective base-26 helpers.
- `frontend/hooks/use-income-statement-structure-edit.ts`
  - `setShowInDetail()` (lines ~86-112): assigns identifier on checkbox toggle.
- `frontend/components/balance-sheet-detail.tsx`,
  `frontend/components/income-statement-detail.tsx`: render annexes grouped by
  `annexLetter` (grouping key == display identifier).

## Change 1 — Per-column balance check (bilan Sommaire)

**Goal.** Show, per displayed period column, whether the bilan balances
(Total des actifs == Total passifs et capitaux propres).

**Computation.** Generalize the existing scalar `balanceEcart` into a per-column
écart derived from the two total rows' aligned `trendValues` arrays (and
`current` / `prior` for the two-column view):

```
ecartForColumn(i) = totalAssetsRow.trendValues[i] - liabilitiesEquityRow.trendValues[i]
```

Tolerance stays $1 (`Math.abs(ecart) >= 1` is a mismatch), matching today. If
either total row is missing (custom structure), no indicators render.

**Display.** A compact indicator aligned under each period column, rendered
directly beneath the "Total passifs et capitaux propres" row:

- Balanced column: small green ✓ (no amount).
- Unbalanced column: small amber/red ✗ with the écart amount.

This indicator row reuses the same per-column layout/width as the value columns
so each marker sits under its column. It appears in the multi-column views
(`12months`, `quarters`, `years`, monthly comparison). The existing amber banner
is retained for the single-/two-column views (`current`).

**Gating.** Only when `showBalanceWarning` is true (same prop that gates the
banner today), so pro-forma and other embeddings are unaffected.

## Change 2 — Auto annexe identifier is read-only

`isAnnexLetterInputEditable()` returns `false` for auto-managed annexe rows
(summary rows whose identifier is system-assigned). The "Lettre" cell renders the
identifier as static text instead of an editable input. The value is supplied by
the appearance-order normalization (Change 4), not by hand entry.

Detail-only sub-lines (`detailOnly`) inherit their parent's identifier and never
expose an editable identifier field either.

## Change 3 — No annexe by default

`newChargeRow()` changes its defaults to `showInDetail: false` and
`annexLetter: ""`, matching `newBalanceSheetPostRow()`. A newly inserted
structure row is not an annexe and does not appear in the Détail until the user
explicitly ticks the "Annexe" checkbox. No identifier is auto-assigned at row
creation.

## Change 4 — Appearance-order numbering

**New normalization function** (in `income-statement-structure-utils.ts`):
`renumberAnnexesByAppearance(structure, scheme)` walks the structure array in
report order and assigns sequential identifiers to each distinct annexe block:

- First annexe block encountered → `A` (letter) / `1` (number); second → `B` /
  `2`; and so on, using the existing bijective base-26 encoder for letters.
- A block is the contiguous run of rows sharing one annexe (summary title row
  plus its `detailOnly` sub-lines, which are already contiguous). All rows in the
  block receive the same new identifier.
- Rows that are not annexes (no `showInDetail` / blank identifier) are skipped.

The function returns a new structure (no mutation), consistent with
`cloneStructure` usage elsewhere.

**Where it runs.**

- On checkbox toggle in `setShowInDetail()`: after enabling/disabling an annexe,
  renumber the whole structure by appearance order (replacing the current
  `nextAnnexIdentifier` max+1 call). Disabling an annexe therefore also
  renumbers the remaining annexes so there are no gaps.
- When the structure is built/normalized for save, so persisted data is already
  in appearance order.

**Scope.** Applies to both Résultats (letters A, B, C…) and Bilan (numbers
1, 2, 3…), selected by the existing `scheme` derived from `statementType`.

## Error handling & edge cases

- Missing total rows (Change 1): render no indicators (no crash).
- Differing `trendValues` lengths between the two total rows: iterate the shorter
  length; columns beyond it get no indicator.
- Empty structure / no annexes (Change 4): normalization is a no-op.
- Existing persisted structures with hand-assigned or out-of-order identifiers:
  on next toggle/save they are normalized to appearance order. (One-time visible
  renumber on first edit; acceptable.)
- Shared annexes (same identifier on non-contiguous summary rows, legacy):
  normalization assigns by first appearance; downstream grouping already keys on
  the (now normalized) identifier.

## Testing

- **Unit (lib):** `renumberAnnexesByAppearance` for letters and numbers —
  appearance order, gap closing after disable, sub-line inheritance, no-op on
  empty. `newChargeRow` defaults. `isAnnexLetterInputEditable` returns false for
  auto annexe rows.
- **Playwright e2e:**
  - Bilan Sommaire shows per-column ✓ when every month balances and ✗ + écart on
    a deliberately unbalanced column.
  - Adding a new structure row does not create an annexe by default.
  - Ticking annexe checkboxes out of order yields identifiers in report
    appearance order; the "Lettre" field is read-only.
  - Update/extend `frontend/e2e/annex-auto-increment.spec.ts` for the
    appearance-order behavior.

## Out of scope

- Backend annexe numbering changes (numbering is frontend-derived;
  `annexLetter` round-trips through the API unchanged).
- Reworking the Détail grouping/subtotal logic beyond consuming the normalized
  identifiers.
