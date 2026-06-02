# Balance-sheet "not balanced" warning (Bilan Sommaire)

**Date:** 2026-05-30
**Status:** Approved

## Problem

On the Bilan (balance sheet) Sommaire page, nothing tells the user when the
statement doesn't balance — i.e. when **Total des actifs ≠ Total passifs et
capitaux propres**. This happens with an unbalanced trial balance or incomplete
account mapping and should be surfaced.

## Goal

Show a warning banner at the top of the Bilan Sommaire card when the two totals
differ for the current period.

## Approach — frontend label match

The summary already builds a `data: SummaryRow[]` array and finds the assets
total by label ([balance-sheet-summary.tsx:647](frontend/components/balance-sheet-summary.tsx#L647)).
The default structure also defines a combined liabilities+equity total
(`statement_structures.py`: rows `"total des actifs"` and
`"total passifs et capitaux propres"`, both `isResult`). We compare those two.

No backend change (a server-computed `balanceDelta` would be more reusable but
touches the service + schema + all callers — overkill for a Sommaire banner).

### Detection (in `balance-sheet-summary.tsx`, next to `totalAssetsRow`)

- `assets = data.find(r => r.label.toLowerCase() === "total des actifs")` (reuse
  existing `totalAssetsRow`).
- `lAndE  = data.find(r => r.label.toLowerCase() === "total passifs et capitaux propres")`.
- `ecart = assets.current − lAndE.current`.
- **Imbalanced when `Math.abs(ecart) >= 1`** (tolerate sub-dollar rounding).
- **Current period only** — `.current` holds the reference-period value in both
  single-period (`mapBackendRows`) and multi-period (`buildSeriesData`) views.
- If either total row is absent (a structure that renamed them), show nothing —
  no false alarms.

### Gating

`BalanceSheetSummary` is reused by pro-forma
([projections/pro-forma/page.tsx:752](frontend/app/projections/pro-forma/page.tsx#L752))
as well as the Bilan page. Add a `showBalanceWarning?: boolean` prop (default
`false`); set it `true` only on `/financial-statements/balance-sheet`.

### Banner

Amber alert as the first child of the card body (top of the card), using
`formatCurrency`:

> ⚠ **Le bilan n'est pas équilibré.** Total des actifs {X} ≠ Total passifs et
> capitaux propres {Y} (écart {|ecart|}).

Icon: `AlertTriangle` (lucide-react). Styling consistent with the slate/amber
palette; full-width bar with a bottom border.

## Out of scope

- Detail view, pro-forma, and other statements.
- Per-column checks in trend/comparison views (current period only).
- Auto-fixing or explaining the cause of the imbalance.

## Testing

Playwright e2e on the Bilan Sommaire (backend mocked, card rendered via series +
base rows as in existing specs):

- Totals differ (assets 1000 vs L+E 980) → banner visible (matches /équilibr/).
- Totals equal (1000 vs 1000) → no banner.
