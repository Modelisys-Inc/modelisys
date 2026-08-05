"use client"

import { useEffect, useMemo, useState } from "react"
import type { Company } from "@/components/entity-selector"
import type { CompanyDiagnostic } from "@/lib/api"
import { listAccountMappings, type AccountMappingData } from "@/lib/api"
import { buildDiagnosticNarrativeBundle, type DiagnosticNarrativeBundle } from "@/lib/diagnostic-narrative-bundle"
import { useDiagnosticReportSlotBundles } from "@/hooks/use-diagnostic-report-slot-bundles"
import { useDivisionSeriesBundle } from "@/hooks/use-division-series-bundle"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { performanceChartSeriesMonthsNeeded } from "@/lib/performance-chart-series"

const EXECUTIVE_SUMMARY_VIEW = "years"

export function useExecutiveSummaryNarratives(
  companyId: string | null,
  diagnostic: CompanyDiagnostic,
  companies: Company[],
): {
  bundle: DiagnosticNarrativeBundle | null
  loading: boolean
} {
  const refMonth = diagnostic.reference_period.calendar_month
  const refYear = diagnostic.reference_period.calendar_year
  const months = performanceChartSeriesMonthsNeeded(EXECUTIVE_SUMMARY_VIEW)
  const divisions = useMemo(
    () => companies.find((c) => c.id === companyId)?.divisions ?? [],
    [companies, companyId],
  )

  const { bundleForView, anyLoading: slotsLoading } = useDiagnosticReportSlotBundles(companyId ?? "")
  const revenueBundle = bundleForView("revenue")
  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(false, undefined, Boolean(companyId))

  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } =
    useFinancialStatementSeries({
      companyId,
      statementType: "income-statement",
      fiscalYear: refYear,
      month: refMonth,
      months,
      enabled: Boolean(companyId),
    })

  const {
    bundles: divisionSeriesBundles,
    loading: divisionSeriesLoading,
  } = useDivisionSeriesBundle({
    companyId,
    divisions,
    fiscalYear: refYear,
    month: refMonth,
    months,
    enabled: Boolean(companyId) && divisions.length > 0,
  })

  const [accountMappings, setAccountMappings] = useState<AccountMappingData[]>([])

  useEffect(() => {
    if (!companyId) {
      setAccountMappings([])
      return
    }
    let cancelled = false
    listAccountMappings(companyId)
      .then((mappings) => {
        if (!cancelled) setAccountMappings(mappings)
      })
      .catch(() => {
        if (!cancelled) setAccountMappings([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  const bundle = useMemo(() => {
    if (!companyId || !seriesRows.length || !seriesPeriods.length) return null
    return buildDiagnosticNarrativeBundle({
      view: EXECUTIVE_SUMMARY_VIEW,
      refMonth,
      refYear,
      accountMappings,
      standardLinkCodes,
      seriesRows,
      seriesPeriods,
      revenueSlot: revenueBundle?.activeSlot ?? null,
      divisions,
      divisionSeriesBundles,
    })
  }, [
    companyId,
    refMonth,
    refYear,
    accountMappings,
    standardLinkCodes,
    seriesRows,
    seriesPeriods,
    revenueBundle?.activeSlot,
    divisions,
    divisionSeriesBundles,
  ])

  const loading = slotsLoading || seriesLoading || divisionSeriesLoading

  return { bundle, loading: Boolean(companyId) && loading }
}
