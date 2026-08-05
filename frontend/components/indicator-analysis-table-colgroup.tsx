const METRIC_COL_PERCENT = 34
const AVERAGE_COL_PERCENT = 14

function periodColPercent(periodCount: number): number {
  if (periodCount <= 0) return 0
  return (100 - METRIC_COL_PERCENT - AVERAGE_COL_PERCENT) / periodCount
}

/** Répartit la largeur du tableau indicateur (Capex, FDR) sur toute la largeur disponible. */
export function IndicatorAnalysisTableColGroup({ periodCount }: { periodCount: number }) {
  const periodWidth = periodColPercent(periodCount)
  return (
    <colgroup>
      <col style={{ width: `${METRIC_COL_PERCENT}%` }} />
      <col style={{ width: `${AVERAGE_COL_PERCENT}%` }} />
      {Array.from({ length: periodCount }, (_, index) => (
        <col key={index} style={{ width: `${periodWidth}%` }} />
      ))}
    </colgroup>
  )
}
