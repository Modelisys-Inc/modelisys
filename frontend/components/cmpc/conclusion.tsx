import {
  formatCmpcPct,
  cmpcWaccRange,
  type CmpcReportMeta,
  type CmpcWaccResults,
} from "@/lib/cmpc-wacc"

type ConclusionProps = {
  results: CmpcWaccResults
  meta: CmpcReportMeta
}

export function Conclusion({ results, meta }: ConclusionProps) {
  const { wacc, costOfEquity, afterTaxCostOfDebt } = results
  const range = cmpcWaccRange(wacc)

  return (
    <section
      className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[#2A2F3A] text-white shadow-sm"
      data-break-avoid
    >
      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
            Sommaire de la conclusion
          </p>
          <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-white/85">
            Sur la base des hypothèses et de la méthodologie exposées dans le présent rapport, nous
            sommes d&apos;avis que le coût moyen pondéré du capital approprié pour actualiser les
            flux de trésorerie après impôt de{" "}
            <span className="font-medium text-white">{meta.subject}</span>, en date du{" "}
            <span className="font-medium text-white">{meta.valuationDate}</span>, se situe dans une
            fourchette d&apos;environ{" "}
            <span className="font-mono font-medium text-[#E0742D]">
              {formatCmpcPct(range.low, 2)}
            </span>{" "}
            à{" "}
            <span className="font-mono font-medium text-[#E0742D]">
              {formatCmpcPct(range.high, 2)}
            </span>
            .
          </p>
          <p className="mt-3 text-xs text-white/60">
            Taux ponctuel calculé : {formatCmpcPct(wacc)} · Taux retenu (arrondi) :{" "}
            {formatCmpcPct(range.retained)}
          </p>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="text-xs font-medium uppercase tracking-wide text-white/60">
            CMPC retenu
          </span>
          <span
            data-testid="cmpc-retained-rate"
            className="font-mono text-5xl font-semibold tabular-nums text-[#E0742D]"
          >
            {formatCmpcPct(range.retained)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 text-center">
        <div className="px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-white/55">
            Coût des capitaux propres
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatCmpcPct(costOfEquity)}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-white/55">
            Coût de la dette (après impôt)
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
            {formatCmpcPct(afterTaxCostOfDebt)}
          </p>
        </div>
        <div className="px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-white/55">CMPC (ponctuel)</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#E0742D]">
            {formatCmpcPct(wacc)}
          </p>
        </div>
      </div>
    </section>
  )
}
