# Dashboard parity for Bilan and Trésorerie

**Status:** Draft — pending user review
**Date:** 2026-05-18
**Branch:** `feat/add-reporting`

## Goal

Bring the user-customizable Tableau de bord experience from Résultats financiers (income statement) to Bilan (balance sheet) and Trésorerie (cash flow). Users on all three statement pages should be able to build their own multi-chart dashboards backed by their company's link codes. Configs persist server-side, scoped to the company and shared org-wide.

## Decisions locked in upfront

These are the questions answered during brainstorming. They constrain everything below.

| Decision | Value |
|---|---|
| Scope | Full parity with Résultats (Tableau de bord + Sommaire + Détail), but horizon menus stay statement-appropriate (Bilan keeps no YTD/DDM; Trésorerie keeps its current set). |
| Code structure | Generalize the income-statement-specific chart system into one statement-agnostic module powering all three pages. |
| Persistence | PostgreSQL, per company, shared org-wide. localStorage path is deleted. |
| Migration | Fresh start. No localStorage import — no users in production today. |
| Concurrency | Stale-version detection via integer `version` on the row. PUT with stale version returns 409. |
| Trésorerie default | Stacked Opération / Investissement / Financement bars + Flux net line. |
| Bilan default | Actifs / Passifs / Capitaux propres bars. |
| Trésorerie Top-3 widget | Kept, but moved to render only inside Sommaire/Détail modes. Dashboard mode shows only the customizable charts. |
| Shared page scaffolding refactor | Out of scope — pages stay duplicated; revisit after this lands. |

## Architecture overview

One generic, statement-agnostic dashboard-chart system powers Résultats / Bilan / Trésorerie. Configs live in PostgreSQL, scoped to `(company_id, statement_type)`. All three pages render the same three-section structure (Tableau de bord / Sommaire / Détail).

### New backend surface

- `backend/app/models/statement_chart_config.py` — new table `statement_chart_configs`.
- `backend/app/schemas/statement_chart_config.py` — Pydantic models for the V2 config and API I/O.
- `backend/app/routers/statement_chart_configs.py` — CRUD + slot list endpoints.
- `backend/app/services/statement_chart_defaults.py` — single source of truth for per-statement defaults.
- One Alembic migration adding the table.

### New frontend module

- `frontend/lib/statement-chart-config.ts` — generalized from today's `performance-chart-config.ts`. Same V2 series shape; storage is API-backed.
- `frontend/components/statement-chart.tsx` — generalized from `income-statement-chart.tsx`. Reads its config by `(companyId, statementType, chartInstanceId)`. Uses the existing `useFinancialStatementSeries` hook.
- `frontend/components/statement-chart-settings-dialog.tsx` — generalized from `performance-chart-settings-dialog.tsx`. Pulls link codes via `getStatementStructure(companyId, statementType)`.
- `frontend/hooks/use-statement-chart-slots.ts` — owns the slot list, active slot id, and refresh trigger for a page.

### Files deleted in this PR

- `frontend/lib/performance-chart-config.ts`
- `frontend/components/income-statement-chart.tsx`
- `frontend/components/performance-chart-settings-dialog.tsx`
- `frontend/components/balance-sheet-chart.tsx`
- `frontend/components/cash-flow-chart.tsx`

### Pages updated

- `frontend/app/financial-statements/income-statement/page.tsx` — swap imports to the generic module. No UX change.
- `frontend/app/financial-statements/balance-sheet/page.tsx` — replace the single `<BalanceSheetChart />` in the dashboard section with the multi-slot pattern (`StatementChart` + Ajouter un graphique button + slot selector).
- `frontend/app/financial-statements/cash-flow/page.tsx` — add a Tableau de bord section to the section toggle. Move the existing inline chart block and Top-3 dark band into the Sommaire/Détail render path. Dashboard mode shows only the customizable charts.

## Backend data model

### Table `statement_chart_configs`

```python
class StatementChartConfig(Base):
    __tablename__ = "statement_chart_configs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    statement_type: Mapped[str] = mapped_column(String(32), nullable=False)
    # ^ "income-statement" | "balance-sheet" | "cash-flow"
    chart_instance_id: Mapped[str] = mapped_column(String(64), nullable=False)
    # ^ "default" for the first slot; uuid strings for additional slots
    slot_index: Mapped[int] = mapped_column(Integer, nullable=False)
    # ^ ordering within (company, statement_type); "default" is always 0
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # ^ bumped on every PUT; round-tripped to client; required on next PUT
    config_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # ^ the V2 series config (chartTitle, series[], etc.)
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at, updated_at  # standard

    __table_args__ = (
        UniqueConstraint("company_id", "statement_type", "chart_instance_id"),
        Index("ix_chart_configs_company_statement", "company_id", "statement_type"),
    )
```

### Rationale

- **JSONB for `config_json`.** The V2 schema is a tree of series specs (`single` / `sum` / `difference` / `ratio` / `derivedMargin`). Modeling it relationally would take four to five tables for no operational gain — JSONB stores it natively and we already accept that nested-spec validation lives in Pydantic, not the DB.
- **Integer `version` instead of `updated_at` for stale checks.** Two saves within the same second would defeat a timestamp; an integer is unambiguous.
- **`updated_by_user_id` is for display only** ("Modifié par X • le Y" line in the settings dialog). Not used for filtering, since configs are org-wide.

### API endpoints

All under `/api/companies/{company_id}/statement-chart-configs`. All use `Depends(get_current_user)` and verify the user's organization owns `company_id` (same pattern as `routers/quickbooks.py`).

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `?statement_type=...` | — | `[{ chart_instance_id, slot_index, version, config, updated_by_user_email?, updated_at }]` ordered by `slot_index`. If empty, the handler auto-seeds the `default` slot first. |
| `PUT` | `/{chart_instance_id}?statement_type=...` | `{ version, config }` | New `{ chart_instance_id, slot_index, version, config, updated_by_user_email, updated_at }`. **409** with `{ current_version, current_config, updated_by_user_email, updated_at }` if `version` is stale. |
| `POST` | `?statement_type=...` | — | New slot with default config: `{ chart_instance_id, slot_index, version: 1, config }`. |
| `DELETE` | `/{chart_instance_id}?statement_type=...` | — | 204. **400** if `chart_instance_id == "default"`. |

### Auto-seeding on first GET

If a `GET` finds zero rows for `(company, statement_type)`, the handler synthesizes the `default` slot from `seed_default_chart_config(statement_type)` (see *Defaults & seeding*), inserts it with `version=1, slot_index=0`, and returns it. The frontend always sees at least the `default` slot — no empty-state branch in the UI.

## Shared chart module (frontend)

### `lib/statement-chart-config.ts`

```ts
export type StatementType = "income-statement" | "balance-sheet" | "cash-flow"

// V2 series spec types carry over unchanged from the old performance-chart-config.
// They only reference link_code strings — no income-statement assumptions in the
// types themselves. Renamed:
//   PerformanceMetricSpec      → ChartMetricSpec
//   PerformanceChartSeriesV2   → StatementChartSeries
//   PerformanceChartConfigV2   → StatementChartConfig
//   ChartValueFormat           → unchanged

export interface ChartSlot {
  chartInstanceId: string
  slotIndex: number
  version: number
  config: StatementChartConfig
  updatedByUserEmail?: string
  updatedAt?: string
}

export function defaultStatementChartConfig(
  statementType: StatementType
): StatementChartConfig
```

The `single` / `sum` / `difference` / `ratio` / `derivedMargin` spec types carry over unchanged. The V1→V2 migration helper is removed (no V1 data exists in the new backend store). All localStorage helpers are removed.

### `lib/api.ts` additions

```ts
listStatementChartSlots(companyId, statementType): Promise<ChartSlot[]>
saveStatementChartSlot(
  companyId, statementType, chartInstanceId, { version, config }
): Promise<ChartSlot>        // throws StaleVersionError on 409
addStatementChartSlot(companyId, statementType): Promise<ChartSlot>
removeStatementChartSlot(
  companyId, statementType, chartInstanceId
): Promise<void>
```

`StaleVersionError` carries the server's `current_version`, `current_config`, `updated_by_user_email`, `updated_at` so the dialog can react without a second request.

### `hooks/use-statement-chart-slots.ts`

```ts
useStatementChartSlots(companyId, statementType) → {
  slots, activeSlotId, setActiveSlotId,
  addSlot(), removeSlot(id),
  refresh(),     // re-fetches after a settings save
  loading, error,
}
```

Each statement page consumes this hook in place of the four `loadPerformanceChart*` / `appendPerformanceChartSlot` / `removePerformanceChartSlot` calls today.

### `components/statement-chart.tsx`

Same UX as today's `IncomeStatementChart`: header with title, optional slot-selector dropdown when slot count > 1, optional remove button, settings gear. Props change so the parent owns the slot list and passes `chartConfig` and `version` down — the chart no longer reads config itself.

`useFinancialStatementSeries({ statementType, ... })` already supports all three statement types (it's already used by the soon-deleted `balance-sheet-chart` and `cash-flow-chart`). No hook changes.

The income-statement-specific narrative renderer (`buildIncomePerformanceNarrative`) becomes opt-in: rendered only when `statementType === "income-statement"`. No equivalent for the other two in this PR; the chart card just doesn't show a narrative panel for them.

The V2 series type gains an optional `stackGroup?: string` field. Recharts already supports this via `stackId` — the cash-flow default uses it to stack Op/Inv/Fin.

### `components/statement-chart-settings-dialog.tsx`

Takes `statementType` + `companyId` + `chartInstanceId` + `version` + `config`. Pulls link codes via the existing `getStatementStructure(companyId, statementType)` (already returns the right structure for any of the three types). On save: calls `saveStatementChartSlot`. On 409: surfaces the stale-config UI (see *Stale-config warning*).

The `derivedMargin` series type is available for all statement types — its spec doesn't care about statement type, and a user wanting a ratio between two arbitrary link codes on Bilan is fine. It's just not seeded in non-income defaults.

### Renames at a glance

| Old | New |
|---|---|
| `lib/performance-chart-config.ts` | `lib/statement-chart-config.ts` |
| `components/income-statement-chart.tsx` | `components/statement-chart.tsx` |
| `components/performance-chart-settings-dialog.tsx` | `components/statement-chart-settings-dialog.tsx` |
| `DEFAULT_PERFORMANCE_CHART_CARD_TITLE` | `defaultChartCardTitle(statementType)` |
| `loadPerformanceChartConfig` / `save…` / `append…Slot` / `remove…Slot` | API wrappers (`lib/api.ts`) + `useStatementChartSlots` hook |

## Page wiring

### `income-statement/page.tsx`

Pure refactor; no UX change.

- Replace `loadPerformanceChartSlotIds` / `appendPerformanceChartSlot` / `removePerformanceChartSlot` / `loadPerformanceChartConfig` calls with `useStatementChartSlots(effectiveCompanyId, "income-statement")`.
- Replace `<IncomeStatementChart … />` with `<StatementChart statementType="income-statement" … />`. Same other props.
- Keep `structureVersion` state and the Sommaire/Détail wiring unchanged.

Net diff: a handful of import/identifier swaps; ~30 fewer lines (slot management moves into the hook).

### `balance-sheet/page.tsx`

Already has the `section === "dashboard"` branch, so the section toggle stays. The dashboard body changes from a single `<BalanceSheetChart />` to the same multi-slot pattern as the income-statement page: an "Ajouter un graphique" button + `<StatementChart statementType="balance-sheet" … />`.

The internal chart-type toggle in `BalanceSheetChart` (assets-liab-equity / current-noncurrent / debt-equity-ratio) goes away. Users now build the equivalent series in the settings dialog. The default seeded config ships with the Actifs / Passifs / Capitaux propres bars so the page looks familiar out of the box.

`BalanceSheetSummary` and `BalanceSheetDetail` stay exactly as-is.

### `cash-flow/page.tsx`

- Add `"dashboard"` to the `Section` union. Section toggle goes from 2 buttons to 3 (Tableau de bord / Sommaire / Détail), default `"dashboard"` to match the other two pages.
- The current standalone chart block + "Top 3 variations" dark band move *inside* the Sommaire/Détail render path: they continue to render above the table in those two modes, exactly as today. Dashboard mode shows only the customizable charts.
- Dashboard body: same multi-slot pattern as the other pages, with `statementType="cash-flow"`.
- Apply the same "Dashboard: limit to 12mois/trimestres/annees" horizon guard used by the other two pages.

### Shared scaffolding (deferred)

The dark header band, controls bar, and gradient backgrounds are duplicated across the three pages today. **Not refactored in this PR.** Reason: the controls have statement-specific rules (Bilan hides comparison type for multi-period; Trésorerie has different column-mode disabling rules; Income Statement has a unique comparison-type chevron flow). Untangling those without regressions is a separate effort.

## Stale-config warning

### Flow

1. Dialog opens with `{ version: 7, config }` from GET.
2. User edits, clicks save. Frontend `PUT`s `{ version: 7, config: edits }`.
3. Server compares `version` to current DB row.
   - **Match.** Bumps to 8, persists, returns `{ version: 8, config: edits }`. Done.
   - **Mismatch.** Returns `409 Conflict` with `{ current_version, current_config, updated_by_user_email, updated_at }`.
4. Frontend catches the 409 and switches the dialog to a stale state:
   - Non-dismissible banner: *"Quelqu'un d'autre a modifié ce graphique pendant que vous l'éditiez (X • il y a 2 min). Vos modifications n'ont pas été enregistrées."*
   - **"Recharger"** — replaces form state with the server's current config. User's edits lost; they redo on top.
   - **"Écraser quand même"** — re-PUTs with `current_version` so it succeeds. No merge attempt.
   - Cancel button still closes the dialog without writing.

No auto-merge. Field-level merge for nested series specs is too error-prone for this feature.

### Audit display (non-blocking)

When the dialog opens, the GET response includes `updated_by_user_email` and `updated_at`. The dialog renders a small "Modifié par X • le Y" line at the bottom — users see who last touched it every time, not just on collision.

### Edge cases

- **Slot deleted mid-edit.** PUT returns `404`. Dialog shows non-dismissible banner *"Ce graphique a été supprimé"* with one action: **"Fermer"**. No write path.
- **Adding a slot** doesn't need conflict detection. POST always creates a new row with `version=1`.

### Where `version` lives in the request

Body, not a header. The dialog already round-trips `{ version, config }` end-to-end — putting it in a header buys nothing.

## Defaults & seeding

### `backend/app/services/statement_chart_defaults.py`

`seed_default_chart_config(statement_type) -> dict` returns a V2 config tree. Every series uses an empty `link_code` (`""`) — the user fills these in via the settings dialog. We pre-build the *shape* (which series exist, their kind / axis / format / color / label / stack group) but not the link-code wiring, because link codes vary by company.

### Per-statement defaults

| Statement | Chart title | Series |
|---|---|---|
| `income-statement` | "Performance financière" | Bar: Revenus (currency, left, color 0) · Bar: BAIIA (currency, left, color 1) · Line: Marge brute % (ratio, right, color 2, `derivedMargin` spec referencing the Revenus series id) |
| `balance-sheet` | "Bilan" | Bar: Actifs (currency, left, color 0) · Bar: Passifs (currency, left, color 1) · Bar: Capitaux propres (currency, left, color 2) |
| `cash-flow` | "Flux de trésorerie" | Bar: Exploitation (currency, left, color 0, stackGroup "cf") · Bar: Investissement (currency, left, color 3, stackGroup "cf") · Bar: Financement (currency, left, color 4, stackGroup "cf") · Line: Flux net (currency, left, color 1) |

The income-statement default reproduces today's `defaultPerformanceChartConfigV2()` so existing-functionality regression is zero.

### Why empty link codes instead of guessing

We don't have a reliable mapping from semantic concepts ("Revenus", "Actifs courants") to a given company's link codes. Today's hardcoded `BalanceSheetChart` does fuzzy string matching against row labels (`findRow("actifs courants")`) which silently fails for many companies. Empty defaults force one explicit pick, and the chart honestly renders zeros until that's done — better than fake numbers from a missed label match.

### No "reset to defaults" UI

YAGNI for this PR. Users can clear series manually.

### `stackGroup` field addition

The V2 series type gains `stackGroup?: string`. Optional; only meaningful for bars. Recharts already supports it via `stackId`. ~5 lines added to the series renderer in `StatementChart`.

## Testing strategy

### Backend (`backend/tests/`)

- `test_statement_chart_configs.py` — happy paths for GET/PUT/POST/DELETE on all three statement types; auto-seed on first GET; auth/org-scoping (user from org A cannot read/write a company in org B → 403); 404 on unknown company.
- `test_statement_chart_configs_concurrency.py` — PUT with stale `version` returns 409 with `current_version` + `current_config`; PUT with matching `version` bumps to N+1; DELETE of `chart_instance_id="default"` returns 400; PUT on deleted slot returns 404.
- Pydantic round-trip tests for the V2 config payload.

### Frontend unit tests

None added in this PR. The frontend has no unit-test framework configured today (only Playwright e2e). Setting one up is out of scope. The normalization / type-guard logic in `statement-chart-config.ts` is covered indirectly by e2e tests round-tripping configs through the API.

### Frontend e2e (`frontend/e2e/`)

One spec per statement type to keep them independent. All mock the new `statement-chart-configs` endpoints rather than hitting Postgres, matching `frontend/e2e/quickbooks.spec.ts`.

- `dashboard-income-statement.spec.ts` — page loads, dashboard renders with default chart, open settings, change link codes, save, reload, see persisted values. Add a second slot, switch slots, delete the second slot.
- `dashboard-balance-sheet.spec.ts` — same flow on Bilan; verifies the previously hardcoded-chart page now exposes multi-slot + settings.
- `dashboard-cash-flow.spec.ts` — new section toggle has 3 buttons, dashboard mode shows multi-slot, Sommaire/Détail still render the inline chart + Top-3 band above the table.
- `dashboard-stale-config.spec.ts` — open settings, mock a 409 on save, verify stale banner + "Recharger" / "Écraser quand même" behave correctly.

### Out of scope

- Visual regression / Chromatic-style screenshots.
- Load testing for many slots (defaults to 1; max useful is ~5).
- Migration tests for localStorage → backend (no migration; fresh start).
