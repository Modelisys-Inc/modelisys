import { formatCmpcPct, type CmpcWaccResults } from "@/lib/cmpc-wacc"

type ConclusionProps = {
  results: CmpcWaccResults
}

export function Conclusion({ results }: ConclusionProps) {
  const { wacc, costOfEquity, afterTaxCostOfDebt, weightEquity, weightDebt } = results

  const metrics = [
    {
      id: "retained",
      label: "CMPC retenu",
      value: formatCmpcPct(wacc),
      testId: "cmpc-retained-rate",
      highlight: true,
    },
    {
      id: "equity",
      label: "Coût des capitaux propres",
      value: formatCmpcPct(costOfEquity),
    },
    {
      id: "debt",
      label: "Coût de la dette (après impôt)",
      value: formatCmpcPct(afterTaxCostOfDebt),
    },
    {
      id: "equity-weight",
      label: "Pondération des capitaux propres",
      value: formatCmpcPct(weightEquity * 100, 0),
    },
    {
      id: "debt-weight",
      label: "Pondération de la dette",
      value: formatCmpcPct(weightDebt * 100, 0),
    },
  ]

  return (
    <section
      data-testid="cmpc-conclusion-strip"
      data-break-avoid
      className="w-full border-b border-[#E6D6C3]/45 bg-gradient-to-b from-[#222732]/[0.025] to-white"
    >
      <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-12">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
              Sommaire de la conclusion
            </p>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              Synthèse du coût moyen pondéré du capital et de ses composantes.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-6 py-1 sm:px-12">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="border-b border-[#E6D6C3]/55 text-left">
              <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Indicateur
              </th>
              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valeur
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr
                key={metric.id}
                data-testid={metric.testId ? undefined : `cmpc-conclusion-${metric.id}`}
                className="border-b border-slate-100 align-middle last:border-b-0"
              >
                <td className="py-3 pr-4 text-sm font-medium text-[#222732]">{metric.label}</td>
                <td
                  data-testid={metric.testId}
                  className={`py-3 text-right font-mono text-sm tabular-nums ${
                    metric.highlight ? "font-semibold text-[#E0742D]" : "text-[#222732]"
                  }`}
                >
                  {metric.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
