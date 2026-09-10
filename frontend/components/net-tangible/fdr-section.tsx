"use client"

import { useEffect, useRef } from "react"
import { LabelWithHint, ParamRow } from "@/components/cmpc/editable"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { NetTangibleReportSection } from "./report-section"

export type FdrAdjustmentMode = "dollar" | "percent-revenue" | "representative-amount"

export type FdrSectionProps = {
  referenceColumnLabel: string
  fdrBaseLine: number | null
  fdrBasePctOfRevenue: number | null
  revenueTotal: number | null
  fdrAdjMode: FdrAdjustmentMode
  fdrAdjValue: number
  fdrAdjNote: string
  fdrAdjustmentDollarDelta: number | null
  fdrAdjustmentPctOfRevenue: number | null
  fdrAdjustedValue: number | null
  fdrAdjustedPctOfRevenue: number | null
  onAdjValueChange: (value: number) => void
  onAdjNoteChange: (note: string) => void
  onModeChange: (mode: FdrAdjustmentMode) => void
  onSave: () => void
}

function BuildupRow({
  operator,
  label,
  detail,
  value,
  total,
  testId,
  detailTestId,
}: {
  operator: string
  label: string
  detail?: string
  value: string
  total?: boolean
  testId?: string
  detailTestId?: string
}) {
  return (
    <tr className={total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200"}>
      <td className="w-6 py-2 pr-1 text-center font-mono text-sm text-slate-500">{operator}</td>
      <td className="py-2 pr-4">
        <span className={`text-sm ${total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]"}`}>
          {label}
        </span>
        {detail ? (
          <span
            className="ml-2 font-mono text-xs text-slate-500"
            data-testid={detailTestId}
          >
            {detail}
          </span>
        ) : null}
      </td>
      <td
        className={`py-2 text-right font-mono text-sm tabular-nums ${
          total ? "font-semibold text-[#E0742D]" : "text-[#2A2F3A]"
        }`}
        data-testid={testId}
      >
        {value}
      </td>
    </tr>
  )
}

function ReadOnlyParam({
  label,
  hint,
  note,
  value,
  valueTestId,
  noteTestId,
}: {
  label: string
  hint?: string
  note?: string
  value: string
  valueTestId?: string
  noteTestId?: string
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#2A2F3A]">
          <LabelWithHint label={label} hint={hint} />
        </div>
        {note ? (
          <p className="mt-0.5 text-pretty text-xs text-slate-500" data-testid={noteTestId}>
            {note}
          </p>
        ) : null}
      </div>
      <span
        className="font-mono text-sm tabular-nums text-[#2A2F3A]"
        data-testid={valueTestId}
      >
        {value}
      </span>
    </div>
  )
}

const MODE_OPTIONS = [
  { mode: "dollar" as const, label: "Ajustement $" },
  { mode: "percent-revenue" as const, label: "% des revenus" },
  { mode: "representative-amount" as const, label: "Montant représentatif" },
] as const

function modeHint(mode: FdrAdjustmentMode): string {
  if (mode === "dollar") {
    return "Montant ajouté ou soustrait au FDR déterminé (ACN)."
  }
  if (mode === "percent-revenue") {
    return "Le FDR représentatif est fixé à ce pourcentage des revenus TTM."
  }
  return "Le FDR représentatif est remplacé par ce montant absolu."
}

function adjustmentLabel(mode: FdrAdjustmentMode): string {
  if (mode === "dollar") return "Ajustement ($)"
  if (mode === "percent-revenue") return "Pourcentage des revenus"
  return "Montant représentatif ($)"
}

function adjustmentUnit(mode: FdrAdjustmentMode): string {
  return mode === "percent-revenue" ? "%" : "$"
}

export function FdrSection({
  referenceColumnLabel,
  fdrBaseLine,
  fdrBasePctOfRevenue,
  revenueTotal,
  fdrAdjMode,
  fdrAdjValue,
  fdrAdjNote,
  fdrAdjustmentDollarDelta,
  fdrAdjustmentPctOfRevenue,
  fdrAdjustedValue,
  fdrAdjustedPctOfRevenue,
  onAdjValueChange,
  onAdjNoteChange,
  onModeChange,
  onSave,
}: FdrSectionProps) {
  const skipAutosaveRef = useRef(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => onSave(), 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [fdrAdjMode, fdrAdjValue, fdrAdjNote, onSave])

  const hasAdjustment =
    fdrAdjustmentDollarDelta != null && Math.abs(fdrAdjustmentDollarDelta) >= 1e-9

  const calcOperator =
    hasAdjustment && fdrAdjustmentDollarDelta! < 0 ? "−" : "+"

  const adjDisplay = hasAdjustment
    ? formatCurrency(Math.abs(fdrAdjustmentDollarDelta!))
    : "—"

  const adjustmentHint =
    fdrAdjustmentPctOfRevenue != null && hasAdjustment
      ? `Variations : ${Math.abs(fdrAdjustmentPctOfRevenue).toFixed(1)} % des revenus`
      : undefined

  const adjustmentRowLabel =
    fdrAdjMode === "percent-revenue"
      ? "Écart vs FDR déterminé"
      : fdrAdjMode === "representative-amount"
        ? "Écart vs FDR déterminé"
        : "Ajustement"

  return (
    <NetTangibleReportSection
      id="fdr-representatif"
      number="3."
      title="Fonds de roulement représentatif"
    >
      <div data-testid="net-tangible-fdr-card">
        <p className="text-pretty text-sm leading-relaxed text-slate-500">
          Le fonds de roulement représentatif est dérivé de l&apos;actif net d&apos;exploitation
          (colonne ACN) du bilan ajusté. Il peut être retenu tel quel, ajusté en dollars, fixé en
          pourcentage des revenus des douze derniers mois, ou remplacé par un montant représentatif
          jugé plus pertinent pour l&apos;évaluation. La relation retenue est&nbsp;:
        </p>
        <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
          FDR représentatif = FDR déterminé (ACN) ± ajustement
        </p>

        <div className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hypothèses
            </p>

            <ReadOnlyParam
              label="FDR déterminé (ACN)"
              hint="Actif courant ACN − passif courant ACN, avant ajustement représentatif."
              note={
                fdrBasePctOfRevenue != null
                  ? `${fdrBasePctOfRevenue.toFixed(1)} % des revenus`
                  : "Issue du bilan ajusté (ACN)"
              }
              noteTestId="fdr-base-pct-revenue"
              value={fdrBaseLine != null ? formatCurrency(fdrBaseLine) : "—"}
              valueTestId="fdr-base-value"
            />

            <ReadOnlyParam
              label="Revenus (12 derniers mois)"
              hint="Chiffre d'affaires TTM à la date de référence, même moteur que le Sommaire annuel courant."
              note={`TTM au ${referenceColumnLabel}`}
              value={revenueTotal != null ? formatCurrency(revenueTotal) : "—"}
              valueTestId="fdr-revenue-ttm"
            />

            <div className="border-b border-slate-200 py-2.5">
              <div className="text-sm font-medium text-[#2A2F3A]">
                <LabelWithHint
                  label="Mode d'ajustement"
                  hint="Choisissez comment l'hypothèse de FDR représentatif est exprimée."
                />
              </div>
              <p className="mt-0.5 text-pretty text-xs text-slate-500">{modeHint(fdrAdjMode)}</p>
              <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                {MODE_OPTIONS.map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`fdr-adj-mode-${mode}`}
                    onClick={() => onModeChange(mode)}
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                      fdrAdjMode === mode
                        ? "bg-[#E0742D] text-white shadow-sm"
                        : "text-slate-500 hover:text-[#2A2F3A]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ParamRow
              label={adjustmentLabel(fdrAdjMode)}
              hint={modeHint(fdrAdjMode)}
              value={fdrAdjValue}
              onChange={(v) => onAdjValueChange(Number.isFinite(v) ? v : 0)}
              unit={adjustmentUnit(fdrAdjMode)}
              step={fdrAdjMode === "percent-revenue" ? 0.1 : 1}
              width="w-28"
              testId="fdr-adj-value-input"
              note={fdrAdjNote}
              onNoteChange={onAdjNoteChange}
              noteTestId="fdr-adj-note-input"
            />
          </div>

          <div className="mt-6 lg:mt-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Calcul du FDR représentatif
            </p>
            <table className="w-full">
              <tbody>
                <BuildupRow
                  operator=""
                  label="FDR déterminé (ACN)"
                  detail={
                    fdrBasePctOfRevenue != null
                      ? `${fdrBasePctOfRevenue.toFixed(1)} % rev.`
                      : undefined
                  }
                  value={fdrBaseLine != null ? formatCurrency(fdrBaseLine) : "—"}
                />
                <BuildupRow
                  operator={hasAdjustment ? calcOperator : "+"}
                  label={adjustmentRowLabel}
                  detail={adjustmentHint}
                  value={adjDisplay}
                  testId="fdr-adjustment-display"
                  detailTestId="fdr-adjustment-hint"
                />
                <BuildupRow
                  operator="="
                  label="FDR représentatif"
                  detail={
                    fdrAdjustedPctOfRevenue != null
                      ? `${fdrAdjustedPctOfRevenue.toFixed(1)} % des revenus`
                      : undefined
                  }
                  value={
                    fdrAdjustedValue != null ? formatCurrency(fdrAdjustedValue) : "—"
                  }
                  total
                  testId="fdr-adjusted-value"
                  detailTestId="fdr-adjusted-pct-revenue"
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </NetTangibleReportSection>
  )
}
