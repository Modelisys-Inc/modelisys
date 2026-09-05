"use client"

import {
  formatCmpcCurrency,
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
  update: (key: keyof CmpcWaccInputs) => (value: number) => void
}

export function StructureSection({
  inputs,
  results,
  sources,
  update,
}: StructureSectionProps) {
  const equityPct = Math.round(results.weightEquity * 100)
  const debtPct = 100 - equityPct

  return (
    <ReportSection number="3." title="Structure de capital">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Les pondérations du CMPC reposent sur la structure de capital de l&apos;entreprise,
        idéalement établie à la valeur de marché ou selon une structure cible représentative du
        secteur. Elles déterminent le poids relatif des capitaux propres et de la dette dans le
        coût global du capital. La capacité de remboursement (Dette / BAIIA) est analysée à
        l&apos;étape <span className="font-medium text-[#2A2F3A]">Capitalisation</span>.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses (valeurs de marché ou cibles)
          </p>
          <ParamRow
            label="Capitaux propres (E)"
            value={inputs.equityValue}
            onChange={update("equityValue")}
            testId="cmpc-equity-value"
            unit="$"
            step={100_000}
            min={0}
            width="w-36"
            hint={sources.equityValue}
            note="Valeur de marché estimée ou cible"
          />
          <ParamRow
            label="Dette financière nette (D)"
            value={inputs.debtValue}
            onChange={update("debtValue")}
            testId="cmpc-debt-value"
            unit="$"
            step={100_000}
            min={0}
            width="w-36"
            hint={sources.debtValue}
            note="Dette portant intérêt, nette de la trésorerie"
          />
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-[#2A2F3A] pt-2">
            <span className="text-sm font-semibold text-[#2A2F3A]">Capital total investi</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-[#2A2F3A]">
              {formatCmpcCurrency(results.totalCapital)}
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
