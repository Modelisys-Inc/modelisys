"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"

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

function CodeCheckboxList({
  codes,
  selected,
  onToggle,
  idPrefix,
}: {
  codes: string[]
  selected: string[]
  onToggle: (next: string[]) => void
  idPrefix: string
}) {
  if (codes.length === 0) {
    return (
      <p className="text-[11px] leading-snug text-amber-700">
        Aucun code de liaison dans la structure pour l’instant. Définissez d’abord des codes sur les postes du Sommaire
        (vue Paramètres).
      </p>
    )
  }
  return (
    <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl bg-slate-50/90 p-2.5 pr-1 [scrollbar-width:thin]">
      {codes.map((code) => (
        <li key={`${idPrefix}-${code}`} className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-${code}`}
            checked={selected.includes(code)}
            onCheckedChange={(v) => onToggle(toggleCodeInList(selected, code, v === true))}
          />
          <label htmlFor={`${idPrefix}-${code}`} className="cursor-pointer font-mono text-xs">
            {code}
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
  allowDerivedMargin?: boolean
  barSeriesOptions?: { id: string; label: string }[]
  currentSeriesId?: string
  /** Bloc imbriqué (ex. bénéfice brut dans marge %) — style plus léger. */
  embedded?: boolean
  /** Libellé de la vue Sommaire correspondant au type d'état (compte de résultat / bilan / trésorerie). */
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
          ? "rounded-lg bg-white/70 p-3 ring-1 ring-slate-100/70"
          : "rounded-xl bg-slate-50/60 p-4 pt-1 ring-1 ring-slate-100/80"
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-mode`} className="text-xs font-medium text-slate-500">
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
              <SelectItem value="derivedMargin">Marge % (bénéfice brut ÷ revenus d’un histogramme)</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      {spec.type === "derivedMargin" && (
        <div className="space-y-3">
          <p className="text-[11px] leading-snug text-slate-600">
            La courbe affiche (bénéfice brut ÷ montant de la série histogramme choisie) × 100 pour chaque période.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Histogramme (revenus)</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Bénéfice brut</Label>
            <ChartMetricSpecEditor
              idPrefix={`${idPrefix}-gp`}
              spec={spec.grossProfitFromSpec}
              onChange={(grossProfitFromSpec) => onChange({ ...spec, grossProfitFromSpec })}
              allLinkCodes={codeOptions}
              allowDerivedMargin={false}
              embedded
              structureHintLabel={structureHintLabelProp}
            />
          </div>
        </div>
      )}

      {spec.type === "single" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-code`} className="text-xs font-medium text-slate-500">
            Code de liaison
          </Label>
          {codeOptions.length === 0 ? (
            <p className="text-[11px] text-amber-700">
              Aucun code disponible : définissez des liaisons dans Paramètres {structureHintLabelProp ?? "Sommaire"}.
            </p>
          ) : (
            <Select
              value={spec.code ? spec.code : EMPTY_SELECT}
              onValueChange={(v) => onChange({ type: "single", code: v === EMPTY_SELECT ? "" : v })}
            >
              <SelectTrigger id={`${idPrefix}-code`} className="h-10 rounded-xl border-slate-200/90 bg-white font-mono text-sm">
                <SelectValue placeholder="Choisir un code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT} className="text-slate-500">
                  — Non choisi —
                </SelectItem>
                {codeOptions.map((code) => (
                  <SelectItem key={code} value={code} className="font-mono text-sm">
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}
      {spec.type === "sum" ? (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-500">Codes à additionner</Label>
          <CodeCheckboxList
            idPrefix={`${idPrefix}-sum`}
            codes={codeOptions}
            selected={normalizeCodeList(spec.codes)}
            onToggle={(codes) => onChange({ type: "sum", codes })}
          />
        </div>
      ) : null}
      {(spec.type === "difference" || spec.type === "ratio") && (
        <div className="space-y-3">
          <p className="text-[12px] leading-relaxed text-slate-500">
            {spec.type === "difference"
              ? "Différence des sommes sur l’horizon affiché."
              : spec.complement
                ? "1 − (somme num. ÷ somme dénom.) ; format Ratio → affichage en %."
                : "Somme num. ÷ somme dénom. ; format Ratio → %."}
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Numérateur</Label>
            <CodeCheckboxList
              idPrefix={`${idPrefix}-num`}
              codes={codeOptions}
              selected={normalizeCodeList(spec.numeratorCodes)}
              onToggle={(numeratorCodes) => onChange({ ...spec, numeratorCodes })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500">Dénominateur</Label>
            <CodeCheckboxList
              idPrefix={`${idPrefix}-den`}
              codes={codeOptions}
              selected={normalizeCodeList(spec.denominatorCodes)}
              onToggle={(denominatorCodes) => onChange({ ...spec, denominatorCodes })}
            />
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
  removedId: string
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
  /** Called after the parent should refetch slots (e.g., title change rename). */
  onSaved: () => void
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
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [staleConflict, setStaleConflict] = useState<{
    currentVersion: number
    currentConfig: StatementChartConfig
    updatedByUserEmail: string | null
    updatedAt: string
  } | null>(null)
  const [linkCodes, setLinkCodes] = useState<string[]>([])
  const [loadingCodes, setLoadingCodes] = useState(false)

  useEffect(() => {
    setLocalConfig(slot.config)
    setStaleConflict(null)
    setSaveError(null)
  }, [slot.chartInstanceId, slot.version, open])

  useEffect(() => {
    if (!open || !companyId) return
    let cancelled = false
    setLoadingCodes(true)
    // Cast: the dialog's StatementType ("income-statement" | "balance-sheet" | "cash-flow")
    // is a runtime-valid subset of the backend route ("…" | "capex" | "baiia"), but the
    // api.ts type union doesn't list "cash-flow". The backend accepts it (see
    // VALID_STATEMENT_TYPES in statement_structures.py).
    getStatementStructure(companyId, statementType as unknown as ApiStatementType)
      .then((data) => {
        if (cancelled) return
        setLinkCodes(collectDistinctLinkCodesFromStructure(data.structure ?? []))
      })
      .catch(() => {
        if (!cancelled) setLinkCodes([])
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
    [linkCodes]
  )

  const hint = useMemo(() => {
    if (loadingCodes) return "Chargement des codes de liaison du Sommaire…"
    if (!sortedCodes.length)
      return `Aucun code dans la structure : ouvrez Paramètres ${structureHintLabel(statementType)} pour définir des liaisons.`
    return `${sortedCodes.length} code${sortedCodes.length > 1 ? "s" : ""} disponible${sortedCodes.length > 1 ? "s" : ""} (même liste qu’au Sommaire).`
  }, [sortedCodes, loadingCodes, statementType])

  const barOptions = useMemo(
    () => localConfig.series.filter((s) => s.kind === "bar").map((s) => ({ id: s.id, label: s.label })),
    [localConfig.series]
  )

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
    const next: StatementChartSeries = {
      id: newSeriesId(),
      kind,
      label: kind === "bar" ? `Histogramme ${i + 1}` : `Courbe ${i + 1}`,
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
        showCloseButton
        className={cn(
          "flex max-h-[min(92vh,880px)] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200/90 p-0 shadow-2xl sm:max-w-lg"
        )}
      >
        <div className="shrink-0 border-b border-slate-100/90 bg-white px-6 pb-4 pt-5 pr-14">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight text-slate-900">{`Paramètres — ${defaultChartCardTitle(statementType)}`}</DialogTitle>
            <DialogDescription className="text-sm leading-snug text-slate-500">
              Même principe que le Sommaire : codes de liaison, puis affichage sur le graphique.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {staleConflict && (
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">
                Quelqu'un d'autre a modifié ce graphique pendant que vous l'éditiez
                {staleConflict.updatedByUserEmail ? ` (${staleConflict.updatedByUserEmail})` : ""}
                . Vos modifications n'ont pas été enregistrées.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                      await saveStatementChartSlot(
                        companyId,
                        statementType,
                        slot.chartInstanceId,
                        { version: staleConflict.currentVersion, config: localConfig },
                      )
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
          <p className="mb-5 border-l-2 border-slate-200/90 pl-3 text-[13px] leading-snug text-slate-500">{hint}</p>

          <div className="mb-6 space-y-1.5">
            <Label htmlFor="perf-chart-card-title" className="text-xs font-medium text-slate-500">
              Titre du graphique
            </Label>
            <Input
              id="perf-chart-card-title"
              value={localConfig.chartTitle}
              onChange={(e) => setLocalConfig((d) => ({ ...d, chartTitle: e.target.value }))}
              placeholder={defaultChartCardTitle(statementType)}
              className="h-10 rounded-xl border-slate-200/90 bg-white text-[15px] font-medium text-slate-900"
              autoComplete="off"
            />
            <p className="text-[11px] leading-snug text-slate-400">
              Affiché en en-tête de la carte sur le tableau de bord.
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addSeries("bar")}
              className="h-9 gap-1.5 rounded-full font-normal text-slate-700 shadow-none"
            >
              <Plus className="h-4 w-4 opacity-70" aria-hidden />
              Histogramme
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addSeries("line")}
              className="h-9 gap-1.5 rounded-full font-normal text-slate-700 shadow-none"
            >
              <Plus className="h-4 w-4 opacity-70" aria-hidden />
              Courbe
            </Button>
          </div>

          <div className="space-y-0">
            {localConfig.series.map((s, idx) => (
              <div key={s.id}>
                {idx > 0 ? <Separator className="mb-8 bg-slate-100" /> : null}
                <section className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        className="mt-0.5 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-slate-100 text-xs font-medium tabular-nums text-slate-500"
                        aria-hidden
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                            {s.kind === "bar" ? "Barres" : "Courbe"}
                          </span>
                        </div>
                        <Input
                          value={s.label}
                          onChange={(e) => updateSeries(idx, { label: e.target.value })}
                          className="h-10 border-0 border-b border-slate-200/80 bg-transparent px-0 text-[15px] font-medium text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-0"
                          placeholder="Libellé sur le graphique"
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => moveSeries(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Monter"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => moveSeries(idx, 1)}
                        disabled={idx === localConfig.series.length - 1}
                        aria-label="Descendre"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => removeSeries(idx)}
                        disabled={localConfig.series.length <= 1}
                        aria-label="Supprimer la série"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-500">Type</Label>
                      <Select
                        value={s.kind}
                        onValueChange={(v) => {
                          const k = v as "bar" | "line"
                          updateSeries(idx, {
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
                      <Label className="text-xs font-medium text-slate-500">Axe vertical</Label>
                      <Select
                        value={s.yAxis}
                        onValueChange={(v) => updateSeries(idx, { yAxis: v as "left" | "right" })}
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
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Label className="text-xs font-medium text-slate-500">Format</Label>
                      <Select
                        value={s.valueFormat}
                        onValueChange={(v) => updateSeries(idx, { valueFormat: v as ChartValueFormat })}
                      >
                        <SelectTrigger className="h-10 rounded-xl border-slate-200/90 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="currency">Montant</SelectItem>
                          <SelectItem value="ratio">Ratio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ChartSeriesColorPicker
                      compact
                      value={s.color}
                      onChange={(color) => updateSeries(idx, { color })}
                      fallbackPreview={DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                    />
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                      <Checkbox
                        checked={s.showOnChart}
                        onCheckedChange={(v) => updateSeries(idx, { showOnChart: v === true })}
                      />
                      Graphique
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                      <Checkbox
                        checked={s.showInSidePanel}
                        onCheckedChange={(v) => updateSeries(idx, { showInSidePanel: v === true })}
                      />
                      Panneau gauche
                    </label>
                  </div>

                  <ChartMetricSpecEditor
                    idPrefix={`s-${idx}`}
                    spec={s.spec}
                    onChange={(spec) => updateSeries(idx, { spec })}
                    allLinkCodes={sortedCodes}
                    allowDerivedMargin={s.kind === "line"}
                    barSeriesOptions={barOptions.length ? barOptions : undefined}
                    currentSeriesId={s.id}
                    structureHintLabel={structureHintLabel(statementType)}
                  />
                </section>
              </div>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          {slot.updatedByUserEmail ? (
            <p className="text-xs text-slate-400">
              Modifié par {slot.updatedByUserEmail} • {new Date(slot.updatedAt).toLocaleString("fr-CA")}
            </p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {saveError ? (
              <span className="text-sm text-red-600">{saveError}</span>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="rounded-full px-4" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-[#2A2F3A] px-5 hover:bg-[#2A2F3A]/90"
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
