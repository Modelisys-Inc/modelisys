export const RETURN_HORIZON_YEARS = 3

/** Palette waterfall — uniforme sur toute la section. */
export const RETURN_WATERFALL_COLORS = {
  anchor: { from: "#64748B", to: "#475569" },
  valueAdd: { from: "#4A9B73", to: "#2F7A58" },
  distribution: { from: "#E8945A", to: "#E0742D" },
  subtotal: { from: "#94A3B8", to: "#4B5563" },
  realizedTotal: { from: "#E0742D", to: "#B45309" },
  projectedTotal: { from: "#5B8DEF", to: "#3B6FD4" },
} as const

/** Montants réalisés — les pourcentages sont calculés à partir de ceux-ci. */
export const RETURN_BASE = {
  valueThreeYearsAgoM: 2.7,
  currentValueM: 6.0,
  distributionsM: 0.33,
} as const

/** Décomposition illustrative du rendement annualisé réalisé. */
export const RETURN_DRIVER_BREAKDOWN = [
  { id: "revenus", label: "Croissance des revenus", annualizedPct: 8.2 },
  { id: "marge", label: "Amélioration de la marge", annualizedPct: 11.4 },
  { id: "bfr", label: "Optimisation du BFR", annualizedPct: 4.6 },
  { id: "risque", label: "Réduction du risque", annualizedPct: 3.1 },
  { id: "distributions", label: "Distributions", annualizedPct: 5.5 },
] as const

/** Projection illustrative sur les 3 prochains ans (pro forma). */
export const RETURN_PROJECTION = {
  projectedValueM: 9.7,
  projectedDistributionsM: 0.52,
} as const

export const RETURN_PROJECTION_DRIVER_BREAKDOWN = [
  { id: "revenus", label: "Croissance des revenus", annualizedPct: 5.0 },
  { id: "marge", label: "Amélioration de la marge", annualizedPct: 6.3 },
  { id: "bfr", label: "Optimisation du BFR", annualizedPct: 2.4 },
  { id: "risque", label: "Réduction du risque", annualizedPct: 1.9 },
  { id: "distributions", label: "Distributions", annualizedPct: 3.8 },
] as const

export type ReturnWaterfallAddStep = {
  kind: "add"
  id: string
  label: string
  amountM: number
  annualizedPct: number
  tone: "value" | "distribution"
}

export type ReturnWaterfallStep =
  | { kind: "section"; id: string; label: string; variant: "realized" | "projected" }
  | { kind: "anchor"; id: string; label: string; amountM: number }
  | ReturnWaterfallAddStep
  | { kind: "subtotal"; id: string; label: string; amountM: number; growthPct: number }
  | {
      kind: "total"
      id: string
      label: string
      amountM: number
      totalReturnPct: number
      annualizedCagrPct: number
      variant: "realized" | "projected"
    }

export function computeReturnNarrative() {
  const start = RETURN_BASE.valueThreeYearsAgoM
  const end = RETURN_BASE.currentValueM
  const distributionsM = RETURN_BASE.distributionsM
  const endWealthM = end + distributionsM

  const valueGrowthPct = ((end - start) / start) * 100
  const distributionsPct = (distributionsM / start) * 100
  const totalReturnPct = ((endWealthM - start) / start) * 100
  const annualizedCagrPct = (Math.pow(endWealthM / start, 1 / RETURN_HORIZON_YEARS) - 1) * 100

  return {
    valueThreeYearsAgoM: start,
    currentValueM: end,
    distributionsM,
    endWealthM,
    valueGrowthPct,
    distributionsPct,
    totalReturnPct,
    annualizedCagrPct,
  }
}

export function computeReturnProjection() {
  const start = RETURN_BASE.currentValueM
  const end = RETURN_PROJECTION.projectedValueM
  const distributionsM = RETURN_PROJECTION.projectedDistributionsM
  const endWealthM = end + distributionsM

  const valueGrowthPct = ((end - start) / start) * 100
  const distributionsPct = (distributionsM / start) * 100
  const totalReturnPct = ((endWealthM - start) / start) * 100
  const annualizedCagrPct = (Math.pow(endWealthM / start, 1 / RETURN_HORIZON_YEARS) - 1) * 100

  return {
    valueStartM: start,
    projectedValueM: end,
    projectedDistributionsM: distributionsM,
    endWealthM,
    valueGrowthPct,
    distributionsPct,
    totalReturnPct,
    annualizedCagrPct,
  }
}

function buildPeriodWaterfall(params: {
  section: ReturnWaterfallStep
  anchor: ReturnWaterfallStep & { kind: "anchor" }
  subtotal: ReturnWaterfallStep & { kind: "subtotal" }
  total: ReturnWaterfallStep & { kind: "total" }
  drivers: readonly { id: string; label: string; annualizedPct: number }[]
  valueGainM: number
  distributionsM: number
}): ReturnWaterfallStep[] {
  const valueDrivers = params.drivers.filter((d) => d.id !== "distributions")
  const valueDriverWeight = valueDrivers.reduce((sum, d) => sum + d.annualizedPct, 0)

  const valueAdds: ReturnWaterfallAddStep[] = valueDrivers.map((driver) => ({
    kind: "add",
    id: `${params.section.id}-${driver.id}`,
    label: driver.label,
    annualizedPct: driver.annualizedPct,
    amountM: params.valueGainM * (driver.annualizedPct / valueDriverWeight),
    tone: "value",
  }))

  const distributionDriver = params.drivers.find((d) => d.id === "distributions")!
  const distributionAdd: ReturnWaterfallAddStep = {
    kind: "add",
    id: `${params.section.id}-${distributionDriver.id}`,
    label: distributionDriver.label,
    annualizedPct: distributionDriver.annualizedPct,
    amountM: params.distributionsM,
    tone: "distribution",
  }

  return [params.section, params.anchor, ...valueAdds, params.subtotal, distributionAdd, params.total]
}

export type ReturnWaterfallView = "realized" | "projected"

function buildRealizedPeriodSteps(): ReturnWaterfallStep[] {
  const realized = computeReturnNarrative()
  const realizedValueGainM = realized.currentValueM - realized.valueThreeYearsAgoM

  return buildPeriodWaterfall({
    section: {
      kind: "section",
      id: "sec-realized",
      label: `Rendement réalisé · ${RETURN_HORIZON_YEARS} derniers ans`,
      variant: "realized",
    },
    anchor: {
      kind: "anchor",
      id: "start",
      label: `Valeur il y a ${RETURN_HORIZON_YEARS} ans`,
      amountM: realized.valueThreeYearsAgoM,
    },
    subtotal: {
      kind: "subtotal",
      id: "current-value",
      label: "Valeur aujourd'hui",
      amountM: realized.currentValueM,
      growthPct: realized.valueGrowthPct,
    },
    total: {
      kind: "total",
      id: "total-realized",
      label: "Rendement réalisé",
      amountM: realized.endWealthM,
      totalReturnPct: realized.totalReturnPct,
      annualizedCagrPct: realized.annualizedCagrPct,
      variant: "realized",
    },
    drivers: RETURN_DRIVER_BREAKDOWN,
    valueGainM: realizedValueGainM,
    distributionsM: realized.distributionsM,
  })
}

function buildProjectedPeriodSteps(): ReturnWaterfallStep[] {
  const projected = computeReturnProjection()
  const projectedValueGainM = projected.projectedValueM - projected.valueStartM

  return buildPeriodWaterfall({
    section: {
      kind: "section",
      id: "sec-projected",
      label: `Rendement projeté · ${RETURN_HORIZON_YEARS} prochains ans`,
      variant: "projected",
    },
    anchor: {
      kind: "anchor",
      id: "projection-start",
      label: "Valeur aujourd'hui",
      amountM: projected.valueStartM,
    },
    subtotal: {
      kind: "subtotal",
      id: "projected-value",
      label: "Valeur projetée",
      amountM: projected.projectedValueM,
      growthPct: projected.valueGrowthPct,
    },
    total: {
      kind: "total",
      id: "total-projected",
      label: "Rendement projeté",
      amountM: projected.endWealthM,
      totalReturnPct: projected.totalReturnPct,
      annualizedCagrPct: projected.annualizedCagrPct,
      variant: "projected",
    },
    drivers: RETURN_PROJECTION_DRIVER_BREAKDOWN,
    valueGainM: projectedValueGainM,
    distributionsM: projected.projectedDistributionsM,
  })
}

export function buildReturnWaterfallForView(view: ReturnWaterfallView): {
  steps: ReturnWaterfallStep[]
  maxM: number
  sectionLabel: string
} {
  const periodSteps = view === "realized" ? buildRealizedPeriodSteps() : buildProjectedPeriodSteps()
  const section = periodSteps.find((step) => step.kind === "section")!
  const steps = periodSteps.filter((step) => step.kind !== "section")
  const total = steps.find((step) => step.kind === "total")!

  return {
    steps,
    maxM: total!.amountM,
    sectionLabel: section.label,
  }
}

export function buildReturnWaterfall(): { steps: ReturnWaterfallStep[]; maxM: number } {
  const realized = buildRealizedPeriodSteps()
  const projected = buildProjectedPeriodSteps()
  const realizedTotal = realized.find((s) => s.kind === "total")!.amountM
  const projectedTotal = projected.find((s) => s.kind === "total")!.amountM

  return {
    steps: [...realized, ...projected],
    maxM: Math.max(realizedTotal, projectedTotal),
  }
}

export function formatPercentFr(value: number, decimals = 1): string {
  const rounded = value.toFixed(decimals).replace(".", ",")
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${rounded} %`
}

export function formatMillionsFr(valueM: number): string {
  if (valueM >= 1) return `${valueM.toFixed(1).replace(".0", "").replace(".", ",")} M$`
  if (valueM >= 0.1) return `${valueM.toFixed(2).replace(".", ",")} M$`
  return `${Math.round(valueM * 1000)} k$`
}

export function formatMillionsCompactFr(valueM: number): string {
  if (valueM >= 1) return `${valueM.toFixed(2).replace(".", ",")} M$`
  return `${Math.round(valueM * 1000)} k$`
}

export function returnDriverBreakdownTotal(): number {
  return RETURN_DRIVER_BREAKDOWN.reduce((sum, driver) => sum + driver.annualizedPct, 0)
}

export function returnProjectionBreakdownTotal(): number {
  return RETURN_PROJECTION_DRIVER_BREAKDOWN.reduce((sum, driver) => sum + driver.annualizedPct, 0)
}
