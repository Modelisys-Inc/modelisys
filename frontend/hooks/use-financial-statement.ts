"use client"

import { useState, useEffect } from "react"
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getCashFlowDetail,
  type FinancialStatementRow,
  type FinancialStatementParams,
  type FinancialStatementResponse,
} from "@/lib/api"

type StatementType = "income-statement" | "balance-sheet" | "cash-flow" | "cash-flow-detail"

const fetchers: Record<StatementType, typeof getIncomeStatement> = {
  "income-statement": getIncomeStatement,
  "balance-sheet": getBalanceSheet,
  "cash-flow": getCashFlow,
  "cash-flow-detail": getCashFlowDetail,
}

export function useFinancialStatement(
  companyId: string | null,
  type: StatementType,
  params: FinancialStatementParams
) {
  const [data, setData] = useState<FinancialStatementResponse | null>(null)
  const [rows, setRows] = useState<FinancialStatementRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) {
      setRows([])
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const fetcher = fetchers[type]
    if (!fetcher) {
      setError(`Unsupported statement type: ${type}`)
      setRows([])
      setData(null)
      setLoading(false)
      return
    }

    fetcher(companyId, params)
      .then((response) => {
        setData(response)
        setRows(response.rows)
      })
      .catch((err) => {
        setError(err.message || "Failed to load financial statement")
        setRows([])
        setData(null)
      })
      .finally(() => setLoading(false))
    // Re-fetch when any param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyId,
    type,
    params.fiscal_year,
    params.month,
    params.period,
    params.comparison_type,
    params.budget_id,
    params.division_id,
    params.sub_division_id,
    params.structure_rev,
  ])

  return { data, rows, loading, error }
}
