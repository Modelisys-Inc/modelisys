"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  buildCollectionCashForSave,
  clampRoundBadDebt,
  collectionBarFill,
  computeCollectionChartYScale,
  labelForCollectionDelayDays,
  normalizeAdvancedBuckets,
  parseDelayDaysInput,
  parsePercentInput,
  type ForecastCollectionBucket,
  weightedCollectionDelayDays,
} from "@/lib/forecast-collection-cash-utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { scaleBand } from "d3-scale"
import { AlertTriangle, Info, Plus, Trash2 } from "lucide-react"
import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts"

export type ForecastCollectionCashEditorVariant = "encaissement" | "decaissement"

const VARIANT_COPY: Record<
  ForecastCollectionCashEditorVariant,
  {
    weightedDelayTitle: string
    summaryLine: (payableSum: number, badDebt: number, total: number) => string
    histogramAria: string
    percentPayableAria: (col: number) => string
    replicateTitle: string
    replicateDescription: (followingYears: string, yearLabel: string) => string
    replicateInfoAriaLabel: string
    equalSplitButton: string
    addRowButton: string
    normalizeButton: string
  }
> = {
  encaissement: {
    weightedDelayTitle: "Délai moyen de collection estimé",
    summaryLine: (_enc, _bd, total) => `Total encaissable : ${total} %`,
    histogramAria: "Histogramme d'encaissement par délai",
    percentPayableAria: (col) => `Pourcentage encaissable, colonne ${col}`,
    replicateTitle: "Appliquer le même délai d'encaissement aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, chaque année qui comporte déjà une hypothèse pour ce poste recevra la même répartition d'encaissement que ${year}.`,
    replicateInfoAriaLabel: "Information sur la réplication de l'encaissement",
    equalSplitButton: "Répartir l'encaissable à parts égales",
    addRowButton: "Ajouter une ligne",
    normalizeButton: "Normaliser à 100 %",
  },
  decaissement: {
    weightedDelayTitle: "Délai moyen de paiement estimé",
    summaryLine: (_payable, _bd, total) => `Total décaissable : ${total} %`,
    histogramAria: "Histogramme de décaissement par délai",
    percentPayableAria: (col) => `Pourcentage décaissable, colonne ${col}`,
    replicateTitle: "Appliquer le même délai de décaissement aux années suivantes",
    replicateDescription: (following, year) =>
      `Pour ${following}, chaque année qui comporte déjà une hypothèse pour ce poste recevra la même répartition de décaissement que ${year}.`,
    replicateInfoAriaLabel: "Information sur la réplication du décaissement",
    equalSplitButton: "Répartir le décaissable à parts égales",
    addRowButton: "Ajouter une ligne",
    normalizeButton: "Normaliser à 100 %",
  },
}

const BAR_BAND_FRACTION = 0.15

function renderCollectionBarShape(
  props: Record<string, unknown> & {
    x?: number
    y?: number
    width?: number
    height?: number
    payload?: { barFill?: string }
  }
) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const bandW = Number(props.width ?? 0)
  const h = Number(props.height ?? 0)
  if (!Number.isFinite(bandW) || !Number.isFinite(h) || bandW <= 0 || h <= 0) return null
  const w = Math.max(2, bandW * BAR_BAND_FRACTION)
  const fill =
    typeof props.payload === "object" && props.payload && "barFill" in props.payload
      ? String((props.payload as { barFill?: string }).barFill)
      : collectionBarFill(false)
  return <Rectangle x={x + (bandW - w) / 2} y={y} width={w} height={h} fill={fill} radius={[3, 3, 0, 0]} />
}

export type ForecastCollectionCashEditorProps = {
  variant: ForecastCollectionCashEditorVariant
  embedded?: boolean
  yearLabel: string
  followingYearsLabel: string
  canReplicateToFollowingYears: boolean
  replicateToFollowingYears: boolean
  onReplicateChange: (checked: boolean) => void
  replicateCheckboxId: string
  /** Conservé pour compatibilité ; toujours ignoré (encaissement à 100 %). */
  badDebtPercent?: number
  onBadDebtPercentChange?: (value: number) => void
  buckets: ForecastCollectionBucket[]
  onBucketsChange: (updater: (prev: ForecastCollectionBucket[]) => ForecastCollectionBucket[]) => void
  customDelayDrafts: Record<number, string>
  onCustomDelayDraftsChange: (
    updater: (prev: Record<number, string>) => Record<number, string>
  ) => void
  /** Dépenses variables : besoin de trésorerie avant le mois de revenus liés. */
  showPreRevenueNeed?: boolean
  preRevenueNeedEnabled?: boolean
  onPreRevenueNeedEnabledChange?: (enabled: boolean) => void
  preRevenueAdvanceDays?: number
  onPreRevenueAdvanceDaysChange?: (days: number) => void
  preRevenueCheckboxId?: string
}

export function ForecastCollectionCashEditor({
  variant,
  embedded = false,
  yearLabel,
  followingYearsLabel,
  canReplicateToFollowingYears,
  replicateToFollowingYears,
  onReplicateChange,
  replicateCheckboxId,
  buckets,
  onBucketsChange,
  customDelayDrafts,
  onCustomDelayDraftsChange,
}: ForecastCollectionCashEditorProps) {
  const copy = VARIANT_COPY[variant]
  const normalizeBadDebt = 0

  const payableSum = buckets.reduce((a, b) => a + b.percent, 0)
  const grandTotal = payableSum
  const sortedWithIndex = [...buckets]
    .map((bucket, origIdx) => ({ bucket, origIdx }))
    .sort((a, b) => a.bucket.delayDays - b.bucket.delayDays || a.origIdx - b.origIdx)

  const histogramChartData = useMemo(
    () =>
      sortedWithIndex.map(({ bucket, origIdx }) => ({
        key: `h-${variant}-${origIdx}`,
        name: labelForCollectionDelayDays(bucket.delayDays),
        percent: Math.max(0, Math.round(bucket.percent)),
        delayDays: bucket.delayDays,
      })),
    [sortedWithIndex, variant]
  )

  const weightedDelay = weightedCollectionDelayDays(buckets)
  const weightedLabel =
    weightedDelay % 1 === 0 ? `${Math.round(weightedDelay)} j` : `${String(weightedDelay).replace(".", ",")} j`

  const colCount = Math.max(histogramChartData.length, 1)
  const gridTemplate = `3.25rem repeat(${colCount}, minmax(4rem, 1fr))`
  const { yMax, ticks } = computeCollectionChartYScale(histogramChartData.map((e) => e.percent))
  const barRechartsData = histogramChartData.map((entry) => ({
    barKey: entry.key,
    label: entry.name,
    percent: entry.percent,
    barFill: collectionBarFill(false),
  }))
  const barXScale = scaleBand<string>()
    .domain(histogramChartData.map((e) => e.key))
    .paddingInner(0)
    .paddingOuter(0)

  const setBuckets = (updater: (prev: ForecastCollectionBucket[]) => ForecastCollectionBucket[]) =>
    onBucketsChange(updater)

  return (
    <div className={cn(embedded && "min-w-0 max-w-full")}>
      {canReplicateToFollowingYears ? (
        <div className="mb-3 flex min-w-0 items-start gap-2.5">
          <Checkbox
            id={replicateCheckboxId}
            checked={replicateToFollowingYears}
            onCheckedChange={(v) => onReplicateChange(v === true)}
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Label htmlFor={replicateCheckboxId} className="cursor-pointer text-xs font-medium leading-snug text-slate-800">
              {copy.replicateTitle}
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-full text-slate-400 outline-none transition-colors hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400/40"
                  aria-label={copy.replicateInfoAriaLabel}
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
        <p className="mb-3 text-xs text-slate-400">Aucune année projetée après {yearLabel}.</p>
      )}

      <div className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="font-medium text-slate-800">
            {copy.weightedDelayTitle} :{" "}
            <span className="tabular-nums text-slate-900">{weightedLabel}</span>
          </span>
          <div className="flex min-w-0 max-w-full flex-col items-stretch gap-1 sm:items-end sm:text-right">
            <p className="text-xs tabular-nums text-slate-600">
              {copy.summaryLine(payableSum, badDebtPercent, grandTotal)}
            </p>
            {grandTotal !== 100 ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                Le total doit être égal à 100 % (actuellement {grandTotal} %).
              </p>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200/80 bg-white">
          <div
            className="min-w-0 w-full"
            style={{ minWidth: `max(100%, calc(3.25rem + ${colCount} * 4.5rem))` }}
          >
            {histogramChartData.length > 0 ? (
              <>
                <div className="grid min-w-0 divide-x divide-slate-200 border-b border-slate-200 bg-white" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="flex h-52 w-full min-w-0 flex-col items-stretch justify-between bg-white py-3 sm:h-56">
                    <div className="flex w-full min-w-0 flex-1 flex-col justify-between py-0.5">
                      {ticks.map((tick) => (
                        <span
                          key={`coll-y-${tick}`}
                          className="block w-full min-w-0 text-right text-[9px] tabular-nums leading-none text-slate-500 sm:text-[10px]"
                        >
                          {tick}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="h-52 min-h-0 min-w-0 bg-white sm:h-56" style={{ gridColumn: `2 / span ${colCount}` }}>
                    <ChartContainer
                      config={{ percent: { label: "Pourcentage", color: collectionBarFill(false) } }}
                      className="h-full w-full min-w-0 !aspect-auto !justify-start [&_.recharts-responsive-container]:w-full"
                      aria-label={copy.histogramAria}
                    >
                      <BarChart
                        accessibilityLayer
                        data={barRechartsData}
                        margin={{ top: 8, right: 0, left: 0, bottom: 4 }}
                        barCategoryGap={0}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="barKey" type="category" scale={barXScale} tick={false} tickLine={false} axisLine={false} height={0} interval={0} />
                        <YAxis domain={[0, yMax]} hide width={0} />
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const row = payload[0]?.payload as { label?: string; percent?: number } | undefined
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                                <p className="font-semibold text-slate-900">{row?.label ?? "—"}</p>
                                <p className="mt-0.5 tabular-nums text-slate-700">{Math.round(row?.percent ?? 0)} %</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="percent" name="percent" shape={renderCollectionBarShape} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>

                <div className="grid min-w-0 divide-x divide-slate-200 bg-white" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="flex w-full items-start justify-end bg-white py-2.5">
                    <span className="relative inline-block text-[9px] tabular-nums sm:text-[10px]">
                      <span className="invisible select-none" aria-hidden="true">
                        100%
                      </span>
                      <span className="absolute right-0 top-0 font-medium leading-none text-slate-400">%</span>
                    </span>
                  </div>
                  {sortedWithIndex.map(({ bucket, origIdx }, colIdx) => (
                    <div key={`coll-col-${origIdx}`} className="flex min-w-0 flex-col items-center gap-2 px-2 py-2.5 sm:px-2.5">
                      <div className="flex min-h-[2.5rem] w-full flex-col items-center justify-center gap-1 text-center">
                        {bucket.custom ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Délai en jours, colonne ${colIdx + 1}`}
                              className="h-8 min-w-[2.75rem] max-w-[4.5rem] flex-1 rounded border border-slate-200 bg-white px-1 text-center text-xs tabular-nums"
                              value={customDelayDrafts[origIdx] !== undefined ? customDelayDrafts[origIdx]! : String(bucket.delayDays)}
                              onChange={(e) => {
                                onCustomDelayDraftsChange((d) => ({ ...d, [origIdx]: e.target.value }))
                              }}
                              onBlur={() => {
                                const draft = customDelayDrafts[origIdx]
                                onCustomDelayDraftsChange((d) => {
                                  const next = { ...d }
                                  delete next[origIdx]
                                  return next
                                })
                                const raw = (draft !== undefined ? draft : String(bucket.delayDays)).trim()
                                if (raw === "") {
                                  setBuckets((prev) => {
                                    const next = [...prev]
                                    next[origIdx] = { ...next[origIdx]!, delayDays: 0, custom: true }
                                    return next
                                  })
                                  return
                                }
                                const d = parseDelayDaysInput(raw)
                                if (d === null) return
                                setBuckets((prev) => {
                                  const next = [...prev]
                                  next[origIdx] = { ...next[origIdx]!, delayDays: d, custom: true }
                                  return next
                                })
                              }}
                            />
                            <span className="shrink-0 text-[10px] text-slate-600">jours</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold leading-tight text-slate-800 sm:text-xs">
                            {labelForCollectionDelayDays(bucket.delayDays)}
                          </span>
                        )}
                      </div>
                      <div className="flex w-full items-center justify-center gap-0.5">
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={copy.percentPayableAria(colIdx + 1)}
                          className="h-8 w-full max-w-[3.25rem] rounded border border-slate-200 bg-white text-center text-xs tabular-nums"
                          value={String(bucket.percent)}
                          onChange={(e) => {
                            const raw = e.target.value.trim()
                            if (raw === "") {
                              setBuckets((prev) => {
                                const next = [...prev]
                                next[origIdx] = { ...next[origIdx]!, percent: 0 }
                                return next
                              })
                              return
                            }
                            const p = parsePercentInput(e.target.value)
                            if (p === null) return
                            setBuckets((prev) => {
                              const next = [...prev]
                              next[origIdx] = { ...next[origIdx]!, percent: Math.round(p) }
                              return next
                            })
                          }}
                        />
                        <span className="text-[10px] font-medium text-slate-500">%</span>
                      </div>
                      <div className="flex h-8 w-full items-center justify-center">
                        {bucket.custom ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-900"
                            aria-label="Supprimer la ligne"
                            onClick={() => {
                              onCustomDelayDraftsChange(() => ({}))
                              setBuckets((prev) =>
                                normalizeAdvancedBuckets(prev.filter((_, j) => j !== origIdx), normalizeBadDebt)
                              )
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        ) : (
                          <div className="h-8 w-full" aria-hidden />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex min-h-[10rem] items-center justify-center text-xs text-slate-500">Aucune donnée à afficher</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full rounded-md text-xs sm:w-auto"
            onClick={() => {
              setBuckets((prev) => {
                const maxD = prev.reduce((m, b) => Math.max(m, b.delayDays), 0)
                return normalizeAdvancedBuckets(
                  [...prev, { delayDays: Math.min(720, maxD + 30), percent: 0, custom: true }],
                  normalizeBadDebt
                )
              })
            }}
          >
            <Plus className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
            {copy.addRowButton}
          </Button>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-md text-xs sm:h-8 sm:flex-initial"
              onClick={() => setBuckets((prev) => normalizeAdvancedBuckets(prev, normalizeBadDebt))}
            >
              {copy.normalizeButton}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 flex-1 rounded-md text-xs sm:h-8 sm:flex-initial"
              onClick={() => {
                setBuckets((prev) => {
                  const bd = normalizeBadDebt
                  const target = 100 - clampRoundBadDebt(bd)
                  const n = prev.length
                  if (n <= 0) return prev
                  const base = Math.floor(target / n)
                  const rest = target - base * n
                  return normalizeAdvancedBuckets(
                    prev.map((b, i) => ({ ...b, percent: base + (i < rest ? 1 : 0) })),
                    bd
                  )
                })
              }}
            >
              {copy.equalSplitButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Export pour persistance depuis le panneau hypothèses. */
export { buildCollectionCashForSave }
