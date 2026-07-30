import type { StatementChartSeries } from "@/lib/statement-chart-config"
import type { BalancePositionFamily } from "@/lib/financial-position"

/** stackGroup des séries « graphique Actif ». */
export const FINANCIAL_POSITION_STACK_ASSETS = "fp-assets"
/** stackGroup des séries « graphique Passif et capitaux propres ». */
export const FINANCIAL_POSITION_STACK_LIABILITIES = "fp-liabilities"

export type FinancialPositionSettingsPanel =
  | typeof FINANCIAL_POSITION_STACK_ASSETS
  | typeof FINANCIAL_POSITION_STACK_LIABILITIES

export const FINANCIAL_POSITION_SERIES_IDS = {
  act: "fp-act",
  alt: "fp-alt",
  pct: "fp-pct",
  plt: "fp-plt",
  cap: "fp-cap",
} as const

export const FINANCIAL_POSITION_SERIES_ID_TO_FAMILY: Record<string, BalancePositionFamily> = {
  [FINANCIAL_POSITION_SERIES_IDS.act]: "ACT",
  [FINANCIAL_POSITION_SERIES_IDS.alt]: "ALT",
  [FINANCIAL_POSITION_SERIES_IDS.pct]: "PCT",
  [FINANCIAL_POSITION_SERIES_IDS.plt]: "PLT",
  [FINANCIAL_POSITION_SERIES_IDS.cap]: "CAP",
}

export function isFinancialPositionSettingsPanel(
  value: string | null | undefined,
): value is FinancialPositionSettingsPanel {
  return value === FINANCIAL_POSITION_STACK_ASSETS || value === FINANCIAL_POSITION_STACK_LIABILITIES
}

export function financialPositionPanelTitle(panel: FinancialPositionSettingsPanel): string {
  return panel === FINANCIAL_POSITION_STACK_ASSETS
    ? "Paramètres — Actif"
    : "Paramètres — Passif et capitaux propres"
}

export function financialPositionSeriesForPanel(
  series: StatementChartSeries[],
  panel: FinancialPositionSettingsPanel,
): StatementChartSeries[] {
  return series.filter((s) => s.stackGroup === panel)
}
