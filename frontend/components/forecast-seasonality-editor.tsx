"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createDefaultForecastSeasonalityMonthPercents,
  createForecastSeasonalityBandXScale,
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
  clampPreRevenueAdvanceDays,
  labelForCollectionDelayDays,
  parsePercentInput,
  STANDARD_PRE_REVENUE_ADVANCE_DAYS,
} from "@/lib/forecast-collection-cash-utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AlertTriangle, Info } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

export type ForecastSeasonalityEditorVariant = "revenu" | "depense" | "capex" | "decaissement"

const VARIANT_COPY: Record<
  ForecastSeasonalityEditorVariant,
  {
    distributionTitle: string
    chartAria: string
    tooltipPercentLabel: string
    replicateTitle: string
    replicateDescription: (followingYears: string, yearLabel: string) => string
  }
> = {
  revenu: {
    distributionTitle: "Répartition du revenu annuel par mois (janvier à décembre)",
    chartAria: "Courbe de saisonnalité du revenu par mois",
    tooltipPercentLabel: "du revenu annuel",
    replicateTitle: "Appliquer la même saisonnalité aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, chaque année qui comporte déjà une hypothèse pour ce poste reprendra la même répartition mensuelle (%) que ${year}.`,
  },
  depense: {
    distributionTitle: "Saisonnalité",
    chartAria: "Courbe de saisonnalité de la dépense par mois",
    tooltipPercentLabel: "de la dépense annuelle",
    replicateTitle: "Appliquer la même saisonnalité aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, la même répartition mensuelle (%) que ${year} sera enregistrée sur chaque année projetée suivante.`,
  },
  capex: {
    distributionTitle: "Saisonnalité",
    chartAria: "Courbe de saisonnalité du capex par mois",
    tooltipPercentLabel: "du capex annuel",
    replicateTitle: "Appliquer la même saisonnalité aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, la même répartition mensuelle (%) que ${year} sera enregistrée sur chaque année projetée suivante.`,
  },
  decaissement: {
    distributionTitle: "Calendrier de décaissement",
    chartAria: "Calendrier de décaissement par mois",
    tooltipPercentLabel: "du décaissement annuel",
    replicateTitle: "Appliquer le même calendrier aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, chaque année qui comporte déjà une hypothèse pour ce poste reprendra le même calendrier mensuel (%) que ${year}.`,
  },
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
  /** Courbe en lecture seule (ex. saisonnalité des revenus liés pour une dépense variable). */
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
  /** Dépenses variables : coûts engagés avant les revenus liés. */
  showPreRevenueNeed?: boolean
  preRevenueNeedEnabled?: boolean
  onPreRevenueNeedEnabledChange?: (enabled: boolean) => void
  preRevenueAdvanceDays?: number
  onPreRevenueAdvanceDaysChange?: (days: number) => void
  preRevenueCheckboxId?: string
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
  overlayLine,
  afterReplicate,
  linkedRevenueSeasonalityApply,
  showPreRevenueNeed = false,
  preRevenueNeedEnabled = false,
  onPreRevenueNeedEnabledChange,
  preRevenueAdvanceDays = 30,
  onPreRevenueAdvanceDaysChange,
  preRevenueCheckboxId = "forecast-pre-revenue-need",
}: ForecastSeasonalityEditorProps) {
  const copy = VARIANT_COPY[variant]
  const preRevenueShiftActive =
    variant === "depense" && showPreRevenueNeed && preRevenueNeedEnabled
  const displayMonthPercents = useMemo(() => {
    const base = normalizeForecastSeasonalityMonthPercents(monthPercents)
    if (preRevenueShiftActive) {
      return shiftSeasonalityEarlierForPreRevenue(base, preRevenueAdvanceDays)
    }
    return base
  }, [monthPercents, preRevenueShiftActive, preRevenueAdvanceDays])
  const seasonalityTotal = displayMonthPercents.reduce((a, b) => a + b, 0)
  const overlayPercents = overlayLine?.monthPercents
  const chartData = useMemo(
    () =>
      FORECAST_SEASONALITY_MONTH_LABELS.map((name, idx) => ({
        key: `sea-${idx}`,
        name,
        percent: Math.max(0, Math.round(displayMonthPercents[idx] ?? 0)),
        overlayPercent: overlayPercents
          ? Math.max(0, Math.round(overlayPercents[idx] ?? 0))
          : undefined,
      })),
    [displayMonthPercents, overlayPercents]
  )
  const seasonHistColCount = 12
  const seasonGridTemplate = `3.25rem repeat(${seasonHistColCount}, minmax(2.25rem, 1fr))`
  const { yMax: seasonalityYMax, ticks: seasonalityYTicks } = useMemo(() => {
    const values = chartData.map((e) => e.percent)
    if (overlayPercents?.length) {
      for (let i = 0; i < 12; i++) values.push(Math.max(0, Math.round(overlayPercents[i] ?? 0)))
    }
    return computeForecastSeasonalityChartYScale(values)
  }, [chartData, overlayPercents])
  const seasonalityLineData = useMemo(
    () =>
      chartData.map((e, i) => ({
        axisLabel: FORECAST_SEASONALITY_AXIS_LABELS[i] ?? `M${i + 1}`,
        monthName: e.name,
        percent: e.percent,
        overlayPercent: e.overlayPercent,
      })),
    [chartData]
  )
  const seasonalityXBandScale = useMemo(() => createForecastSeasonalityBandXScale(), [])

  const setMonthAt = (colIdx: number, value: number) => {
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
        return normalizeForecastSeasonalityMonthPercents(next)
      })()
    )
  }

  return (
    <div className={cn(embedded && "min-w-0 max-w-full")}>
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
      <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1.5">
            <span className="font-medium text-slate-800">{copy.distributionTitle}</span>
            {preRevenueShiftActive ? (
              <p className="text-[11px] leading-relaxed text-blue-800">
                Répartition décalée de {preRevenueAdvanceDays} jours (
                {seasonalityAdvanceToMonthOffset(preRevenueAdvanceDays)} mois vers le début de l&apos;année).
              </p>
            ) : null}
            {overlayLine ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-5 rounded-full"
                    style={{ backgroundColor: FORECAST_SEASONALITY_CHART_SLATE }}
                    aria-hidden
                  />
                  Dépense
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-5 rounded-full"
                    style={{ backgroundColor: FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE }}
                    aria-hidden
                  />
                  {overlayLine.label}
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
              minWidth: `max(100%, calc(3.25rem + ${seasonHistColCount} * 2.75rem))`,
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
                      label: "Part annuelle",
                      color: FORECAST_SEASONALITY_CHART_SLATE,
                    },
                    overlayPercent: {
                      label: overlayLine?.label ?? "Revenus liés",
                      color: FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE,
                    },
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
                          | { monthName?: string; percent?: number; overlayPercent?: number }
                          | undefined
                        const pct = row?.percent ?? 0
                        const overlayPct = row?.overlayPercent
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold text-slate-900">{row?.monthName ?? "—"}</p>
                            <p className="mt-0.5 tabular-nums text-slate-700">
                              {Math.round(pct)} % {copy.tooltipPercentLabel}
                            </p>
                            {overlayLine && overlayPct !== undefined ? (
                              <p className="mt-0.5 tabular-nums text-blue-700">
                                {Math.round(overlayPct)} % {overlayLine.label}
                              </p>
                            ) : null}
                          </div>
                        )
                      }}
                    />
                    {overlayLine ? (
                      <Line
                        type="monotone"
                        dataKey="overlayPercent"
                        name="overlayPercent"
                        stroke="var(--color-overlayPercent)"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{
                          fill: "var(--color-overlayPercent)",
                          r: 3.5,
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="percent"
                      name="percent"
                      stroke="var(--color-percent)"
                      strokeWidth={2.5}
                      dot={{ fill: "var(--color-percent)", r: 4, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
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
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {linkedRevenueSeasonalityApply ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-md border-blue-200 bg-blue-50/80 text-xs font-medium text-blue-900 hover:bg-blue-100/90"
              title={linkedRevenueSeasonalityApply.label}
              onClick={() =>
                onMonthPercentsChange(
                  normalizeForecastSeasonalityMonthPercents(
                    linkedRevenueSeasonalityApply.monthPercents
                  )
                )
              }
            >
              Appliquer la saisonnalité du revenu lié
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-md text-xs"
            onClick={() => onMonthPercentsChange(createDefaultForecastSeasonalityMonthPercents())}
          >
            Répartition uniforme sur 12 mois
          </Button>
        </div>
      </div>
    </div>
  )
}
