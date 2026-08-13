import type { StatementChartSeries } from "@/lib/statement-chart-config"

export const WORKING_CAPITAL_METRIC_KEYS = ["fdr", "fdrhc", "dso", "dio", "dpo", "ccc"] as const
export type WorkingCapitalMetricKey = (typeof WORKING_CAPITAL_METRIC_KEYS)[number]

/** stackGroup du graphique FDR / FdRHC. */
export const WORKING_CAPITAL_STACK_FDR = "wc-fdr"
/** stackGroup du graphique cycle de trésorerie (DSO, DIO, DPO, CCC). */
export const WORKING_CAPITAL_STACK_CYCLE = "wc-cycle"

export type WorkingCapitalSettingsPanel =
  | typeof WORKING_CAPITAL_STACK_FDR
  | typeof WORKING_CAPITAL_STACK_CYCLE

export const WORKING_CAPITAL_SERIES_IDS = {
  fdr: "wc-fdr",
  fdrhc: "wc-fdrhc",
  dso: "wc-dso",
  dio: "wc-dio",
  dpo: "wc-dpo",
  ccc: "wc-ccc",
} as const

export const WORKING_CAPITAL_SERIES_ID_TO_METRIC: Record<string, WorkingCapitalMetricKey> = {
  [WORKING_CAPITAL_SERIES_IDS.fdr]: "fdr",
  [WORKING_CAPITAL_SERIES_IDS.fdrhc]: "fdrhc",
  [WORKING_CAPITAL_SERIES_IDS.dso]: "dso",
  [WORKING_CAPITAL_SERIES_IDS.dio]: "dio",
  [WORKING_CAPITAL_SERIES_IDS.dpo]: "dpo",
  [WORKING_CAPITAL_SERIES_IDS.ccc]: "ccc",
}

export function isWorkingCapitalSettingsPanel(
  value: string | null | undefined,
): value is WorkingCapitalSettingsPanel {
  return value === WORKING_CAPITAL_STACK_FDR || value === WORKING_CAPITAL_STACK_CYCLE
}

export function workingCapitalPanelTitle(panel: WorkingCapitalSettingsPanel): string {
  return panel === WORKING_CAPITAL_STACK_FDR
    ? "Paramètres — Fonds de roulement"
    : "Paramètres — Cycle de trésorerie"
}

export function workingCapitalSeriesForPanel(
  series: StatementChartSeries[],
  panel: WorkingCapitalSettingsPanel,
): StatementChartSeries[] {
  return series.filter((s) => s.stackGroup === panel)
}
