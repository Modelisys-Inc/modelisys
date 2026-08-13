import { describe, expect, it } from "vitest"
import {
  companyReportPrintAnalyses,
  formatPerformanceSidePanelComparisonLabel,
  getCompanyReportRevenueAnalysisChartXAxis,
  getCompanyReportRevenueAnalysisHorizonLabel,
  getCompanyReportRevenueAnalysisMonthlyCount,
  getCompanyReportRevenueAnalysisSidePanelComparison,
  plotRevenueAnalysisChartPoints,
} from "@/lib/company-report-module"

describe("company-report-module revenue analysis", () => {
  it("affiche 13 mois sur le graphique Analyse des revenus", () => {
    expect(getCompanyReportRevenueAnalysisMonthlyCount("pilotage")).toBe(13)
    expect(getCompanyReportRevenueAnalysisMonthlyCount("diagnostic")).toBe(13)
  })

  it("compare le panneau latéral au même mois N-1", () => {
    const comparison = getCompanyReportRevenueAnalysisSidePanelComparison(13)
    expect(comparison.priorIndex).toBe(12)
    expect(comparison.useComparisonPeriodLabel).toBe(true)
    expect(formatPerformanceSidePanelComparisonLabel(comparison, "Aoû 2025")).toBe("vs Aoû 2025")
  })

  it("affiche Mensuel comme libellé d'horizon (pas « 24 mois »)", () => {
    expect(getCompanyReportRevenueAnalysisHorizonLabel("pilotage")).toBe("Mensuel")
    expect(getCompanyReportRevenueAnalysisHorizonLabel("diagnostic")).toBe("Mensuel")
  })

  it("trace Analyse des revenus en ordre chronologique pour le pilotage", () => {
    const points = [
      { period: "Aoû 2026", value: 1 },
      { period: "Jul 2026", value: 2 },
      { period: "Aoû 2025", value: 3 },
    ]
    expect(plotRevenueAnalysisChartPoints(points, "pilotage").map((p) => p.period)).toEqual([
      "Aoû 2025",
      "Jul 2026",
      "Aoû 2026",
    ])
    expect(plotRevenueAnalysisChartPoints(points, "diagnostic").map((p) => p.period)).toEqual([
      "Aoû 2026",
      "Jul 2026",
      "Aoû 2025",
    ])
  })

  it("configure l'axe X pilotage avec tous les mois visibles", () => {
    expect(getCompanyReportRevenueAnalysisChartXAxis("pilotage")).toMatchObject({
      interval: 0,
      angle: -45,
    })
    expect(getCompanyReportRevenueAnalysisChartXAxis("diagnostic")).toBeNull()
  })

  it("exclut Situation financière du rapport pilotage", () => {
    const pilotageViews = companyReportPrintAnalyses("pilotage").map((analysis) => analysis.viewId)
    const diagnosticViews = companyReportPrintAnalyses("diagnostic").map((analysis) => analysis.viewId)

    expect(pilotageViews).not.toContain("financial-position")
    expect(diagnosticViews).toContain("financial-position")
    expect(pilotageViews).toContain("working-capital")
    expect(pilotageViews).toContain("capex")
  })
})
