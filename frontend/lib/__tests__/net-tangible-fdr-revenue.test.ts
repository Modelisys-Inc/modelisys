import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  computeRevenueTtmFromIncomeStatementSeries,
  findIncomeStatementRevenueRow,
} from "@/lib/net-tangible-fdr-revenue"

const MONTH_ABBREVS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const

function monthlySeriesEndingAt(
  endMonth: number,
  endYear: number,
  count: number,
  amountFor: (month: number, year: number) => number,
): { periods: SeriesPeriod[]; amounts: Record<string, number> } {
  const pairs: { month: number; year: number }[] = []
  let month = endMonth
  let year = endYear
  for (let i = 0; i < count; i++) {
    pairs.unshift({ month, year })
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
  }
  const periods: SeriesPeriod[] = []
  const amounts: Record<string, number> = {}
  for (const p of pairs) {
    periods.push({
      fiscalYear: p.year,
      fiscalMonth: p.month,
      label: `${MONTH_ABBREVS[p.month - 1]} ${p.year}`,
    })
    amounts[`${p.year}-${p.month}`] = amountFor(p.month, p.year)
  }
  return { periods, amounts }
}

function revenueRow(amounts: Record<string, number>, extra?: Partial<SeriesRow>): SeriesRow {
  return {
    id: "REV",
    label: "Revenus",
    linkCode: "REV",
    isBold: true,
    isSection: false,
    isResult: true,
    amounts,
    detailRows: [],
    ...extra,
  }
}

describe("findIncomeStatementRevenueRow", () => {
  it("prefers the non-section Revenus line over a section header", () => {
    const rows: SeriesRow[] = [
      {
        id: "sec",
        label: "Revenus",
        isBold: true,
        isSection: true,
        isResult: false,
        amounts: {},
        detailRows: [],
      },
      revenueRow({ "2026-12": 10 }),
    ]
    expect(findIncomeStatementRevenueRow(rows)?.id).toBe("REV")
  })

  it("falls back to linkCode REV", () => {
    const row = revenueRow({ "2026-1": 1 }, { label: "Chiffre d'affaires" })
    expect(findIncomeStatementRevenueRow([row])?.linkCode).toBe("REV")
  })
})

describe("computeRevenueTtmFromIncomeStatementSeries", () => {
  it("sums the last 12 months like CDR Annuel Courant (Déc 2026)", () => {
    const { periods, amounts } = monthlySeriesEndingAt(12, 2026, 12, () => 100_000)
    const result = computeRevenueTtmFromIncomeStatementSeries(
      [revenueRow(amounts)],
      periods,
      12,
      2026,
    )
    expect(result).toBe(1_200_000)
  })

  it("uses the trailing 12 months across a year boundary (réf. mars 2026)", () => {
    const { periods, amounts } = monthlySeriesEndingAt(3, 2026, 12, (month, year) =>
      year === 2026 ? 10 : 5,
    )
    const result = computeRevenueTtmFromIncomeStatementSeries(
      [revenueRow(amounts)],
      periods,
      3,
      2026,
    )
    // Apr–Dec 2025 = 9×5 ; Jan–Mar 2026 = 3×10
    expect(result).toBe(75)
  })

  it("does not double-count annex detail under the Revenus parent", () => {
    const { periods, amounts } = monthlySeriesEndingAt(12, 2026, 12, () => 100)
    const rows: SeriesRow[] = [
      revenueRow(amounts),
      {
        id: "REV.1",
        label: "Ventes",
        linkCode: "REV.1",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts,
        detailRows: [],
      },
    ]
    expect(computeRevenueTtmFromIncomeStatementSeries(rows, periods, 12, 2026)).toBe(1_200)
  })

  it("returns null when the Revenus row is missing", () => {
    const { periods, amounts } = monthlySeriesEndingAt(12, 2026, 12, () => 50)
    expect(
      computeRevenueTtmFromIncomeStatementSeries(
        [
          {
            id: "CMV",
            label: "Coût des marchandises vendues",
            linkCode: "CMV",
            isBold: false,
            isSection: false,
            isResult: false,
            amounts,
            detailRows: [],
          },
        ],
        periods,
        12,
        2026,
      ),
    ).toBeNull()
  })

  it("returns 0 when the Revenus row exists but TTM is empty", () => {
    const { periods, amounts } = monthlySeriesEndingAt(12, 2026, 12, () => 0)
    expect(
      computeRevenueTtmFromIncomeStatementSeries([revenueRow(amounts)], periods, 12, 2026),
    ).toBe(0)
  })
})
