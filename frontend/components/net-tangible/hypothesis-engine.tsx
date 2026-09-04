"use client"

import { LabelWithHint, ParamRow } from "@/components/cmpc/editable"
import { NetTangibleJvmCapexEditor } from "@/components/net-tangible-jvm-capex-editor"
import { NetTangibleSurplusEditor } from "@/components/net-tangible-surplus-editor"
import { formatCurrency } from "@/lib/financial-utils"
import {
  computeNetTangibleBuildup,
  leafInputLabel,
  leafInputUnit,
  leafModeHint,
  leafModeOptions,
  materialityHint,
  type NetTangibleBuildup,
  type NetTangibleHypothesisField,
  type NetTangibleLeafInputMode,
} from "@/lib/net-tangible-hypothesis-engine"
import type { NetTangibleJvmCapexPost } from "@/lib/net-tangible-jvm-capex"
import type { NetTangibleSurplusPost } from "@/lib/net-tangible-surplus-assets"
import { cn } from "@/lib/utils"

type HypothesisEngineProps = {
  field: NetTangibleHypothesisField
  rowLabel: string
  referenceColumnLabel?: string
  bookValue: number
  /** Valeurs des trois colonnes (brouillon live pour le champ actif). */
  adjustments: number
  debts: number
  assets: number
  annexMode: "jvm-capex" | "surplus" | null
  leafMode: NetTangibleLeafInputMode
  leafInput: number
  note: string
  jvmPosts: NetTangibleJvmCapexPost[]
  surplusPosts: NetTangibleSurplusPost[]
  onLeafModeChange: (mode: NetTangibleLeafInputMode) => void
  onLeafInputChange: (value: number) => void
  onNoteChange: (note: string) => void
  onJvmPostsChange: (posts: NetTangibleJvmCapexPost[]) => void
  onSurplusPostsChange: (posts: NetTangibleSurplusPost[]) => void
  onClose: () => void
}

function BuildupRow({
  operator,
  label,
  detail,
  value,
  total,
  testId,
}: {
  operator: string
  label: string
  detail?: string
  value: string
  total?: boolean
  testId?: string
}) {
  return (
    <tr className={total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200"}>
      <td className="w-6 py-2 pr-1 text-center font-mono text-sm text-slate-500">{operator}</td>
      <td className="py-2 pr-4">
        <span className={`text-sm ${total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]"}`}>
          {label}
        </span>
        {detail ? (
          <span className="ml-2 font-mono text-xs text-slate-500">{detail}</span>
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

function BuildupTable({ buildup, highlightField }: { buildup: NetTangibleBuildup; highlightField: NetTangibleHypothesisField }) {
  return (
    <table className="w-full" data-testid="nta-hypothesis-buildup">
      <tbody>
        <BuildupRow
          operator=""
          label="Valeur comptable"
          value={formatCurrency(buildup.vc)}
          testId="nta-buildup-vc"
        />
        <BuildupRow
          operator={buildup.adjustments < 0 ? "−" : "+"}
          label="Ajustements"
          detail={highlightField === "adjustments" ? "en cours" : undefined}
          value={formatCurrency(Math.abs(buildup.adjustments))}
          testId="nta-buildup-adjustments"
        />
        <BuildupRow
          operator="="
          label="VCA"
          value={formatCurrency(buildup.vca)}
          testId="nta-buildup-vca"
        />
        <BuildupRow
          operator="−"
          label="Dettes"
          detail={highlightField === "debts" ? "en cours" : undefined}
          value={formatCurrency(buildup.debts)}
          testId="nta-buildup-debts"
        />
        <BuildupRow
          operator="−"
          label="Excédent"
          detail={highlightField === "assets" ? "en cours" : undefined}
          value={formatCurrency(buildup.assets)}
          testId="nta-buildup-assets"
        />
        <BuildupRow
          operator="="
          label="ACN"
          value={formatCurrency(buildup.acn)}
          total
          testId="nta-buildup-acn"
        />
      </tbody>
    </table>
  )
}

const FIELD_TITLE: Record<NetTangibleHypothesisField, string> = {
  adjustments: "Ajustements",
  debts: "Dettes",
  assets: "Excédent",
}

export function NetTangibleHypothesisEngine({
  field,
  rowLabel,
  referenceColumnLabel,
  bookValue,
  adjustments,
  debts,
  assets,
  annexMode,
  leafMode,
  leafInput,
  note,
  jvmPosts,
  surplusPosts,
  onLeafModeChange,
  onLeafInputChange,
  onNoteChange,
  onJvmPostsChange,
  onSurplusPostsChange,
  onClose,
}: HypothesisEngineProps) {
  const buildup = computeNetTangibleBuildup({ vc: bookValue, adjustments, debts, assets })
  const modes = leafModeOptions(field)
  const activeDollar =
    field === "adjustments" ? adjustments : field === "debts" ? debts : assets
  const materiality = annexMode ? null : materialityHint(activeDollar, bookValue)

  const title =
    annexMode === "jvm-capex"
      ? "JVM Capex"
      : annexMode === "surplus"
        ? "Excédent"
        : FIELD_TITLE[field]

  return (
    <div className="min-w-0 max-w-full bg-white px-3 py-4 sm:px-5 sm:py-5" data-testid="nta-hypothesis-engine">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Hypothèse — {title}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
            {rowLabel}
          </h3>
          {referenceColumnLabel ? (
            <p className="mt-2 text-xs text-slate-500">
              Référence · <span className="font-medium text-[#2A2F3A]">{referenceColumnLabel}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          data-testid="net-tangible-hypothesis-close"
          onClick={onClose}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#2A2F3A] shadow-sm transition-colors hover:bg-slate-50"
        >
          Fermer
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses
          </p>

          {annexMode === "jvm-capex" ? (
            <>
              <p className="mb-3 text-pretty text-xs leading-relaxed text-slate-500">
                Indiquez la JVM de chaque poste d&apos;annexe. L&apos;ajustement parent = Σ (JVM − VC).
                Les notes et pièces alimentent le sommaire des sources.
              </p>
              <NetTangibleJvmCapexEditor
                posts={jvmPosts}
                onChange={onJvmPostsChange}
                referenceLabel={referenceColumnLabel}
              />
            </>
          ) : annexMode === "surplus" ? (
            <>
              <p className="mb-3 text-pretty text-xs leading-relaxed text-slate-500">
                La JVM provient des Ajustements. Saisissez l&apos;excédent par poste ; le total
                Excédent = Σ Excédent. Seule la portion non nécessaire à l&apos;exploitation est
                retranchée de l&apos;ACN.
              </p>
              <NetTangibleSurplusEditor
                posts={surplusPosts}
                onChange={onSurplusPostsChange}
                referenceLabel={referenceColumnLabel}
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2A2F3A]">
                    <LabelWithHint
                      label="Valeur comptable"
                      hint="Solde au bilan à la date de référence (colonne VC)."
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">Lecture seule · base du calcul</p>
                </div>
                <span className="font-mono text-sm tabular-nums text-[#2A2F3A]">
                  {formatCurrency(bookValue)}
                </span>
              </div>

              <div className="border-b border-slate-200 py-2.5">
                <div className="text-sm font-medium text-[#2A2F3A]">
                  <LabelWithHint
                    label="Mode de saisie"
                    hint="Choisissez comment exprimer l’hypothèse ; le montant $ est toujours recalculé et persisté."
                  />
                </div>
                <p className="mt-0.5 text-pretty text-xs text-slate-500">
                  {leafModeHint(field, leafMode)}
                </p>
                <div className="mt-2 inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                  {modes.map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`nta-leaf-mode-${mode}`}
                      onClick={() => onLeafModeChange(mode)}
                      className={cn(
                        "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                        leafMode === mode
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
                label={leafInputLabel(field, leafMode)}
                hint={leafModeHint(field, leafMode)}
                value={leafInput}
                onChange={(v) => onLeafInputChange(Number.isFinite(v) ? v : 0)}
                unit={leafInputUnit(leafMode)}
                step={leafMode === "percent-vc" ? 0.1 : 1}
                width="w-28"
                testId={`net-tangible-hypothesis-${field}`}
                note={note}
                onNoteChange={onNoteChange}
                noteTestId={`net-tangible-hypothesis-note-${field}`}
              />

              {materiality ? (
                <p
                  className="mt-2 text-pretty text-xs leading-relaxed text-amber-800"
                  data-testid="nta-hypothesis-materiality"
                >
                  {materiality}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calcul du poste
          </p>
          <BuildupTable buildup={buildup} highlightField={field} />
          {annexMode === "jvm-capex" ? (
            <p className="mt-3 text-pretty text-xs text-slate-500">
              L&apos;ajustement affiché ci-dessus reflète la somme des écarts JVM − VC de
              l&apos;annexe.
            </p>
          ) : null}
          {annexMode === "surplus" ? (
            <p className="mt-3 text-pretty text-xs text-slate-500">
              L&apos;excédent affiché correspond à la somme des excédents d&apos;annexe.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
