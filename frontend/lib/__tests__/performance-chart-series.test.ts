import { describe, it, expect } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  buildPerformanceChartData,
  findSeriesRowByCode,
  isChartMetricSpecConfigured,
} from "@/lib/performance-chart-series"
import type { StatementChartConfig } from "@/lib/statement-chart-config"

const periods: SeriesPeriod[] = [
  { fiscalYear: 2024, fiscalMonth: 1, label: "Jan 2024" },
  { fiscalYear: 2024, fiscalMonth: 2, label: "Fév 2024" },
]

function row(id: string, linkCode: string, amounts: Record<string, number>): SeriesRow {
  return {
    id,
    linkCode,
    label: id,
    isBold: false,
    isSection: false,
    isResult: false,
    amounts,
    detailRows: [],
  }
}

describe("findSeriesRowByCode", () => {
  const rows: SeriesRow[] = [
    row("rev", "REV-001", { "2024-1": 100, "2024-2": 200 }),
    {
      id: "parent",
      label: "Parent",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: {},
      detailRows: [{ id: "4000", label: "GL 4000", amounts: { "2024-1": 50, "2024-2": 60 } }],
    },
  ]

  it("finds by linkCode", () => {
    expect(findSeriesRowByCode(rows, "REV-001")?.amounts["2024-1"]).toBe(100)
  })

  it("finds row by summary label", () => {
    const withBaiia: SeriesRow[] = [
      ...rows,
      {
        id: "BAIIA",
        label: "BAIIA",
        isBold: true,
        isSection: false,
        isResult: false,
        amounts: { "2024-1": -4000, "2024-2": -4200 },
        detailRows: [],
      },
    ]
    expect(findSeriesRowByCode(withBaiia, "BAIIA")?.amounts["2024-1"]).toBe(-4000)
  })

  it("finds detail row by account id", () => {
    expect(findSeriesRowByCode(rows, "4000")?.amounts["2024-1"]).toBe(50)
  })
})

describe("sumCodesSeries resilience", () => {
  it("skips unresolvable codes in sum mode", () => {
    const rows: SeriesRow[] = [row("rev", "REV-001", { "2024-1": 1000, "2024-2": 1200 })]
    const config: StatementChartConfig = {
      version: 2,
      chartTitle: "Test",
      series: [
        {
          id: "s1",
          kind: "bar",
          label: "Partiel",
          spec: { type: "sum", codes: ["REV-001", "MISSING"] },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
        },
      ],
    }
    const built = buildPerformanceChartData(config, rows, periods, "12months", 2, 2024)
    expect(built).not.toBeNull()
    expect(built!.series).toHaveLength(1)
  })
})

describe("isChartMetricSpecConfigured", () => {
  it("rejects empty single code", () => {
    expect(isChartMetricSpecConfigured({ type: "single", code: "" })).toBe(false)
    expect(isChartMetricSpecConfigured({ type: "single", code: "REV" })).toBe(true)
  })
})

describe("buildPerformanceChartData", () => {
  const rows: SeriesRow[] = [row("rev", "REV-001", { "2024-1": 1000, "2024-2": 1200 })]

  it("renders configured series even when other slots are still empty", () => {
    const config: StatementChartConfig = {
      version: 2,
      chartTitle: "Test",
      series: [
        {
          id: "s1",
          kind: "bar",
          label: "Revenus",
          spec: { type: "single", code: "REV-001" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
        },
        {
          id: "s2",
          kind: "bar",
          label: "BAIIA",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#10b981",
        },
      ],
    }

    const built = buildPerformanceChartData(config, rows, periods, "12months", 2, 2024)
    expect(built).not.toBeNull()
    expect(built!.series).toHaveLength(1)
    expect(built!.series[0]!.label).toBe("Revenus")
    expect(built!.points.length).toBe(12)
  })

  it("returns null when no series can be resolved", () => {
    const config: StatementChartConfig = {
      version: 2,
      chartTitle: "Test",
      series: [
        {
          id: "s1",
          kind: "bar",
          label: "Vide",
          spec: { type: "single", code: "" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
        },
      ],
    }
    expect(buildPerformanceChartData(config, rows, periods, "12months", 2, 2024)).toBeNull()
  })

  it("calcule la contribution marginale % à partir du mapping des coûts variables", () => {
    const variableRow = row("5010", "CMV-001", { "2024-1": 400, "2024-2": 480 })
    const config: StatementChartConfig = {
      version: 2,
      chartTitle: "Performance",
      series: [
        {
          id: "rev",
          kind: "bar",
          label: "Revenus",
          spec: { type: "single", code: "REV-001" },
          yAxis: "left",
          valueFormat: "currency",
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
        },
        {
          id: "cm",
          kind: "line",
          label: "Contribution marginale (%)",
          spec: { type: "derivedContributiveMargin", revenueSeriesId: "rev" },
          yAxis: "right",
          valueFormat: "ratio",
          showOnChart: true,
          showInSidePanel: true,
          color: "#f59e0b",
        },
      ],
    }
    const mappings = [
      {
        id: "5010",
        account_number: "5010",
        description: "Matières",
        link_code: "CMV-001",
        summary_ef: null,
        detail_ef: null,
        divisions: null,
        sub_divisions: null,
        fdrhc: false,
        interests: false,
        amortization: false,
        variable_costs: true,
        fixed_costs: false,
        variable_cost_revenue_link_code: null,
        liability_remaining_years: null,
        liability_interest_rate: null,
        product: null,
        customer: null,
        supplier: null,
        interco_company_id: null,
      },
    ]

    const built = buildPerformanceChartData(
      config,
      [rows[0]!, variableRow],
      periods,
      "12months",
      2,
      2024,
      { mappings },
    )
    expect(built).not.toBeNull()
    expect(built!.series).toHaveLength(2)
    const marginKey = built!.series.find((s) => s.id === "cm")!.dataKey
    const firstPoint = built!.points[0] as Record<string, number>
    expect(firstPoint[marginKey]).toBeCloseTo(60, 1)
  })
})
