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
  - `view` ∈ {`current`, `comparison`, `ytd`, `ddm`, `12months`, `quarters`,
    `years`} (prop type line ~96).
  - **Per-period multi-column views:** `12months` (12 cols), `quarters` (5),
    `years` (6) render `row.trendValues.map(...)` (lines ~2337-2419). These are
    the "each month / period" views.
  - **Two-period views** (`comparison` non-entity, `ddm`, `ytd`) render
    `current` | `prior` | delta (lines ~2201-2304). `comparison` +
    `isComparisonMode` renders one column **per entity** (line ~2241).
    `current` is a single column (line ~2195).
  - `columnMode` ∈ {`variationAmount` (**default**, line ~198), `variationPercent`,
    `percentage`, `comparison`}. It only changes how a column is *displayed*;
    `trendValues` always holds the **raw balances**, and `percentage` / variation
    columns are derived from them. So the balance écart is computable from
    `trendValues` regardless of `columnMode`.
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
écart derived from the two total rows' aligned `trendValues` arrays:

```
ecartForColumn(i) = totalAssetsRow.trendValues[i] - liabilitiesEquityRow.trendValues[i]
```

Because `trendValues` holds raw balances irrespective of `columnMode`, this écart
is valid in every display mode. Tolerance stays $1 (`Math.abs(ecart) >= 1` is a
mismatch), matching today. If either total row is missing (custom structure), no
indicators render.

**Display.** A compact indicator aligned under each period column, rendered
directly beneath the "Total passifs et capitaux propres" row:

- Balanced column: small green ✓ (no amount).
- Unbalanced column: small amber/red ✗ with the écart amount.

This indicator row reuses the same per-column layout/width as the value columns
so each marker sits under its column.

**Where it renders (precise).** Only in the per-period multi-column views
`12months` / `quarters` / `years` — one marker under each period column, aligned
to the same `trendValues.map` columns. **Independent of `columnMode`** (the marker
reflects whether that period's bilan balances, which is true/false regardless of
whether the column displays the raw amount, a variation, or a percentage). The
leading label column gets an empty cell.

Decision recorded: I considered gating on a raw-amount `columnMode` (and a
`isRawAmountColumnMode` helper) but rejected it — gating would hide the balance
status in the default `variationAmount` mode, which is exactly when a 12-month
scan needs it, and it reintroduces the "is the default raw?" hazard. If we later
decide the marker should only appear in `comparison` (raw-amount) mode, add
`isRawAmountColumnMode(m) => m === "comparison"` and gate on it.

The two-period / single / entity views (`current`, `comparison`, `ddm`, `ytd`)
keep the **existing amber banner** (covers the single reference period); no
per-column markers there.

**Gating.** Only when `showBalanceWarning` is true (same prop that gates the
banner today), so pro-forma and other embeddings are unaffected.

## Change 2 — Auto annexe identifier is read-only

The identifier is now fully derived (Change 4), so it is never hand-editable.
`isAnnexLetterInputEditable()` returns `false` for **every** annexe-managed row,
including `detailOnly` sub-lines (today it returns `true` for `detailOnly` at
line ~599). The "Lettre" cell shows the identifier as static/disabled text.

All three consumers already gate the input via
`disabled={!isAnnexLetterInputEditable(structRow)}`:

- `income-statement-summary.tsx` (~2055-2069)
- `income-statement-structure-studio-cols.tsx` (~321-336)
- `statement-summary-structure-shared.tsx` (~363-377)

so flipping the helper makes all paths read-only. Each path must still render the
current identifier value (disabled input or static text), not an empty/blank cell.
The "activez Annexe pour saisir une lettre" tooltips are reworded to reflect that
the letter is assigned automatically.

## Change 3 — No annexe by default

`newChargeRow()` changes its defaults to `showInDetail: false` and
`annexLetter: ""`, matching `newBalanceSheetPostRow()`. A newly inserted
structure row is not an annexe and does not appear in the Détail until the user
explicitly ticks the "Annexe" checkbox. No identifier is auto-assigned at row
creation.

## Change 4 — Appearance-order numbering

**New normalization function** (in `income-statement-structure-utils.ts`):
`renumberAnnexesByAppearance(structure, scheme)` walks the structure array in
report order and assigns sequential identifiers to each distinct annexe block.

**Block detection — critical.** A block starts at a **summary row with
`showInDetail === true`** (`isShowInDetail` true, not `detailOnly`), *regardless
of its current `annexLetter`* — which may be blank on a freshly-toggled row. This
is the key correction: the renumberer must NOT key off a non-blank `annexLetter`,
or the first toggle (where `annexLetter === ""`) would never receive an id. The
block extends through the contiguous `detailOnly` sub-lines immediately following
that summary row; all rows in the block receive the same new identifier.

- First block → `A` (letter) / `1` (number); second → `B` / `2`; etc., using the
  existing bijective base-26 encoder for letters.
- Non-annexe rows (empty-label, hidden, `showInDetail !== true` and not a
  `detailOnly` continuation) are passed through unchanged and do not consume an id.
- **Legacy non-contiguous duplicates:** two non-contiguous summary rows that today
  share an identifier become **separate** annexes (each contiguous block gets its
  own new id). This is the single explicit rule — "block = contiguous run"
  governs; there is no "shared identifier preserved across gaps" case.

The function returns a new structure (no mutation), consistent with
`cloneStructure`.

**Where it runs.**

- **On checkbox toggle in `setShowInDetail()`** — replaces the current
  `nextAnnexIdentifier` max+1 call. On **enable**, set `showInDetail = true`
  (leave `annexLetter` blank) then renumber the whole structure by appearance.
  On **disable**, set `showInDetail = false`, clear `annexLetter` / `posteNature`,
  **remove the disabled row's contiguous `detailOnly` children** (they only exist
  to detail that annexe and would otherwise become orphans that still render/group),
  then renumber so remaining annexes have no gaps.
- **In `load()`** (edit-session boundary), after fetch: normalize the loaded
  structure so stale/out-of-order persisted ids are corrected in-memory and the
  read-only field shows the right value.
- **In `save()`**, on `toSave` **before** the validation loop.
- **At detail-render build** in `income-statement-detail.tsx` and
  `balance-sheet-detail.tsx`: apply the same normalization to the structure used
  to build annexe groups, so never-edited stale structures still display in
  appearance order (display-only; deterministic, so it equals the post-save value).

**Save validation.** The "showInDetail must have annexLetter" check
(`use-income-statement-structure-edit.ts` lines ~314-322) is **removed** — with
renumbering before validation, every annexe row already has an id, and the field
is no longer user-fillable, so the error is unreachable and misleading.

**Scope.** Applies to both Résultats (letters A, B, C…) and Bilan (numbers
1, 2, 3…), selected by the existing `scheme` derived from `statementType`.

## Error handling & edge cases

- Missing total rows (Change 1): render no indicators (no crash).
- Differing `trendValues` lengths between the two total rows: iterate the shorter
  length; columns beyond it get no indicator.
- Two-period / entity / single views (`current`, `comparison`, `ddm`, `ytd`,
  Change 1): no per-column markers; existing banner applies.
- Any `columnMode` in the trend views (Change 1): markers still render, computed
  from raw `trendValues` (display mode does not affect balance status).
- First toggle from blank (Change 4): row is `showInDetail: true`,
  `annexLetter: ""`; block detection keys on `showInDetail`, so it correctly
  receives `A` / `1`.
- Disable with sub-lines (Change 4): contiguous `detailOnly` children are removed;
  no orphan rows remain; remaining annexes are gap-free.
- Empty structure / no annexes (Change 4): normalization is a no-op.
- Stale persisted structures with out-of-order ids: normalized on load, before
  save-validation, and at detail render — so display and stored value converge.
- Legacy non-contiguous duplicate ids: split into separate annexes by contiguous
  block (see Change 4).

## Testing

- **Unit (lib):** `renumberAnnexesByAppearance` for letters and numbers —
  appearance order; **first block from a blank (`annexLetter: ""`,
  `showInDetail: true`) row gets `A` / `1`**; gap closing after disable;
  `detailOnly` sub-line inheritance; legacy non-contiguous duplicates split into
  separate annexes; no-op on empty. `newChargeRow` defaults `showInDetail: false`.
  `isAnnexLetterInputEditable` returns false for auto annexe rows **and**
  `detailOnly` rows.
- **Unit (hook):** disabling an annexe removes its contiguous `detailOnly`
  children and leaves no gaps; saving a structure with out-of-order ids normalizes
  before validation (no "renseignez la lettre" error).
- **Playwright e2e:**
  - Bilan Sommaire (12months view) shows per-column ✓ when every month balances
    and ✗ + écart on a deliberately unbalanced month; markers appear in the
    default `variationAmount` mode (not only the amounts mode).
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
