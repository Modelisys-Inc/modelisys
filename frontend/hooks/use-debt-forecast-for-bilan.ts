import { useEffect, useMemo, useState } from "react"
import { listForecastConfigs } from "@/lib/api"
import type { DebtForecastLoan } from "@/lib/debt-forecast-types"
import {
  DEBT_FORECAST_CONFIG_TYPE,
  parseDebtForecastLoans,
  resolveFinancingDrivenBilanProjectedAmount,
} from "@/lib/debt-forecast-resolve"

export function useDebtForecastForBilan(opts: {
  companyId?: string | null
  projectionId?: string | null
  enabled?: boolean
}): {
  loans: DebtForecastLoan[]
  resolveProjectedAmount: (
    rowId: string,
    linkCode: string | null | undefined,
    configYearIndex: number,
    actualBase: number,
  ) => number
  loading: boolean
} {
  const { companyId, projectionId, enabled = true } = opts
  const [loans, setLoans] = useState<DebtForecastLoan[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !companyId) {
      setLoans([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    listForecastConfigs(companyId, {
      config_type: DEBT_FORECAST_CONFIG_TYPE,
      projection_id: projectionId ?? undefined,
    })
      .then((cfgs) => {
        if (cancelled) return
        setLoans(parseDebtForecastLoans(cfgs[0]?.data ?? {}))
      })
      .catch(() => {
        if (!cancelled) setLoans([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, enabled, projectionId])

  const resolveProjectedAmount = useMemo(() => {
    return (
      rowId: string,
      linkCode: string | null | undefined,
      configYearIndex: number,
      actualBase: number,
    ) =>
      resolveFinancingDrivenBilanProjectedAmount({
        rowId,
        linkCode,
        configYearIndex,
        actualBase,
        loans,
      })
  }, [loans])

  return { loans, resolveProjectedAmount, loading }
}
