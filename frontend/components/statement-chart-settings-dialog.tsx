"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getStatementStructure,
  saveStatementChartSlot,
  StaleVersionError,
  type StatementType as ApiStatementType,
} from "@/lib/api"
import {
  collectDistinctLinkCodesFromStructure,
  mapLinkCodesToOwnerLabel,
  normalizeCodeList,
} from "@/lib/income-statement-structure-utils"
import {
  DEFAULT_COLORS,
  defaultChartCardTitle,
  newSeriesId,
  type ChartMetricSpec,
  type ChartSlot,
  type ChartValueFormat,
  type StatementChartConfig,
  type StatementChartSeries,
  type StatementType,
} from "@/lib/statement-chart-config"
import { ChartSeriesColorPicker } from "@/components/chart-series-color-picker"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Eye,
  LineChart,
  PanelLeft,
  Plus,
  Trash2,
  X,
} from "lucide-react"

const EMPTY_SELECT = "__empty__"

function structureHintLabel(t: StatementType): string {
  if (t === "income-statement") return "Sommaire du compte de résultat"
  if (t === "balance-sheet") return "Sommaire du bilan"
  return "Sommaire de la trésorerie"
}

function toggleCodeInList(list: string[], code: string, checked: boolean): string[] {
  const set = new Set(list)
  if (checked) set.add(code)
  else set.delete(code)
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

function labelForCode(labels: Map<string, string> | undefined, code: string): string {
  return labels?.get(code.trim()) ?? ""
}

function summarizeMetricSpec(
  spec: ChartMetricSpec,
  labels: Map<string, string>,
): string {
  if (spec.type === "single") {
    const code = spec.code.trim()
    if (!code) return "Choisir un code de liaison"
    const lbl = labelForCode(labels, code)
    return lbl ? `${code} — ${lbl}` : code
  }
  if (spec.type === "sum") {
    const n = spec.codes.length
    return n > 0 ? `Somme de ${n} code${n > 1 ? "s" : ""}` : "Somme — sélectionnez des codes"
  }
  if (spec.type === "difference") {
    const n = spec.numeratorCodes.length
    const d = spec.denominatorCodes.length
    if (!n && !d) return "Différence — définir num. et dénom."
    return `Différence (${n} − ${d} codes)`
  }
  if (spec.type === "ratio") {
    const n = spec.numeratorCodes.length
    const d = spec.denominatorCodes.length
    const prefix = spec.complement ? "Complément " : ""
    if (!n && !d) return `${prefix}Rapport — définir num. et dénom.`
    return `${prefix}Rapport (${n} ÷ ${d} codes)`
  }
  if (spec.type === "derivedMargin") {
    return "Marge % (bénéfice brut ÷ revenus)"
  }
  return "Source non définie"
}

function CodeCheckboxList({
  codes,
  selected,
  onToggle,
  idPrefix,
  labels,
}: {
  codes: string[]
  selected: string[]
  onToggle: (next: string[]) => void
  idPrefix: string
  labels?: Map<string, string>
}) {
  if (codes.length === 0) {
    return (
      <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs leading-snug text-amber-800">
        Aucun code de liaison dans la structure. Définissez d&apos;abord des codes sur les postes du Sommaire
        (vue Paramètres).
      </p>
    )
  }
  return (
    <ul className="grid max-h-52 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-2 sm:grid-cols-2 lg:max-h-64 lg:grid-cols-3 [scrollbar-width:thin]">
      {codes.map((code) => (
        <li
          key={`${idPrefix}-${code}`}
          className={cn(
            "flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors",
            selected.includes(code) ? "bg-emerald-50/90 ring-1 ring-emerald-200/70" : "hover:bg-slate-50",
          )}
        >
          <Checkbox
            id={`${idPrefix}-${code}`}
            checked={selected.includes(code)}
            onCheckedChange={(v) => onToggle(toggleCodeInList(selected, code, v === true))}
            className="mt-0.5"
          />
          <label htmlFor={`${idPrefix}-${code}`} className="min-w-0 cursor-pointer text-xs leading-snug">
            <span className="font-mono font-medium text-slate-800">{code}</span>
            {labelForCode(labels, code) && (
              <span className="mt-0.5 block text-slate-500">{labelForCode(labels, code)}</span>
            )}
          </label>
        </li>
      ))}
    </ul>
  )
}

export function ChartMetricSpecEditor({
  spec,
  onChange,
  idPrefix,
  allLinkCodes,
  linkCodeLabels,
  allowDerivedMargin,
  barSeriesOptions,
  currentSeriesId,
  embedded,
  structureHintLabel: structureHintLabelProp,
}: {
  spec: ChartMetricSpec
  onChange: (s: ChartMetricSpec) => void
  idPrefix: string
  allLinkCodes: string[]
  linkCodeLabels?: Map<string, string>
  allowDerivedMargin?: boolean
  barSeriesOptions?: { id: string; label: string }[]
  currentSeriesId?: string
  embedded?: boolean
  structureHintLabel?: string
}) {
  const mode = spec.type === "derivedMargin" ? "derivedMargin" : spec.type
  const codeOptions = allLinkCodes
  const firstBarId = barSeriesOptions?.find((b) => b.id !== currentSeriesId)?.id ?? ""

  return (
    <div
      className={cn(
        "space-y-4",
        embedded
          ? "rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-200/60"
          : "rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm",
      )}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-mode`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Source des données
          </Label>
          <Select
            value={mode}
            onValueChange={(v) => {
              if (v === "single") onChange({ type: "single", code: "" })
              else if (v === "sum") onChange({ type: "sum", codes: [] })
              else if (v === "difference")
                onChange({ type: "difference", numeratorCodes: [], denominatorCodes: [] })
              else if (v === "ratio")
                onChange({ type: "ratio", numeratorCodes: [], denominatorCodes: [], complement: false })
              else if (v === "derivedMargin" && allowDerivedMargin && firstBarId) {
                onChange({
                  type: "derivedMargin",
                  revenueSeriesId: firstBarId,
                  grossProfitFromSpec: { type: "single", code: "" },
                })
              } else if (v === "derivedMargin" && allowDerivedMargin) {
                onChange({
                  type: "derivedMargin",
                  revenueSeriesId: "",
                  grossProfitFromSpec: { type: "single", code: "" },
                })
              }
            }}
          >
            <SelectTrigger id={`${idPrefix}-mode`} className="h-10 rounded-xl border-slate-200/90 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Code unique</SelectItem>
              <SelectItem value="sum">Somme de codes</SelectItem>
              <SelectItem value="difference">Différence (numérateur − dénominateur)</SelectItem>
              <SelectItem value="ratio">Rapport (numérateur ÷ dénominateur)</SelectItem>
              {allowDerivedMargin ? (
                <SelectItem value="derivedMargin">Marge % (bénéfice brut ÷ revenus d&apos;un histogramme)</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        {spec.type === "single" ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-code`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Code de liaison
            </Label>
            {codeOptions.length === 0 ? (
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                Aucun code disponible : définissez des liaisons dans Paramètres {structureHintLabelProp ?? "Sommaire"}.
              </p>
            ) : (
              <Select
                value={spec.code ? spec.code : EMPTY_SELECT}
                onValueChange={(v) => onChange({ type: "single", code: v === EMPTY_SELECT ? "" : v })}
              >
                <SelectTrigger
                  id={`${idPrefix}-code`}
                  className="h-10 rounded-xl border-slate-200/90 bg-white text-sm"
                >
                  <SelectValue placeholder="Choisir un code" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={EMPTY_SELECT} className="text-slate-500">
                    — Non choisi —
                  </SelectItem>
                  {codeOptions.map((code) => (
                    <SelectItem key={code} value={code} className="text-sm">
                      <span className="font-mono">{code}</span>
                      {labelForCode(linkCodeLabels, code) && (
                        <span className="ml-1.5 text-slate-500"> — {labelForCode(linkCodeLabels, code)}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : null}
      </div>

      {spec.type === "derivedMargin" && (
        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <p className="text-xs leading-relaxed text-slate-600">
            La courbe affiche (bénéfice brut ÷ montant de l&apos;histogramme choisi) × 100 pour chaque période.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Histogramme (revenus)
              </Label>
              <Select
                value={spec.revenueSeriesId || EMPTY_SELECT}
                onValueChange={(rid) =>
                  onChange({
                    ...spec,
                    revenueSeriesId: rid === EMPTY_SELECT ? "" : rid,
                  })
                }
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200/90 bg-white text-sm">
                  <SelectValue placeholder="Choisir une série barres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT} className="text-slate-500">
                    — Choisir —
                  </SelectItem>
                  {(barSeriesOptions ?? [])
                    .filter((b) => b.id !== currentSeriesId)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bénéfice brut</Label>
            <ChartMetricSpecEditor
              idPrefix={`${idPrefix}-gp`}
              spec={spec.grossProfitFromSpec}
              onChange={(grossProfitFromSpec) => onChange({ ...spec, grossProfitFromSpec })}
              allLinkCodes={codeOptions}
              linkCodeLabels={linkCodeLabels}
              allowDerivedMargin={false}
              embedded
              structureHintLabel={structureHintLabelProp}
            />
          </div>
        </div>
      )}

      {spec.type === "sum" ? (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Codes à additionner</Label>
          <CodeCheckboxList
            idPrefix={`${idPrefix}-sum`}
            codes={codeOptions}
            selected={normalizeCodeList(spec.codes)}
            onToggle={(codes) => onChange({ type: "sum", codes })}
            labels={linkCodeLabels}
          />
        </div>
      ) : null}

      {(spec.type === "difference" || spec.type === "ratio") && (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-500">
            {spec.type === "difference"
              ? "Différence des sommes sur l'horizon affiché."
              : spec.complement
                ? "1 − (somme num. ÷ somme dénom.) ; format Ratio → affichage en %."
                : "Somme num. ÷ somme dénom. ; format Ratio → %."}
          </p>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Numérateur</Label>
              <CodeCheckboxList
                idPrefix={`${idPrefix}-num`}
                codes={codeOptions}
                selected={normalizeCodeList(spec.numeratorCodes)}
                onToggle={(numeratorCodes) => onChange({ ...spec, numeratorCodes })}
                labels={linkCodeLabels}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dénominateur</Label>
              <CodeCheckboxList
                idPrefix={`${idPrefix}-den`}
                codes={codeOptions}
                selected={normalizeCodeList(spec.denominatorCodes)}
                onToggle={(denominatorCodes) => onChange({ ...spec, denominatorCodes })}
                labels={linkCodeLabels}
              />
            </div>
          </div>
          {spec.type === "ratio" ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <Checkbox
                id={`${idPrefix}-comp`}
                checked={spec.complement === true}
                onCheckedChange={(v) =>
                  onChange({
                    ...spec,
                    complement: v === true,
                  })
                }
              />
              <span>Complément : 1 − (num ÷ dénom)</span>
            </label>
          ) : null}
        </div>
      )}
    </div>
  )
}

function patchSeriesAfterRemove(
  series: StatementChartSeries[],
  removedId: string,
): StatementChartSeries[] {
  const bars = series.filter((s) => s.kind === "bar" && s.id !== removedId).map((s) => s.id)
  const fallback = bars[0] ?? ""
  return series
    .filter((s) => s.id !== removedId)
    .map((s) => {
      if (s.spec.type !== "derivedMargin") return s
      if (s.spec.revenueSeriesId === removedId) {
        return {
          ...s,
          spec: {
            ...s.spec,
            revenueSeriesId: s.spec.revenueSeriesId === removedId ? fallback : s.spec.revenueSeriesId,
          },
        }
      }
      return s
    })
}

interface StatementChartSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  statementType: StatementType
  companyId: string
  slot: ChartSlot
  onSaved: () => void
}

function SeriesSidebarItem({
  series,
  index,
  selected,
  linkCodeLabels,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove,
  isFirst,
  isLast,
}: {
  series: StatementChartSeries
  index: number
  selected: boolean
  linkCodeLabels: Map<string, string>
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canRemove: boolean
  isFirst: boolean
  isLast: boolean
}) {
  const color = series.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  const specSummary = summarizeMetricSpec(series.spec, linkCodeLabels)

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all",
        selected
          ? "border-emerald-300/80 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-200/60"
          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 px-3 py-3 text-left"
      >
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={cn(
                "h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                series.kind === "bar"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                  : "bg-violet-100 text-violet-800 hover:bg-violet-100",
              )}
            >
              {series.kind === "bar" ? (
                <>
                  <BarChart3 className="mr-0.5 h-3 w-3" aria-hidden />
                  Barres
                </>
              ) : (
                <>
                  <LineChart className="mr-0.5 h-3 w-3" aria-hidden />
                  Courbe
                </>
              )}
            </Badge>
            {!series.showOnChart && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-slate-500">
                Masqué
              </Badge>
            )}
          </span>
          <span className="mt-1 block text-sm font-medium leading-snug text-slate-900">
            {series.label.trim() || `Série ${index + 1}`}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500">{specSummary}</span>
        </span>
      </button>
      <div className="flex items-center justify-end gap-0.5 border-t border-slate-100/80 px-1 py-0.5 opacity-80 group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-700"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Monter la série"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-700"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Descendre la série"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-red-600"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Supprimer la série"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function StatementChartSettingsDialog({
  open,
  onOpenChange,
  statementType,
  companyId,
  slot,
  onSaved,
}: StatementChartSettingsDialogProps) {
  const [localConfig, setLocalConfig] = useState<StatementChartConfig>(slot.config)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(
    slot.config.series[0]?.id ?? null,
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [staleConflict, setStaleConflict] = useState<{
    currentVersion: number
    currentConfig: StatementChartConfig
    updatedByUserEmail: string | null
    updatedAt: string
  } | null>(null)
  const [linkCodes, setLinkCodes] = useState<string[]>([])
  const [linkCodeLabels, setLinkCodeLabels] = useState<Map<string, string>>(new Map())
  const [loadingCodes, setLoadingCodes] = useState(false)

  useEffect(() => {
    setLocalConfig(slot.config)
    setSelectedSeriesId(slot.config.series[0]?.id ?? null)
    setStaleConflict(null)
    setSaveError(null)
  }, [slot.chartInstanceId, slot.version, open])

  useEffect(() => {
    if (!localConfig.series.some((s) => s.id === selectedSeriesId)) {
      setSelectedSeriesId(localConfig.series[0]?.id ?? null)
    }
  }, [localConfig.series, selectedSeriesId])

  useEffect(() => {
    if (!open || !companyId) return
    let cancelled = false
    setLoadingCodes(true)
    getStatementStructure(companyId, statementType as unknown as ApiStatementType)
      .then((data) => {
        if (cancelled) return
        setLinkCodes(collectDistinctLinkCodesFromStructure(data.structure ?? []))
        setLinkCodeLabels(mapLinkCodesToOwnerLabel(data.structure ?? []))
      })
      .catch(() => {
        if (!cancelled) {
          setLinkCodes([])
          setLinkCodeLabels(new Map())
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCodes(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, companyId, statementType])

  const sortedCodes = useMemo(
    () => [...linkCodes].sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    [linkCodes],
  )

  const hint = useMemo(() => {
    if (loadingCodes) return "Chargement des codes de liaison du Sommaire…"
    if (!sortedCodes.length)
      return `Aucun code dans la structure : ouvrez Paramètres ${structureHintLabel(statementType)} pour définir des liaisons.`
    return `${sortedCodes.length} code${sortedCodes.length > 1 ? "s" : ""} disponible${sortedCodes.length > 1 ? "s" : ""} (même liste qu'au Sommaire).`
  }, [sortedCodes, loadingCodes, statementType])

  const barOptions = useMemo(
    () => localConfig.series.filter((s) => s.kind === "bar").map((s) => ({ id: s.id, label: s.label })),
    [localConfig.series],
  )

  const selectedIndex = localConfig.series.findIndex((s) => s.id === selectedSeriesId)
  const selectedSeries = selectedIndex >= 0 ? localConfig.series[selectedIndex] : null
  const barCount = localConfig.series.filter((s) => s.kind === "bar").length
  const lineCount = localConfig.series.filter((s) => s.kind === "line").length

  async function handleSave() {
    setSaving(true)
    setStaleConflict(null)
    setSaveError(null)
    try {
      await saveStatementChartSlot(companyId, statementType, slot.chartInstanceId, {
        version: slot.version,
        config: localConfig,
      })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      if (e instanceof StaleVersionError) {
        setStaleConflict({
          currentVersion: e.currentVersion,
          currentConfig: e.currentConfig,
          updatedByUserEmail: e.updatedByUserEmail,
          updatedAt: e.updatedAt,
        })
      } else {
        setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
      }
    } finally {
      setSaving(false)
    }
  }

  const addSeries = (kind: "bar" | "line") => {
    const i = localConfig.series.length
    const id = newSeriesId()
    const next: StatementChartSeries = {
      id,
      kind,
      label: kind === "bar" ? `Histogramme ${barCount + 1}` : `Courbe ${lineCount + 1}`,
      spec:
        kind === "line"
          ? localConfig.series.some((s) => s.kind === "bar")
            ? {
                type: "derivedMargin",
                revenueSeriesId: localConfig.series.find((s) => s.kind === "bar")!.id,
                grossProfitFromSpec: { type: "single", code: "" },
              }
            : { type: "single", code: "" }
          : { type: "single", code: "" },
      yAxis: kind === "line" ? "right" : "left",
      valueFormat: kind === "line" ? "ratio" : "currency",
      showOnChart: true,
      showInSidePanel: true,
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    }
    setLocalConfig((d) => ({ ...d, series: [...d.series, next] }))
    setSelectedSeriesId(id)
  }

  const moveSeries = (index: number, dir: -1 | 1) => {
    setLocalConfig((d) => {
      const next = [...d.series]
      const j = index + dir
      if (j < 0 || j >= next.length) return d
      ;[next[index], next[j]] = [next[j]!, next[index]!]
      return { ...d, series: next }
    })
  }

  const removeSeries = (index: number) => {
    const id = localConfig.series[index]?.id
    if (!id) return
    setLocalConfig((d) => ({ ...d, series: patchSeriesAfterRemove(d.series, id) }))
    if (selectedSeriesId === id) {
      const remaining = patchSeriesAfterRemove(localConfig.series, id)
      setSelectedSeriesId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
    }
  }

  const updateSeries = (index: number, patch: Partial<StatementChartSeries>) => {
    setLocalConfig((d) => {
      const next = [...d.series]
      const cur = next[index]
      if (!cur) return d
      next[index] = { ...cur, ...patch } as StatementChartSeries
      return { ...d, series: next }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 overflow-hidden rounded-xl border-slate-200/90 p-0 shadow-2xl",
          "!fixed !inset-4 !top-4 !left-4 !right-4 !bottom-4 !h-auto !w-auto !max-w-none !translate-x-0 !translate-y-0 sm:!max-w-none",
        )}
      >
        <div className="relative shrink-0 border-b border-slate-100 bg-white px-6 pb-4 pt-5 pr-36">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-6 top-5 gap-1.5 rounded-lg border-slate-300 bg-white shadow-sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden />
            Fermer
          </Button>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
              Paramètres du graphique
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Configurez les histogrammes et courbes de {defaultChartCardTitle(statementType).toLowerCase()}. Les
              données proviennent des mêmes codes de liaison que le Sommaire.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="perf-chart-card-title" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Titre affiché sur le tableau de bord
              </Label>
              <Input
                id="perf-chart-card-title"
                value={localConfig.chartTitle}
                onChange={(e) => setLocalConfig((d) => ({ ...d, chartTitle: e.target.value }))}
                placeholder={defaultChartCardTitle(statementType)}
                className="h-10 rounded-xl border-slate-200/90 bg-white text-[15px] font-medium text-slate-900"
                autoComplete="off"
              />
            </div>
            <p className="text-xs leading-snug text-slate-400 lg:max-w-xs lg:pb-2.5">{hint}</p>
          </div>
        </div>

        {staleConflict && (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
            <p className="font-medium">
              Quelqu&apos;un d&apos;autre a modifié ce graphique pendant que vous l&apos;éditiez
              {staleConflict.updatedByUserEmail ? ` (${staleConflict.updatedByUserEmail})` : ""}. Vos modifications
              n&apos;ont pas été enregistrées.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocalConfig(staleConflict.currentConfig)
                  setStaleConflict(null)
                }}
              >
                Recharger
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={async () => {
                  setSaving(true)
                  try {
                    await saveStatementChartSlot(companyId, statementType, slot.chartInstanceId, {
                      version: staleConflict.currentVersion,
                      config: localConfig,
                    })
                    onSaved()
                    onOpenChange(false)
                  } catch (e) {
                    if (e instanceof StaleVersionError) {
                      setStaleConflict({
                        currentVersion: e.currentVersion,
                        currentConfig: e.currentConfig,
                        updatedByUserEmail: e.updatedByUserEmail,
                        updatedAt: e.updatedAt,
                      })
                    } else {
                      setSaveError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
                    }
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                Écraser quand même
              </Button>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-80 shrink-0 flex-col border-r border-slate-100 bg-slate-50/40 xl:w-96">
            <div className="shrink-0 space-y-3 border-b border-slate-100 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Séries
                  <span className="ml-1.5 font-normal text-slate-400">({localConfig.series.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {barCount} barre{barCount > 1 ? "s" : ""} · {lineCount} courbe{lineCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSeries("bar")}
                  className="h-8 flex-1 gap-1 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-none"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  <BarChart3 className="h-3.5 w-3.5 text-blue-600" aria-hidden />
                  Barres
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSeries("line")}
                  className="h-8 flex-1 gap-1 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-none"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  <LineChart className="h-3.5 w-3.5 text-violet-600" aria-hidden />
                  Courbe
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
              {localConfig.series.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                  Ajoutez un histogramme ou une courbe pour commencer.
                </p>
              ) : (
                localConfig.series.map((s, idx) => (
                  <SeriesSidebarItem
                    key={s.id}
                    series={s}
                    index={idx}
                    selected={s.id === selectedSeriesId}
                    linkCodeLabels={linkCodeLabels}
                    onSelect={() => setSelectedSeriesId(s.id)}
                    onMoveUp={() => moveSeries(idx, -1)}
                    onMoveDown={() => moveSeries(idx, 1)}
                    onRemove={() => removeSeries(idx)}
                    canRemove={localConfig.series.length > 1}
                    isFirst={idx === 0}
                    isLast={idx === localConfig.series.length - 1}
                  />
                ))
              )}
            </div>
          </aside>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white px-6 py-5 [scrollbar-width:thin]">
            {!selectedSeries || selectedIndex < 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
                <BarChart3 className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
                <p className="text-sm font-medium text-slate-600">Sélectionnez une série à gauche</p>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  Chaque histogramme ou courbe se configure individuellement : libellé, source de données et
                  affichage.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Série {selectedIndex + 1} sur {localConfig.series.length}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedSeries.kind === "bar" ? "Histogramme" : "Courbe"}
                    </h4>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs text-slate-500">
                    {summarizeMetricSpec(selectedSeries.spec, linkCodeLabels)}
                  </Badge>
                </div>

                <section className="rounded-2xl border border-slate-200/80 bg-slate-50/30 p-5">
                  <h5 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Apparence et libellé
                  </h5>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Libellé sur le graphique</Label>
                      <Input
                        value={selectedSeries.label}
                        onChange={(e) => updateSeries(selectedIndex, { label: e.target.value })}
                        className="h-10 rounded-xl border-slate-200/90 bg-white text-[15px] font-medium"
                        placeholder="Ex. Revenus, Marge brute %…"
                      />
                    </div>
                    <ChartSeriesColorPicker
                      value={selectedSeries.color}
                      onChange={(color) => updateSeries(selectedIndex, { color })}
                      fallbackPreview={DEFAULT_COLORS[selectedIndex % DEFAULT_COLORS.length]}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Type de série</Label>
                      <Select
                        value={selectedSeries.kind}
                        onValueChange={(v) => {
                          const k = v as "bar" | "line"
                          updateSeries(selectedIndex, {
                            kind: k,
                            yAxis: k === "line" ? "right" : "left",
                            valueFormat: k === "line" ? "ratio" : "currency",
                            spec:
                              k === "line" && barOptions.length
                                ? {
                                    type: "derivedMargin",
                                    revenueSeriesId: barOptions[0]!.id,
                                    grossProfitFromSpec: { type: "single", code: "" },
                                  }
                                : { type: "single", code: "" },
                          })
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200/90 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Histogramme</SelectItem>
                          <SelectItem value="line">Courbe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Axe vertical</Label>
                      <Select
                        value={selectedSeries.yAxis}
                        onValueChange={(v) => updateSeries(selectedIndex, { yAxis: v as "left" | "right" })}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200/90 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Gauche — montants</SelectItem>
                          <SelectItem value="right">Droite — %</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Format des valeurs</Label>
                      <Select
                        value={selectedSeries.valueFormat}
                        onValueChange={(v) =>
                          updateSeries(selectedIndex, { valueFormat: v as ChartValueFormat })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200/90 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="currency">Montant ($)</SelectItem>
                          <SelectItem value="ratio">Ratio / %</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-600">Visibilité</Label>
                      <div className="flex h-10 flex-wrap items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-3">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                          <Checkbox
                            checked={selectedSeries.showOnChart}
                            onCheckedChange={(v) => updateSeries(selectedIndex, { showOnChart: v === true })}
                          />
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          Graphique
                        </label>
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                          <Checkbox
                            checked={selectedSeries.showInSidePanel}
                            onCheckedChange={(v) =>
                              updateSeries(selectedIndex, { showInSidePanel: v === true })
                            }
                          />
                          <PanelLeft className="h-3.5 w-3.5" aria-hidden />
                          Panneau
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Source des données
                  </h5>
                  <ChartMetricSpecEditor
                    idPrefix={`s-${selectedIndex}`}
                    spec={selectedSeries.spec}
                    onChange={(spec) => updateSeries(selectedIndex, { spec })}
                    allLinkCodes={sortedCodes}
                    linkCodeLabels={linkCodeLabels}
                    allowDerivedMargin={selectedSeries.kind === "line"}
                    barSeriesOptions={barOptions.length ? barOptions : undefined}
                    currentSeriesId={selectedSeries.id}
                    structureHintLabel={structureHintLabel(statementType)}
                  />
                </section>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          {slot.updatedByUserEmail ? (
            <p className="text-xs text-slate-400">
              Modifié par {slot.updatedByUserEmail} • {new Date(slot.updatedAt).toLocaleString("fr-CA")}
            </p>
          ) : (
            <span className="text-xs text-slate-400">
              {localConfig.series.length} série{localConfig.series.length > 1 ? "s" : ""} configurée
              {localConfig.series.length > 1 ? "s" : ""}
            </span>
          )}
          <div className="flex items-center gap-2">
            {saveError ? <span className="text-sm text-red-600">{saveError}</span> : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg px-4"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-lg bg-[#2A2F3A] px-5 hover:bg-[#2A2F3A]/90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
