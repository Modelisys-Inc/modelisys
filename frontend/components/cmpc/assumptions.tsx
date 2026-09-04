"use client"

import {
  formatCmpcCurrency,
  formatCmpcPct,
  type CmpcParamSources,
  type CmpcWaccInputs,
} from "@/lib/cmpc-wacc"
import { ReportSection } from "./report-section"
import { InlineTextArea } from "./editable"

type AssumptionsProps = {
  inputs: CmpcWaccInputs
  sources: CmpcParamSources
  onSourcesChange: (next: CmpcParamSources) => void
}

const ASSUMPTION_ROWS: {
  key: keyof CmpcParamSources
  param: string
  format: (inputs: CmpcWaccInputs) => string
}[] = [
  {
    key: "riskFreeRate",
    param: "Taux sans risque (Rf)",
    format: (i) => formatCmpcPct(i.riskFreeRate),
  },
  {
    key: "equityRiskPremium",
    param: "Prime de risque du marché (PRM)",
    format: (i) => formatCmpcPct(i.equityRiskPremium),
  },
  {
    key: "beta",
    param: "Bêta (β)",
    format: (i) => `${i.beta.toFixed(2)} ×`,
  },
  {
    key: "sizePremium",
    param: "Prime de taille",
    format: (i) => formatCmpcPct(i.sizePremium),
  },
  {
    key: "specificRiskPremium",
    param: "Prime de risque spécifique",
    format: (i) => formatCmpcPct(i.specificRiskPremium),
  },
  {
    key: "creditSpread",
    param: "Écart de crédit",
    format: (i) => formatCmpcPct(i.creditSpread),
  },
  {
    key: "taxRate",
    param: "Taux d'imposition",
    format: (i) => formatCmpcPct(i.taxRate, 1),
  },
  {
    key: "equityValue",
    param: "Capitaux propres (E)",
    format: (i) => formatCmpcCurrency(i.equityValue),
  },
  {
    key: "debtValue",
    param: "Dette financière nette (D)",
    format: (i) => formatCmpcCurrency(i.debtValue),
  },
]

export function Assumptions({ inputs, sources, onSourcesChange }: AssumptionsProps) {
  const updateSource = (key: keyof CmpcParamSources) => (value: string) =>
    onSourcesChange({ ...sources, [key]: value })

  return (
    <ReportSection number="5." title="Sommaire des hypothèses et sources">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b-2 border-[#2A2F3A] text-left">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paramètre
              </th>
              <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valeur
              </th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source / justification
              </th>
            </tr>
          </thead>
          <tbody>
            {ASSUMPTION_ROWS.map((r) => (
              <tr key={r.key} className="border-b border-slate-200 align-top">
                <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">{r.param}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                  {r.format(inputs)}
                </td>
                <td className="py-2.5">
                  <InlineTextArea
                    value={sources[r.key]}
                    onChange={updateSource(r.key)}
                    ariaLabel={`Source / justification — ${r.param}`}
                    placeholder="Source / justification"
                    testId={`cmpc-source-${r.key}`}
                    rows={2}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  )
}
