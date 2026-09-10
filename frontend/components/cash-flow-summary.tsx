"use client"

import { CashFlowDetail } from "@/components/cash-flow-detail"
import type { Company } from "@/components/entity-selector"
import type { FinancialStatementRow } from "@/lib/api"

interface CashFlowSummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  refMonth?: number
  refYear?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showCashFlowStructureSettings?: boolean
  structureVersion?: number
  onCashFlowStructureSaved?: () => void
  showSummaryStructureSettings?: boolean
  onSummaryStructureSaved?: () => void
  projectionYears?: 3 | 4 | 5
  forecastBaseYear?: number
  forecastUseSeriesActuals?: boolean
  forecastActualLayout?: "single-prior-year" | "nMinusOne-and-ytd"
  periodBasis?: "current" | "fiscal"
  projectionId?: string | null
  disableRowInteractions?: boolean
}

/**
 * Sommaire trésorerie : mêmes montants que le Détail, limité aux postes cochés
 * « Annexe » dans Détail → Paramètres (`showInSummary`).
 * Paramètres Sommaire : espace / gras / séparation (overlay, sans toucher au Détail).
 */
export function CashFlowSummary({
  title = "Sommaire",
  structureVersion = 0,
  showCashFlowStructureSettings: _ignored,
  onCashFlowStructureSaved: _ignoredSave,
  showSummaryStructureSettings = false,
  onSummaryStructureSaved,
  ...props
}: CashFlowSummaryProps) {
  return (
    <CashFlowDetail
      {...props}
      title={title}
      variant="summary"
      showDetailStructureSettings={false}
      detailStructureVersion={structureVersion}
      showSummaryStructureSettings={showSummaryStructureSettings}
      onSummaryStructureSaved={onSummaryStructureSaved}
    />
  )
}
