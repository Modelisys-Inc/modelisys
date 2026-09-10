import { formatCmpcPct, type CmpcWaccResults } from "@/lib/cmpc-wacc"
import { ReportSection } from "./report-section"

type DeterminationProps = {
  results: CmpcWaccResults
}

export function Determination({ results }: DeterminationProps) {
  const {
    weightEquity,
    weightDebt,
    costOfEquity,
    afterTaxCostOfDebt,
    equityContribution,
    debtContribution,
    wacc,
  } = results

  return (
    <ReportSection number="4." title="Détermination du coût moyen pondéré du capital">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Le CMPC est la moyenne des coûts des capitaux propres et de la dette, pondérée par leur
        poids respectif dans la structure de capital&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        CMPC = We × Ke + Wd × Kd
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] border border-slate-200">
          <thead>
            <tr className="bg-[#2A2F3A] text-white">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                Source de capital
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                Pondération
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                Coût
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                Contribution
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 text-sm text-[#2A2F3A]">Capitaux propres</td>
              <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(weightEquity * 100)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(costOfEquity)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(equityContribution)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-4 py-3 text-sm text-[#2A2F3A]">Dette (après impôt)</td>
              <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(weightDebt * 100)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(afterTaxCostOfDebt)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                {formatCmpcPct(debtContribution)}
              </td>
            </tr>
            <tr className="bg-slate-100/80">
              <td className="px-4 py-3 text-sm font-semibold text-[#2A2F3A]" colSpan={3}>
                Coût moyen pondéré du capital (CMPC)
              </td>
              <td className="px-4 py-3 text-right font-mono text-base font-semibold tabular-nums text-[#E0742D]">
                {formatCmpcPct(wacc)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ReportSection>
  )
}
