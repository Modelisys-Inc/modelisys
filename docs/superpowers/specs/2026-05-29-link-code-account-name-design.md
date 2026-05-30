# Show FS row label next to every Code de liaison combobox

**Date:** 2026-05-29
**Status:** Approved (approach A)

## Problem

When a user picks or reviews a "Code de liaison" (link code) in a combobox, only
the bare code is shown (e.g. `4100`). The user cannot tell which financial-statement
line a code maps to, so it's unclear "what we are mapping to what". The QuickBooks
review picker already shows `code — label`; the rest do not.

## Goal

Every link-code **combobox/picker** also shows the **FS structure-row label** for each
code — both in the selected/trigger display and in the option list. Read-only hint
cells (not comboboxes) are out of scope.

## Definition of "FS row label" for a code

The label of the structure row that defines the code as its single `linkCode`
(`liaisonMode === "single"`). Example: the row labeled "Ventes nettes" with
`linkCode = "4100"` makes `4100 → "Ventes nettes"`. Codes that appear only inside
sum/difference/ratio lists but are never a row's single `linkCode` have no owner
label and display the bare code unchanged.

## Pickers in scope

| Picker | File | Action |
|---|---|---|
| QBO review picker | `frontend/components/quickbooks-review-table.tsx` | already done — no change |
| Liaison cell: `LinkCodeCombobox` + sum/difference checkbox lists | `frontend/components/income-statement-liaison-cell.tsx` | add labels |
| Chart-metric editor: single `Select` + sum/diff/ratio `CodeCheckboxList` | `frontend/components/statement-chart-settings-dialog.tsx` | add labels |

Out of scope (free-text inputs, no combobox): `settings/accounting-mapping/page.tsx`,
`settings/companies/[id]/mapping/page.tsx`, and read-only hint cells.

## Approach A — code→label Map prop

1. **New util** in `frontend/lib/income-statement-structure-utils.ts`:
   `mapLinkCodesToOwnerLabel(structure): Map<string, string>` — for each row with a
   non-empty single `linkCode` and non-empty label, set `map[code] = label` (first
   writer wins, consistent with existing `mapLinkCodesTo*Labels` helpers).

2. **Thread an optional `linkCodeLabels?: Map<string, string>` prop** into:
   - `IncomeStatementLiaisonCell` → its inner `LinkCodeCombobox` and the
     sum/difference/numerator/denominator checkbox lists.
   - `ChartMetricSpecEditor` → its single-code `Select` and `CodeCheckboxList`s.

3. **Callers build the map** from the structure they already hold, right beside the
   existing `collectDistinctLinkCodesFromStructure(...)` call:
   - `income-statement-summary.tsx`, `income-statement-detail.tsx`,
     `balance-sheet-summary.tsx`, `balance-sheet-detail.tsx`,
     `statement-summary-structure-shared.tsx`,
     `income-statement-structure-studio-cols.tsx` (pass-through prop).
   - `statement-chart-settings-dialog.tsx`: build the map at load time from the
     fetched `data.structure` (store alongside the existing `linkCodes` state) and
     pass it through `ChartMetricSpecEditor`.

The prop is optional; when absent, behavior is unchanged (bare codes).

## Display format

- Single-pick combobox/select trigger + option rows: `4100 — Ventes nettes`
  (code in `font-mono`, label in muted text). No owner label → bare code, no `—`.
- Sum/difference/ratio checkbox lists: mono code followed by muted label on the
  same row.

## Testing

- Unit: `mapLinkCodesToOwnerLabel` — single-mode rows mapped, empty/labelless rows
  skipped, composite-only codes absent, first-writer-wins on duplicates.
- Playwright: liaison-cell combobox option list renders the label next to a code.

## Non-goals

- No change to stored config shape (`allLinkCodes` stays `string[]`).
- No new network requests.
- No change to read-only hint cells.
