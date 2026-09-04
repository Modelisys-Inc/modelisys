"use client"

import { useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { InlineNumber, InlineText, InlineTextArea } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import type { Adjustment } from "@/lib/ebitda-capitalisation"
import { normalizeAdjustmentTarget } from "@/lib/ebitda-capitalisation"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

type BaiiaSectionProps = {
  capitalisation: UseEbitdaCapitalisationReturn
}

/** Marge BAIIA / revenus (ex. « 12,4 % »). */
function formatBaiiaToRevenue(ebitda: number, revenue: number): string {
  if (!Number.isFinite(ebitda) || !Number.isFinite(revenue) || Math.abs(revenue) < 1e-9) {
    return "—"
  }
  const pct = (ebitda / revenue) * 100
  return `${pct.toLocaleString("fr-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`
}

/** Texte au repos ; chrome d’édition uniquement au focus (aligné Multiplicateur). */
const editableRestClass =
  "rounded-sm border-0 border-b border-transparent bg-transparent outline-none transition-[border-color,background-color,padding] focus:border-dashed focus:border-[#E0742D] focus:bg-slate-50"

function AmountCell({
  value,
  testId,
}: {
  value: number
  testId?: string
}) {
  const display = Math.abs(value) < 1e-9 ? "—" : formatCurrency(value)
  return (
    <td
      data-testid={testId}
      className="px-2 py-2 text-right font-mono text-sm tabular-nums text-[#2A2F3A]"
    >
      {display}
    </td>
  )
}

/** Montant $ : affichage formaté (espaces milliers) au repos, saisie au focus. */
function EditableCurrencyCell({
  value,
  onChange,
  ariaLabel,
  testId,
}: {
  value: number
  onChange: (value: number) => void
  ariaLabel: string
  testId?: string
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const beginEdit = () => {
    setDraft(Number.isFinite(value) ? String(value) : "")
    setFocused(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const display = Math.abs(value) < 1e-9 ? "—" : formatCurrency(value)

  return (
    <td className="px-2 py-2 text-right align-middle">
      {focused ? (
        <span className="inline-flex items-baseline justify-end gap-1">
          <input
            ref={inputRef}
            data-editable
            data-testid={testId}
            type="text"
            inputMode="decimal"
            aria-label={ariaLabel}
            value={draft}
            onChange={(e) => {
              const raw = e.target.value
              setDraft(raw)
              const normalized = raw.replace(/\s/g, "").replace(",", ".")
              if (normalized === "" || normalized === "-" || normalized === ".") return
              const next = Number(normalized)
              if (!Number.isFinite(next)) return
              onChange(next)
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className={cn(
              editableRestClass,
              "w-28 px-1.5 py-0.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A]",
            )}
          />
          <span className="font-mono text-xs text-slate-500">$</span>
        </span>
      ) : (
        <button
          type="button"
          data-testid={testId}
          aria-label={ariaLabel}
          onClick={beginEdit}
          className={cn(
            editableRestClass,
            "w-full cursor-text px-0 py-0.5 text-right font-mono text-sm tabular-nums text-[#2A2F3A] hover:bg-slate-50/80",
          )}
        >
          {display}
        </button>
      )}
    </td>
  )
}

function EditablePercentCell({
  value,
  onChange,
  ariaLabel,
  testId,
}: {
  value: number
  onChange: (value: number) => void
  ariaLabel: string
  testId?: string
}) {
  return (
    <td className="px-2 py-2 text-right align-middle">
      <div className="flex justify-end">
        <InlineNumber
          value={value}
          onChange={(next) => {
            if (!Number.isFinite(next)) return
            onChange(next)
          }}
          unit="%"
          step={0.5}
          min={0}
          max={100}
          width="w-16"
          ariaLabel={ariaLabel}
          testId={testId}
          className="font-semibold text-[#E0742D]"
          unitClassName="font-semibold text-[#E0742D]"
        />
      </div>
    </td>
  )
}

function AdjustmentRows({
  adjustments,
  columns,
  capitalisation: c,
}: {
  adjustments: Adjustment[]
  columns: UseEbitdaCapitalisationReturn["displayColumns"]
  capitalisation: UseEbitdaCapitalisationReturn
}) {
  return (
    <>
      {adjustments.map((adj) => (
        <tr key={adj.id} className="hover:[&>td]:bg-slate-50/60">
          <td className="py-2 pr-4 align-middle">
            <div className="flex items-center gap-1">
              <InlineText
                value={adj.name}
                onChange={(name) => c.updateAdjustmentName(adj.id, name)}
                ariaLabel="Nom de l'ajustement"
                className="text-sm"
                testId={`capitalisation-adj-name-${adj.id}`}
              />
              <button
                type="button"
                onClick={() => c.removeAdjustment(adj.id)}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                aria-label="Supprimer l'ajustement"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </td>
          {columns.map((col) => (
            <EditableCurrencyCell
              key={`${adj.id}-${col.id}`}
              value={adj.amounts[col.id] || 0}
              onChange={(amount) => c.updateAdjustmentAmount(adj.id, col.id, amount)}
              ariaLabel={`${adj.name} — ${col.label}`}
              testId={`capitalisation-adj-${adj.id}-${col.id}`}
            />
          ))}
        </tr>
      ))}
    </>
  )
}

function NotesSourcesTable({ capitalisation: c }: BaiiaSectionProps) {
  const hasWeights = c.displayColumns.some((col) => col.weight > 0)

  if (c.adjustments.length === 0 && !hasWeights) return null

  return (
    <div className="mt-6" data-testid="capitalisation-notes-sources">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Notes / sources
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b-2 border-[#2A2F3A] text-left">
              <th className="w-[36%] py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paramètre
              </th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source / justification
              </th>
            </tr>
          </thead>
          <tbody>
            {c.adjustments.map((adj) => {
              const target = normalizeAdjustmentTarget(adj.target)
              const targetLabel = target === "revenue" ? "Revenus" : "BAIIA"
              return (
                <tr key={adj.id} className="border-b border-slate-200 align-top">
                  <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">
                    {adj.name}
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      Ajustement — {targetLabel}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <InlineTextArea
                      value={c.adjustmentNotes[adj.id] || ""}
                      onChange={(note) => c.updateAdjustmentNote(adj.id, note)}
                      ariaLabel={`Source — ${adj.name}`}
                      placeholder="Source / justification"
                      testId={`capitalisation-adj-note-${adj.id}`}
                      rows={2}
                    />
                  </td>
                </tr>
              )
            })}
            {hasWeights ? (
              <tr className="border-b border-slate-200 align-top">
                <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">Pondération</td>
                <td className="py-2.5">
                  <InlineTextArea
                    value={c.weightNote || ""}
                    onChange={(note) => c.updateWeightNote(note)}
                    ariaLabel="Source — Pondération"
                    placeholder="Source / justification"
                    testId="capitalisation-weight-note"
                    rows={2}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Section 2 — BAIIA selon date de référence :
 * PEC + TTM + 5 exercices (période en cours) ou 5 exercices (clôture).
 */
export function BaiiaSection({ capitalisation: c }: BaiiaSectionProps) {
  const weightSumPct = Math.round(c.totalWeight * 1000) / 10
  const weightOk = Math.abs(c.totalWeight - 1) < 0.005
  const columns = c.displayColumns
  const columnCount = columns.length
  const hasPecTtm = columns.some((col) => col.kind === "pec" || col.kind === "ttm")

  const revenueAdjustments = c.adjustments.filter(
    (adj) => normalizeAdjustmentTarget(adj.target) === "revenue",
  )
  const ebitdaAdjustments = c.adjustments.filter(
    (adj) => normalizeAdjustmentTarget(adj.target) === "ebitda",
  )
  const hasRevenueAdjustments = revenueAdjustments.length > 0

  return (
    <NetTangibleReportSection id="baiia" number="2." title="Analyse du BAIIA — 5 exercices">
      <div data-testid="capitalisation-baiia-card">
        <p className="text-pretty text-sm leading-relaxed text-slate-500">
          {hasPecTtm ? (
            <>
              La date de référence n&apos;est pas une clôture d&apos;exercice&nbsp;: la première
              colonne est la <span className="font-medium text-[#2A2F3A]">PEC</span> (période en
              cours, cumul d&apos;exercice), suivie du{" "}
              <span className="font-medium text-[#2A2F3A]">TTM</span> (12 derniers mois), puis des
              cinq exercices complets clos.
            </>
          ) : (
            <>
              La date de référence coïncide avec la fin d&apos;exercice&nbsp;: cinq exercices
              complets sont présentés.
            </>
          )}{" "}
          Ajoutez un ajustement sous{" "}
          <span className="font-medium text-[#2A2F3A]">Revenus</span> ou{" "}
          <span className="font-medium text-[#2A2F3A]">BAIIA</span>
          &nbsp;; les montants et pondérations s&apos;éditent dans les cellules. Les notes /
          sources sont regroupées sous le tableau. Enregistrement automatique.
        </p>

        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {hasPecTtm
              ? "BAIIA — PEC, TTM et 5 exercices complets"
              : "BAIIA des 5 derniers exercices"}
          </p>

          <div className="w-full overflow-x-auto overflow-y-visible bg-transparent">
            <table
              className="w-full min-w-[720px] border-collapse"
              data-testid="capitalisation-baiia-table"
            >
              <thead className="[&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-transparent">
                <tr>
                  <th className="w-[28%] py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Poste
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                      title={
                        col.kind === "pec"
                          ? "Période en cours (cumul d'exercice jusqu'à la date de référence)"
                          : col.kind === "ttm"
                            ? "Douze derniers mois se terminant à la date de référence"
                            : undefined
                      }
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-slate-200">
                <tr className="hover:[&>td]:bg-slate-50/60">
                  <td className="py-2 pr-4 text-sm font-medium text-[#2A2F3A]">Revenus</td>
                  {columns.map((col) => (
                    <AmountCell
                      key={`rev-${col.id}`}
                      value={c.getRevenueForColumn(col.id)}
                      testId={`capitalisation-revenue-${col.id}`}
                    />
                  ))}
                </tr>

                <tr>
                  <td className="py-2 pr-4 text-xs italic text-slate-500" colSpan={columnCount}>
                    +/- Ajustements — Revenus
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => c.addAdjustment("revenue")}
                      data-testid="capitalisation-add-adjustment-revenue"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#E0742D] transition-colors hover:text-[#c96526]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  </td>
                </tr>

                <AdjustmentRows
                  adjustments={revenueAdjustments}
                  columns={columns}
                  capitalisation={c}
                />

                {hasRevenueAdjustments ? (
                  <>
                    <tr className="[&>td]:!border-t-2 [&>td]:!border-[#2A2F3A] hover:[&>td]:bg-slate-50/60">
                      <td className="py-2 pr-4 text-sm font-semibold text-[#2A2F3A]">
                        Revenus ajustés
                      </td>
                      {columns.map((col) => (
                        <AmountCell
                          key={`adj-rev-${col.id}`}
                          value={c.getAdjustedRevenueForColumn(col.id)}
                          testId={`capitalisation-adjusted-revenue-${col.id}`}
                        />
                      ))}
                    </tr>
                    <tr
                      aria-hidden
                      data-testid="capitalisation-revenue-spacer"
                      className="[&>td]:!border-0"
                    >
                      <td colSpan={columnCount + 1} className="h-3 p-0" />
                    </tr>
                  </>
                ) : null}

                <tr className="hover:[&>td]:bg-slate-50/60">
                  <td className="py-2 pr-4 text-sm font-medium text-[#2A2F3A]">BAIIA</td>
                  {columns.map((col) => (
                    <AmountCell
                      key={`ebitda-${col.id}`}
                      value={col.ebitda}
                      testId={`capitalisation-ebitda-${col.id}`}
                    />
                  ))}
                </tr>

                <tr>
                  <td className="py-2 pr-4 text-xs italic text-slate-500" colSpan={columnCount}>
                    +/- Ajustements — BAIIA
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => c.addAdjustment("ebitda")}
                      data-testid="capitalisation-add-adjustment"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#E0742D] transition-colors hover:text-[#c96526]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  </td>
                </tr>

                <AdjustmentRows
                  adjustments={ebitdaAdjustments}
                  columns={columns}
                  capitalisation={c}
                />

                <tr className="[&>td]:!border-t-2 [&>td]:!border-[#2A2F3A]">
                  <td className="py-2.5 pr-4 text-sm font-semibold text-[#2A2F3A]">
                    BAIIA ajusté
                  </td>
                  {columns.map((col) => (
                    <AmountCell
                      key={`adj-ebitda-${col.id}`}
                      value={col.adjustedEBITDA}
                      testId={`capitalisation-adjusted-${col.id}`}
                    />
                  ))}
                </tr>

                <tr className="hover:[&>td]:bg-slate-50/60" data-testid="capitalisation-baiia-margin-row">
                  <td className="py-2 pr-4 text-xs italic text-slate-500">
                    {hasRevenueAdjustments ? "% des revenus ajustés" : "% des revenus"}
                  </td>
                  {columns.map((col) => {
                    const revenue = hasRevenueAdjustments
                      ? c.getAdjustedRevenueForColumn(col.id)
                      : c.getRevenueForColumn(col.id)
                    return (
                      <td
                        key={`margin-${col.id}`}
                        data-testid={`capitalisation-baiia-margin-${col.id}`}
                        className="px-2 py-2 text-right font-mono text-sm tabular-nums not-italic text-[#2A2F3A]"
                      >
                        {formatBaiiaToRevenue(col.adjustedEBITDA, revenue)}
                      </td>
                    )
                  })}
                </tr>

                <tr className="hover:[&>td]:bg-slate-50/60">
                  <td className="py-2 pr-4 align-middle text-sm font-medium text-[#2A2F3A]">
                    Pondération
                    <p
                      className={cn(
                        "mt-0.5 text-xs font-normal",
                        weightOk ? "text-slate-500" : "text-amber-700",
                      )}
                    >
                      Somme {weightSumPct}&nbsp;%
                      {!weightOk ? " · cible 100 %" : ""}
                    </p>
                  </td>
                  {columns.map((col) => {
                    const pct = Math.round(col.weight * 1000) / 10
                    return (
                      <EditablePercentCell
                        key={`w-${col.id}`}
                        value={pct}
                        onChange={(nextPct) => c.updateWeightForColumn(col.id, nextPct / 100)}
                        ariaLabel={`Pondération — ${col.label}`}
                        testId={`capitalisation-weight-${col.id}`}
                      />
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <NotesSourcesTable capitalisation={c} />
      </div>
    </NetTangibleReportSection>
  )
}
