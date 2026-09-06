"use client"

import {
  formatCmpcPct,
  type CmpcParamSources,
  type CmpcWaccInputs,
  type CmpcWaccResults,
} from "@/lib/cmpc-wacc"
import { ReportSection } from "./report-section"
import { ParamRow } from "./editable"

type StructureSectionProps = {
  inputs: CmpcWaccInputs
  results: CmpcWaccResults
  sources: CmpcParamSources
  onInputsChange: (next: CmpcWaccInputs) => void
}

export function StructureSection({
  inputs,
  results,
  sources,
  onInputsChange,
}: StructureSectionProps) {
  const equityPct = Math.round(results.weightEquity * 100)
  const debtPct = 100 - equityPct

  const setEquityWeight = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return
    const clipped = Math.min(100, value)
    onInputsChange({
      ...inputs,
      equityWeightPct: clipped,
      debtWeightPct: Math.max(0, 100 - clipped),
    })
  }

  const setDebtWeight = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return
    const clipped = Math.min(100, value)
    onInputsChange({
      ...inputs,
      debtWeightPct: clipped,
      equityWeightPct: Math.max(0, 100 - clipped),
    })
  }

  return (
    <ReportSection number="3." title="Structure de capital">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Les pondérations du CMPC reposent sur la structure de capital de l&apos;entreprise,
        idéalement établie à la valeur de marché ou selon une structure cible représentative du
        secteur. Saisissez les poids en{" "}
        <span className="font-medium text-[#2A2F3A]">pourcentage</span> (somme 100&nbsp;%). La
        capacité de remboursement (Dette / BAIIA) est analysée à l&apos;étape{" "}
        <span className="font-medium text-[#2A2F3A]">Capitalisation</span>.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses (structure cible)
          </p>
          <ParamRow
            label="Capitaux propres (E)"
            value={inputs.equityWeightPct}
            onChange={setEquityWeight}
            testId="cmpc-equity-value"
            unit="%"
            step={1}
            min={0}
            max={100}
            width="w-20"
            hint={sources.equityWeightPct}
            note="Poids cible We (complète automatiquement la dette)"
          />
          <ParamRow
            label="Dette financière nette (D)"
            value={inputs.debtWeightPct}
            onChange={setDebtWeight}
            testId="cmpc-debt-value"
            unit="%"
            step={1}
            min={0}
            max={100}
            width="w-20"
            hint={sources.debtWeightPct}
            note="Poids cible Wd (complète automatiquement les capitaux propres)"
          />
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-[#2A2F3A] pt-2">
            <span className="text-sm font-semibold text-[#2A2F3A]">Total structure</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
              {formatCmpcPct(inputs.equityWeightPct + inputs.debtWeightPct, 0)}
            </span>
          </div>
        </div>

        <div className="mt-6 lg:mt-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pondérations
          </p>
          <div className="flex h-9 w-full overflow-hidden rounded-md border border-slate-200">
            <div
              className="flex items-center justify-center bg-[#E0742D] text-xs font-semibold text-white"
              style={{ width: `${equityPct}%` }}
            >
              {equityPct >= 12 ? `${equityPct} %` : ""}
            </div>
            <div
              className="flex items-center justify-center bg-slate-600 text-xs font-semibold text-white"
              style={{ width: `${debtPct}%` }}
            >
              {debtPct >= 12 ? `${debtPct} %` : ""}
            </div>
          </div>
          <dl className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <dt className="flex items-center gap-2 text-slate-500">
                <span className="size-2.5 rounded-sm bg-[#E0742D]" aria-hidden="true" />
                Poids des capitaux propres (We)
              </dt>
              <dd className="font-mono tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(results.weightEquity * 100)}
              </dd>
            </div>
            <div className="flex items-center justify-between text-sm">
              <dt className="flex items-center gap-2 text-slate-500">
                <span className="size-2.5 rounded-sm bg-slate-600" aria-hidden="true" />
                Poids de la dette (Wd)
              </dt>
              <dd className="font-mono tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(results.weightDebt * 100)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </ReportSection>
  )
}
