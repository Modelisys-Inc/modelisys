"use client"

import {
  formatCmpcPct,
  type CmpcParamSources,
  type CmpcWaccInputs,
  type CmpcWaccResults,
} from "@/lib/cmpc-wacc"
import { ReportSection } from "./report-section"
import { ParamRow } from "./editable"

type DebtSectionProps = {
  inputs: CmpcWaccInputs
  results: CmpcWaccResults
  sources: CmpcParamSources
  update: (key: keyof CmpcWaccInputs) => (value: number) => void
}

function CalcRow({
  label,
  value,
  total,
  negative,
}: {
  label: string
  value: string
  total?: boolean
  negative?: boolean
}) {
  return (
    <tr className={total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200"}>
      <td className="py-2 pr-4">
        <span className={`text-sm ${total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]"}`}>
          {label}
        </span>
      </td>
      <td
        className={`py-2 text-right font-mono text-sm tabular-nums ${
          total
            ? "font-semibold text-[#E0742D]"
            : negative
              ? "text-slate-500"
              : "text-[#2A2F3A]"
        }`}
      >
        {value}
      </td>
    </tr>
  )
}

export function DebtSection({ inputs, results, sources, update }: DebtSectionProps) {
  return (
    <ReportSection number="2." title="Coût de la dette (Kd)">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Le coût de la dette représente le taux d&apos;intérêt qu&apos;un prêteur exigerait pour
        financer l&apos;entreprise, compte tenu de sa qualité de crédit. Il est estimé en ajoutant
        un écart de crédit au taux sans risque, puis rendu net de l&apos;économie d&apos;impôt
        (bouclier fiscal), les intérêts étant généralement déductibles. La formule retenue
        est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        Kd = (Rf + écart de crédit) × (1 − taux d&apos;imposition)
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses
          </p>
          <ParamRow
            label="Écart de crédit (spread)"
            value={inputs.creditSpread}
            onChange={update("creditSpread")}
            testId="cmpc-credit-spread"
            hint={sources.creditSpread}
            note="Selon la qualité de crédit estimée"
          />
          <ParamRow
            label="Taux d'imposition"
            value={inputs.taxRate}
            onChange={update("taxRate")}
            testId="cmpc-tax-rate"
            hint={sources.taxRate}
            note="Taux combiné fédéral et provincial"
          />
        </div>

        <div className="mt-6 lg:mt-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calcul du coût de la dette
          </p>
          <table className="w-full">
            <tbody>
              <CalcRow label="Taux sans risque" value={formatCmpcPct(inputs.riskFreeRate)} />
              <CalcRow label="Écart de crédit" value={`+ ${formatCmpcPct(inputs.creditSpread)}`} />
              <CalcRow
                label="Coût de la dette avant impôt"
                value={formatCmpcPct(results.preTaxCostOfDebt)}
              />
              <CalcRow
                label={`Économie d'impôt (${formatCmpcPct(inputs.taxRate, 1)})`}
                value={`− ${formatCmpcPct(results.taxShield)}`}
                negative
              />
              <CalcRow
                label="Coût de la dette après impôt (Kd)"
                value={formatCmpcPct(results.afterTaxCostOfDebt)}
                total
              />
            </tbody>
          </table>
        </div>
      </div>
    </ReportSection>
  )
}
