import type { CompanyDiagnostic, DiagnosticTrendYear } from "@/lib/api"

export type TrendTableColumn = {
  key: string
  label: string
  format: "money" | "pct" | "ratio" | "number"
  highlight?: boolean
}

export type TrendTableRow = {
  label: string
  values: (number | null)[]
  yoyPct: number | null
  cagr5y: number | null
  format: TrendTableColumn["format"]
}

function nfMoney(v: number, currency: string): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? "−" : ""
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString("fr-CA", { maximumFractionDigits: 1 })} M$`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} k$`
  return `${sign}${abs.toLocaleString("fr-CA", { maximumFractionDigits: 0 })} ${currency === "CAD" ? "$" : currency}`
}

function nfPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—"
  return `${v.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function nfRatio(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—"
  return v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatTrendCell(
  value: number | null,
  format: TrendTableColumn["format"],
  currency: string,
): string {
  if (value == null || !Number.isFinite(value)) return "—"
  if (format === "money") return nfMoney(value, currency)
  if (format === "pct") return nfPct(value)
  if (format === "ratio") return nfRatio(value)
  return value.toLocaleString("fr-CA", { maximumFractionDigits: 1 })
}

function yoy(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function cagr5y(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (nums.length < 2) return null
  const first = nums[0]!
  const last = nums[nums.length - 1]!
  if (first <= 0 || last <= 0) return null
  const years = nums.length - 1
  return (Math.pow(last / first, 1 / years) - 1) * 100
}

function buildRows(
  years: DiagnosticTrendYear[],
  specs: { label: string; pick: (y: DiagnosticTrendYear) => number | null; format: TrendTableColumn["format"] }[],
): TrendTableRow[] {
  const previous = years.length > 1 ? years[years.length - 2] : null
  const latest = years[years.length - 1]

  return specs.map(({ label, pick, format }) => {
    const values = years.map(pick)
    const latestVal = latest ? pick(latest) : null
    const prevVal = previous ? pick(previous) : null
    return {
      label,
      values,
      yoyPct: yoy(latestVal, prevVal),
      cagr5y: cagr5y(values),
      format,
    }
  })
}

export function buildChapterTrendTable(
  diagnostic: CompanyDiagnostic,
  chapterId: string,
): { years: number[]; rows: TrendTableRow[] } {
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const fiscalYears = years.map((y) => y.fiscal_year)
  const currency = diagnostic.currency

  const performanceRows = buildRows(years, [
    { label: "Chiffre d'affaires", pick: (y) => y.revenue, format: "money" },
    { label: "Marge brute (%)", pick: (y) => y.gross_margin_pct, format: "pct" },
    { label: "EBITDA", pick: (y) => y.ebitda, format: "money" },
    { label: "Marge EBITDA (%)", pick: (y) => y.ebitda_margin_pct, format: "pct" },
    { label: "Résultat net", pick: (y) => y.net_income, format: "money" },
  ])

  const revenueRows = buildRows(years, [
    { label: "Chiffre d'affaires", pick: (y) => y.revenue, format: "money" },
    { label: "Marge brute", pick: (y) => y.gross_profit, format: "money" },
    { label: "Marge brute (%)", pick: (y) => y.gross_margin_pct, format: "pct" },
  ])

  const expensesRows = buildRows(years, [
    { label: "Marge brute (%)", pick: (y) => y.gross_margin_pct, format: "pct" },
    { label: "Marge EBITDA (%)", pick: (y) => y.ebitda_margin_pct, format: "pct" },
    { label: "Marge nette (%)", pick: (y) => y.net_margin_pct, format: "pct" },
  ])

  const balanceRows = buildRows(years, [
    { label: "Actif total", pick: (y) => y.total_assets, format: "money" },
    { label: "Passif total", pick: (y) => y.total_liabilities, format: "money" },
    { label: "Capitaux propres", pick: (y) => y.equity, format: "money" },
    { label: "Dette / CP", pick: (y) => y.debt_to_equity, format: "ratio" },
  ])

  const wcRows = buildRows(years, [
    { label: "Actif court terme", pick: (y) => y.current_assets, format: "money" },
    { label: "Passif court terme", pick: (y) => y.current_liabilities, format: "money" },
    { label: "Stocks", pick: (y) => y.inventory, format: "money" },
    { label: "Ratio de liquidité", pick: (y) => y.current_ratio, format: "ratio" },
    { label: "Liquidité relative", pick: (y) => y.quick_ratio, format: "ratio" },
  ])

  const capexRows = buildRows(years, [
    { label: "CAPEX", pick: (y) => y.capex, format: "money" },
    { label: "Amortissement", pick: (y) => y.depreciation, format: "money" },
    {
      label: "CAPEX / Revenus (%)",
      pick: (y) => (y.revenue > 0 ? (y.capex / y.revenue) * 100 : null),
      format: "pct",
    },
  ])

  const cashflowRows = buildRows(years, [
    { label: "EBITDA", pick: (y) => y.ebitda, format: "money" },
    { label: "Amortissement", pick: (y) => y.depreciation, format: "money" },
    { label: "CAPEX", pick: (y) => y.capex, format: "money" },
    {
      label: "Cash op. indicatif (EBITDA − CAPEX)",
      pick: (y) => y.ebitda - y.capex,
      format: "money",
    },
    { label: "Résultat net", pick: (y) => y.net_income, format: "money" },
  ])

  const valuationRows = buildRows(years, [
    { label: "EBITDA", pick: (y) => y.ebitda, format: "money" },
    { label: "Capitaux propres", pick: (y) => y.equity, format: "money" },
    { label: "Marge EBITDA (%)", pick: (y) => y.ebitda_margin_pct, format: "pct" },
  ])

  const map: Record<string, TrendTableRow[]> = {
    performance: performanceRows,
    revenue: revenueRows,
    expenses: expensesRows,
    "financial-position": balanceRows,
    "working-capital": wcRows,
    capex: capexRows,
    cashflow: cashflowRows,
    valuation: valuationRows,
  }

  return { years: fiscalYears, rows: map[chapterId] ?? performanceRows }
}
