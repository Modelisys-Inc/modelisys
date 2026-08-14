"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  clampForecastSeasonalityMonthPercents,
  createDefaultForecastSeasonalityMonthPercents,
  createForecastSeasonalityBandXScale,
  createZeroForecastSeasonalityMonthPercents,
  computeForecastSeasonalityChartYScale,
  FORECAST_SEASONALITY_AXIS_LABELS,
  FORECAST_SEASONALITY_CHART_SLATE,
  FORECAST_SEASONALITY_MONTH_LABELS,
  FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE,
  normalizeForecastSeasonalityMonthPercents,
  seasonalityAdvanceToMonthOffset,
  seasonalityDisplayColumnToBaseIndex,
  shiftSeasonalityEarlierForPreRevenue,
} from "@/lib/forecast-seasonality-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  clampPreRevenueAdvanceDays,
  labelForCollectionDelayDays,
  parsePercentInput,
  STANDARD_PRE_REVENUE_ADVANCE_DAYS,
} from "@/lib/forecast-collection-cash-utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AlertTriangle, ChevronDown, Info } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

export type ForecastSeasonalityEditorVariant = "revenu" | "depense" | "capex" | "decaissement"

function forecastSeasonalityPercentsMatch(a: number[], b: number[]): boolean {
  const left = normalizeForecastSeasonalityMonthPercents(a)
  const right = normalizeForecastSeasonalityMonthPercents(b)
  return left.every((v, i) => v === (right[i] ?? 0))
}

const VARIANT_COPY: Record<
  ForecastSeasonalityEditorVariant,
  {
    distributionTitle: string
    chartAria: string
    tooltipPercentLabel: string
    replicateTitle: string
    replicateDescription: (followingYears: string, yearLabel: string) => string
    projectionLegend: string
  }
> = {
  revenu: {
    distributionTitle: "Répartition du revenu annuel par mois (janvier à décembre)",
    chartAria: "Courbe de saisonnalité du revenu par mois",
    tooltipPercentLabel: "du revenu annuel",
    replicateTitle: "Appliquer la même saisonnalité aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, chaque année qui comporte déjà une hypothèse pour ce poste reprendra la même répartition mensuelle (%) que ${year}.`,
    projectionLegend: "Projection",
  },
  depense: {
    distributionTitle: "Saisonnalité",
    chartAria: "Courbe de saisonnalité de la dépense par mois",
    tooltipPercentLabel: "de la dépense annuelle",
    replicateTitle: "Appliquer la même saisonnalité aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, la même répartition mensuelle (%) que ${year} sera enregistrée sur chaque année projetée suivante.`,
    projectionLegend: "Dépense",
  },
  capex: {
    distributionTitle: "Saisonnalité",
    chartAria: "Courbe de saisonnalité du capex par mois",
    tooltipPercentLabel: "du capex annuel",
    replicateTitle: "Appliquer la même saisonnalité aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, la même répartition mensuelle (%) que ${year} sera enregistrée sur chaque année projetée suivante.`,
    projectionLegend: "Capex",
  },
  decaissement: {
    distributionTitle: "Calendrier de décaissement",
    chartAria: "Calendrier de décaissement par mois",
    tooltipPercentLabel: "du décaissement annuel",
    replicateTitle: "Appliquer le même calendrier aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, chaque année qui comporte déjà une hypothèse pour ce poste reprendra le même calendrier mensuel (%) que ${year}.`,
    projectionLegend: "Décaissement",
  },
}

export type ForecastSeasonalityOverlayLine = {
  key: string
  label: string
  monthPercents: number[]
  color: string
  dashed?: boolean
}

export type ForecastSeasonalityEditorProps = {
  variant: ForecastSeasonalityEditorVariant
  embedded?: boolean
  yearLabel: string
  followingYearsLabel: string
  canReplicateToFollowingYears: boolean
  replicateToFollowingYears: boolean
  onReplicateChange: (on: boolean) => void
  replicateCheckboxId: string
  monthPercents: number[]
  onMonthPercentsChange: (next: number[]) => void
  /** Courbes en lecture seule (ex. exercices réels, saisonnalité des revenus liés). */
  overlayLines?: ForecastSeasonalityOverlayLine[]
  /** @deprecated Préférer `overlayLines`. Courbe unique (dépenses variables). */
  overlayLine?: {
    monthPercents: number[]
    label: string
  }
  /** Contenu affiché après la case « appliquer aux années suivantes » (ex. lien revenus). */
  afterReplicate?: ReactNode
  /** Copie rapide de la saisonnalité du revenu de référence (dépenses variables). */
  linkedRevenueSeasonalityApply?: {
    label: string
    monthPercents: number[]
  }
  /** Presets à copier sur la saisonnalité projetée (ex. 2024, 2025, moyenne). */
  applySeasonalityPresets?: {
    key: string
    label: string
    monthPercents: number[]
    disabled?: boolean
  }[]
  /** Montants $ mensuels sous la grille des % (ex. Revenus répartis). */
  monthlyAmountRow?: {
    label: string
    values: number[] | null
    formatValue: (n: number) => string
    unavailableHint?: string
  }
  /** Plusieurs lignes de montants (ex. Dépenses / Ajustement / Avec ajustement). Prioritaire sur `monthlyAmountRow`. */
  monthlyAmountRows?: {
    label: string
    values: number[] | null
    formatValue: (n: number) => string
    testId?: string
  }[]
  /** Libellé de la courbe éditable (défaut selon le variant). */
  projectionLegendOverride?: string
  /** Dépenses variables : coûts engagés avant les revenus liés. */
  showPreRevenueNeed?: boolean
  preRevenueNeedEnabled?: boolean
  onPreRevenueNeedEnabledChange?: (enabled: boolean) => void
  preRevenueAdvanceDays?: number
  onPreRevenueAdvanceDaysChange?: (days: number) => void
  preRevenueCheckboxId?: string
  /** Mode compact (ex. répartition d’un ajustement $) : pas de réplication ni actions secondaires. */
  compact?: boolean
  /** Autorise des mois à 0 % sans renormaliser (utile pour mettre 100 % sur un seul mois). */
  allowZeroMonthPercents?: boolean
}

export function ForecastSeasonalityEditor({
  variant,
  embedded,
  yearLabel,
  followingYearsLabel,
  canReplicateToFollowingYears,
  replicateToFollowingYears,
  onReplicateChange,
  replicateCheckboxId,
  monthPercents,
  onMonthPercentsChange,
  overlayLines,
  overlayLine,
  afterReplicate,
  linkedRevenueSeasonalityApply,
  applySeasonalityPresets,
  monthlyAmountRow,
  monthlyAmountRows,
  projectionLegendOverride,
  showPreRevenueNeed = false,
  preRevenueNeedEnabled = false,
  onPreRevenueNeedEnabledChange,
  preRevenueAdvanceDays = 30,
  onPreRevenueAdvanceDaysChange,
  preRevenueCheckboxId = "forecast-pre-revenue-need",
  compact = false,
  allowZeroMonthPercents = false,
}: ForecastSeasonalityEditorProps) {
  const copy = VARIANT_COPY[variant]
  const projectionLegend = projectionLegendOverride ?? copy.projectionLegend
  const resolvedAmountRows = useMemo(() => {
    if (monthlyAmountRows && monthlyAmountRows.length > 0) return monthlyAmountRows
    if (monthlyAmountRow) {
      return [
        {
          label: monthlyAmountRow.label,
          values: monthlyAmountRow.values,
          formatValue: monthlyAmountRow.formatValue,
          testId: "forecast-seasonality-amount-row",
        },
      ]
    }
    return []
  }, [monthlyAmountRows, monthlyAmountRow])
  const hasAmountTable = resolvedAmountRows.length > 0
  const resolvedOverlayLines = useMemo((): ForecastSeasonalityOverlayLine[] => {
    if (overlayLines && overlayLines.length > 0) return overlayLines
    if (overlayLine) {
      return [
        {
          key: "overlay",
          label: overlayLine.label,
          monthPercents: overlayLine.monthPercents,
          color: FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE,
          dashed: true,
        },
      ]
    }
    return []
  }, [overlayLines, overlayLine])
  const preRevenueShiftActive =
    variant === "depense" && showPreRevenueNeed && preRevenueNeedEnabled
  const displayMonthPercents = useMemo(() => {
    const base = allowZeroMonthPercents
      ? clampForecastSeasonalityMonthPercents(monthPercents)
      : normalizeForecastSeasonalityMonthPercents(monthPercents)
    if (preRevenueShiftActive) {
      return shiftSeasonalityEarlierForPreRevenue(base, preRevenueAdvanceDays)
    }
    return base
  }, [monthPercents, preRevenueShiftActive, preRevenueAdvanceDays, allowZeroMonthPercents])
  const seasonalityTotal = displayMonthPercents.reduce((a, b) => a + b, 0)
  const chartData = useMemo(
    () =>
      FORECAST_SEASONALITY_MONTH_LABELS.map((name, idx) => {
        const overlays: Record<string, number> = {}
        for (const line of resolvedOverlayLines) {
          overlays[`overlay_${line.key}`] = Math.max(0, Math.round(line.monthPercents[idx] ?? 0))
        }
        return {
          key: `sea-${idx}`,
          name,
          percent: Math.max(0, Math.round(displayMonthPercents[idx] ?? 0)),
          ...overlays,
        }
      }),
    [displayMonthPercents, resolvedOverlayLines]
  )
  const seasonHistColCount = 12
  const seasonLabelCol = hasAmountTable ? "minmax(5.5rem, 7.5rem)" : "3.25rem"
  const seasonGridTemplate = `${seasonLabelCol} repeat(${seasonHistColCount}, minmax(2.25rem, 1fr))`
  const { yMax: seasonalityYMax, ticks: seasonalityYTicks } = useMemo(() => {
    const values = chartData.map((e) => e.percent)
    for (const line of resolvedOverlayLines) {
      for (let i = 0; i < 12; i++) values.push(Math.max(0, Math.round(line.monthPercents[i] ?? 0)))
    }
    return computeForecastSeasonalityChartYScale(values)
  }, [chartData, resolvedOverlayLines])
  const [appliedSeasonalityPresetKey, setAppliedSeasonalityPresetKey] = useState<string | null>(
    null
  )
  const matchedSeasonalityPreset = useMemo(() => {
    if (!applySeasonalityPresets?.length) return null
    if (appliedSeasonalityPresetKey) {
      const applied = applySeasonalityPresets.find(
        (preset) => preset.key === appliedSeasonalityPresetKey && preset.disabled !== true
      )
      if (applied) return applied
    }
    const matching = applySeasonalityPresets.filter(
      (preset) =>
        preset.disabled !== true &&
        forecastSeasonalityPercentsMatch(preset.monthPercents, monthPercents)
    )
    return matching.find((preset) => preset.key === "average") ?? matching[0] ?? null
  }, [applySeasonalityPresets, appliedSeasonalityPresetKey, monthPercents])
  const seasonalityLineData = useMemo(
    () =>
      chartData.map((e, i) => {
        const row: Record<string, string | number> = {
          axisLabel: FORECAST_SEASONALITY_AXIS_LABELS[i] ?? `M${i + 1}`,
          monthName: e.name,
          percent: e.percent,
        }
        for (const line of resolvedOverlayLines) {
          row[`overlay_${line.key}`] = e[`overlay_${line.key}`] ?? 0
        }
        return row
      }),
    [chartData, resolvedOverlayLines]
  )
  const seasonalityXBandScale = useMemo(() => createForecastSeasonalityBandXScale(), [])

  const setMonthAt = (colIdx: number, value: number) => {
    setAppliedSeasonalityPresetKey(null)
    onMonthPercentsChange(
      (() => {
        const next =
          monthPercents.length === 12
            ? [...monthPercents]
            : [...createDefaultForecastSeasonalityMonthPercents()]
        const baseIdx = preRevenueShiftActive
          ? seasonalityDisplayColumnToBaseIndex(colIdx, preRevenueAdvanceDays)
          : colIdx
        next[baseIdx] = value
        return allowZeroMonthPercents
          ? clampForecastSeasonalityMonthPercents(next)
          : normalizeForecastSeasonalityMonthPercents(next)
      })()
    )
  }

  return (
    <div className={cn(embedded && "min-w-0 max-w-full")}>
      {!compact ? (
      <div className={cn("space-y-6", afterReplicate ? "mb-6" : "mb-3")}>
        {canReplicateToFollowingYears ? (
          <div className="flex min-w-0 items-start gap-2.5">
            <Checkbox
              id={replicateCheckboxId}
              checked={replicateToFollowingYears}
              onCheckedChange={(v) => onReplicateChange(v === true)}
              className="mt-0.5"
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Label
                htmlFor={replicateCheckboxId}
                className="cursor-pointer text-xs font-medium leading-snug text-slate-800"
              >
                {copy.replicateTitle}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400/40"
                    aria-label="Information sur la réplication de la saisonnalité"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="max-w-[280px] border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-md"
                >
                  {copy.replicateDescription(followingYearsLabel, yearLabel)}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Aucune année projetée après {yearLabel}.</p>
        )}
        {showPreRevenueNeed && variant === "depense" ? (
          <div className="space-y-2.5 rounded-lg border border-blue-100/90 bg-blue-50/40 px-3 py-2.5">
            <div className="flex min-w-0 items-start gap-2.5">
              <Checkbox
                id={preRevenueCheckboxId}
                checked={preRevenueNeedEnabled}
                onCheckedChange={(v) => onPreRevenueNeedEnabledChange?.(v === true)}
                className="mt-0.5"
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                <Label
                  htmlFor={preRevenueCheckboxId}
                  className="cursor-pointer text-xs font-medium leading-snug text-slate-800"
                >
                  Dépenses effectuées avant la réalisation des revenus
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400/40"
                      aria-label="Information sur les dépenses avant la réalisation des revenus"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-[300px] border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-md"
                  >
                    Certains coûts variables, comme l&apos;inventaire, doivent être engagés avant la réalisation des
                    revenus. Le système calcule automatiquement le moment du décaissement selon le délai
                    d&apos;approvisionnement et les modalités de paiement fournisseur.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            {preRevenueNeedEnabled ? (
              <div className="flex flex-col gap-1.5 pl-6 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-[11px] font-medium text-slate-600">Avance avant le mois de charge</span>
                <Select
                  value={String(clampPreRevenueAdvanceDays(preRevenueAdvanceDays))}
                  onValueChange={(v) => onPreRevenueAdvanceDaysChange?.(clampPreRevenueAdvanceDays(Number(v)))}
                >
                  <SelectTrigger className="h-8 w-full max-w-[10rem] border-slate-200 bg-white text-xs sm:w-[10rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_PRE_REVENUE_ADVANCE_DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)} className="text-xs">
                        {labelForCollectionDelayDays(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        ) : null}
        {afterReplicate ? <div>{afterReplicate}</div> : null}
      </div>
      ) : null}
      <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <span className="font-medium text-slate-800">
              {compact
                ? "Répartition de l'ajustement par mois (janvier à décembre)"
                : copy.distributionTitle}
            </span>
            {preRevenueShiftActive ? (
              <p className="text-[11px] leading-relaxed text-blue-800">
                Répartition décalée de {preRevenueAdvanceDays} jours (
                {seasonalityAdvanceToMonthOffset(preRevenueAdvanceDays)} mois vers le début de l&apos;année).
              </p>
            ) : null}
            {resolvedOverlayLines.length > 0 ? (
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600"
                data-testid="forecast-seasonality-legend"
              >
                {resolvedOverlayLines.map((line) => (
                  <span key={line.key} className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-0.5 w-5 rounded-full"
                      style={{
                        backgroundColor: line.color,
                        backgroundImage:
                          line.dashed === false
                            ? undefined
                            : `repeating-linear-gradient(90deg, ${line.color} 0, ${line.color} 4px, transparent 4px, transparent 7px)`,
                      }}
                      aria-hidden
                    />
                    {line.label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-5 rounded-full"
                    style={{ backgroundColor: FORECAST_SEASONALITY_CHART_SLATE }}
                    aria-hidden
                  />
                  {projectionLegend}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col items-stretch gap-1 sm:items-end sm:text-right">
            <p className="text-xs tabular-nums text-slate-600">Total des pourcentages : {seasonalityTotal} %</p>
            {seasonalityTotal !== 100 ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                Le total doit être égal à 100 % (actuellement {seasonalityTotal} %).
              </p>
            ) : null}
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-200/80 bg-white">
          <div
            className="min-w-0 w-full"
            style={{
              minWidth: hasAmountTable
                ? `max(100%, calc(7.5rem + ${seasonHistColCount} * 2.75rem))`
                : `max(100%, calc(3.25rem + ${seasonHistColCount} * 2.75rem))`,
            }}
          >
            <div
              className="grid min-w-0 divide-x divide-slate-200 border-b border-slate-200 bg-white"
              style={{ gridTemplateColumns: seasonGridTemplate }}
            >
              <div className="flex h-52 w-full min-w-0 flex-col items-stretch justify-between bg-white py-3 sm:h-56">
                <div className="flex w-full min-w-0 flex-1 flex-col justify-between py-0.5">
                  {seasonalityYTicks.map((tick) => (
                    <span
                      key={`sea-y-${tick}`}
                      className="block w-full min-w-0 text-right text-[9px] tabular-nums leading-none text-slate-500 sm:text-[10px]"
                    >
                      {tick}%
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-start-2 col-span-12 h-52 min-h-0 min-w-0 bg-white sm:h-56">
                <ChartContainer
                  config={{
                    percent: {
                      label: projectionLegend,
                      color: FORECAST_SEASONALITY_CHART_SLATE,
                    },
                    ...Object.fromEntries(
                      resolvedOverlayLines.map((line) => [
                        `overlay_${line.key}`,
                        { label: line.label, color: line.color },
                      ])
                    ),
                  }}
                  className="h-full w-full min-w-0 !aspect-auto !justify-start [&_.recharts-responsive-container]:w-full"
                  aria-label={copy.chartAria}
                >
                  <LineChart
                    accessibilityLayer
                    data={seasonalityLineData}
                    margin={{ top: 8, right: 0, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="axisLabel"
                      type="category"
                      scale={seasonalityXBandScale}
                      tick={false}
                      tickLine={false}
                      axisLine={false}
                      height={0}
                      interval={0}
                    />
                    <YAxis domain={[0, seasonalityYMax]} hide width={0} />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const row = payload[0]?.payload as
                          | ({ monthName?: string; percent?: number } & Record<string, number | string | undefined>)
                          | undefined
                        const pct = Number(row?.percent ?? 0)
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold text-slate-900">{row?.monthName ?? "—"}</p>
                            {resolvedOverlayLines.map((line) => (
                              <p
                                key={line.key}
                                className="mt-0.5 tabular-nums"
                                style={{ color: line.color }}
                              >
                                {Math.round(Number(row?.[`overlay_${line.key}`] ?? 0))} % {line.label}
                              </p>
                            ))}
                            <p className="mt-0.5 tabular-nums text-slate-700">
                              {Math.round(pct)} % {projectionLegend}
                            </p>
                          </div>
                        )
                      }}
                    />
                    {resolvedOverlayLines.map((line) => (
                      <Line
                        key={line.key}
                        type="monotone"
                        dataKey={`overlay_${line.key}`}
                        name={line.label}
                        stroke={line.color}
                        strokeWidth={2}
                        strokeDasharray={line.dashed === false ? undefined : "6 4"}
                        dot={{
                          fill: line.color,
                          r: 3,
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                        isAnimationActive={false}
                      />
                    ))}
                    <Line
                      type="monotone"
                      dataKey="percent"
                      name={projectionLegend}
                      stroke="var(--color-percent)"
                      strokeWidth={2.5}
                      dot={{ fill: "var(--color-percent)", r: 4, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
            <div
              className="grid min-w-0 divide-x divide-slate-200 bg-white"
              style={{ gridTemplateColumns: seasonGridTemplate }}
            >
              <div className="flex w-full items-start justify-end bg-white py-2.5 pr-1 sm:pr-1.5">
                <span className="relative inline-block text-[9px] tabular-nums sm:text-[10px]">
                  <span className="invisible select-none" aria-hidden="true">
                    100%
                  </span>
                  <span className="absolute right-0 top-0 font-medium leading-none text-slate-400">%</span>
                </span>
              </div>
              {chartData.map((entry, colIdx) => (
                <div
                  key={`sea-col-${entry.key}`}
                  className="flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 sm:px-1"
                >
                  <span
                    className="w-full text-center text-[10px] font-semibold leading-tight text-slate-700"
                    title={entry.name}
                  >
                    {FORECAST_SEASONALITY_AXIS_LABELS[colIdx] ?? `M${colIdx + 1}`}
                  </span>
                  <div className="flex w-full items-center justify-center gap-0.5">
                    <Input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Pourcentage pour ${entry.name}`}
                      className="h-8 w-full max-w-[2.75rem] rounded border border-slate-200 bg-white px-0.5 text-center text-[11px] tabular-nums"
                      value={String(displayMonthPercents[colIdx] ?? 0)}
                      onChange={(e) => {
                        const raw = e.target.value.trim()
                        if (raw === "") {
                          setMonthAt(colIdx, 0)
                          return
                        }
                        const p = parsePercentInput(e.target.value)
                        if (p === null) return
                        setMonthAt(colIdx, Math.round(Math.max(0, Math.min(100, p))))
                      }}
                    />
                    <span className="text-[10px] font-medium text-slate-500">%</span>
                  </div>
                </div>
              ))}
            </div>
            {resolvedAmountRows.map((row, rowIdx) =>
              row.values && row.values.length === 12 ? (
                <div
                  key={`amt-row-${row.testId ?? row.label}-${rowIdx}`}
                  className="grid min-w-0 divide-x divide-slate-200 border-t border-slate-200 bg-white"
                  style={{ gridTemplateColumns: seasonGridTemplate }}
                  data-testid={row.testId ?? (rowIdx === 0 ? "forecast-seasonality-amount-row" : undefined)}
                >
                  <div className="flex min-h-[2.75rem] shrink-0 items-center justify-end overflow-visible bg-white px-1 py-2 sm:px-1.5">
                    <span className="text-right text-[10px] font-semibold leading-snug text-slate-700 sm:text-xs">
                      {row.label}
                    </span>
                  </div>
                  {row.values.map((amount, colIdx) => (
                    <div
                      key={`amt-col-${rowIdx}-${colIdx}`}
                      className="flex min-h-[2.75rem] min-w-0 items-center justify-center px-0.5 py-2 sm:px-1"
                    >
                      <span className="w-full text-center text-[10px] font-medium tabular-nums leading-tight text-slate-700 sm:text-[11px]">
                        {row.formatValue(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null
            )}
            {resolvedAmountRows.length === 0 && monthlyAmountRow?.unavailableHint ? (
              <p
                className="border-t border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-900"
                data-testid="forecast-seasonality-amount-row"
              >
                {monthlyAmountRow.unavailableHint}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowZeroMonthPercents ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-md text-xs"
              data-testid="forecast-seasonality-zero-all"
              onClick={() => {
                setAppliedSeasonalityPresetKey(null)
                onMonthPercentsChange(createZeroForecastSeasonalityMonthPercents())
              }}
            >
              Tout à 0 %
            </Button>
          ) : null}          {!compact && applySeasonalityPresets && applySeasonalityPresets.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 max-w-full rounded-md text-xs",
                    matchedSeasonalityPreset &&
                      "border-slate-400 bg-slate-50 font-medium text-slate-900"
                  )}
                  data-testid="apply-seasonality-preset"
                  aria-label={
                    matchedSeasonalityPreset
                      ? `Saisonnalité appliquée : ${matchedSeasonalityPreset.label}`
                      : "Appliquer une saisonnalité"
                  }
                >
                  <span className="truncate">
                    {matchedSeasonalityPreset
                      ? matchedSeasonalityPreset.label
                      : "Appliquer une saisonnalité"}
                  </span>
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[14rem]">
                <DropdownMenuRadioGroup value={matchedSeasonalityPreset?.key ?? ""}>
                  {applySeasonalityPresets.map((preset) => (
                    <DropdownMenuRadioItem
                      key={preset.key}
                      value={preset.key}
                      disabled={preset.disabled === true}
                      className="text-xs"
                      onSelect={() => {
                        if (preset.disabled) return
                        setAppliedSeasonalityPresetKey(preset.key)
                        onMonthPercentsChange(
                          normalizeForecastSeasonalityMonthPercents(preset.monthPercents)
                        )
                      }}
                    >
                      {preset.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {linkedRevenueSeasonalityApply && !compact ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-md border-blue-200 bg-blue-50/80 text-xs font-medium text-blue-900 hover:bg-blue-100/90"
              title={linkedRevenueSeasonalityApply.label}
              onClick={() => {
                setAppliedSeasonalityPresetKey(null)
                onMonthPercentsChange(
                  normalizeForecastSeasonalityMonthPercents(
                    linkedRevenueSeasonalityApply.monthPercents
                  )
                )
              }}
            >
              Appliquer la saisonnalité des revenus
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-md text-xs"
            onClick={() =>
              onMonthPercentsChange(normalizeForecastSeasonalityMonthPercents(monthPercents))
            }
          >
            Normaliser à 100 %
          </Button>
          {!compact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-md text-xs"
            onClick={() => {
              setAppliedSeasonalityPresetKey(null)
              onMonthPercentsChange(createDefaultForecastSeasonalityMonthPercents())
            }}
          >
            Répartition uniforme sur 12 mois
          </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
