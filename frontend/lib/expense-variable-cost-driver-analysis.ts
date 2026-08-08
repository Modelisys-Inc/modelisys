import type { AccountMappingData, SeriesRow, StandardLinkCode } from "@/lib/api"
import type { ExpenseCostDriver } from "@/lib/expense-bridge-narrative-context"
import { findSeriesRowByCode } from "@/lib/performance-chart-series"
import {
  resolveExpenseCostGroupingFromLinkCode,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import { formatCurrency } from "@/lib/financial-utils"

const DATA_EPSILON = 1e-6
const TOP_DRIVER_COUNT = 3
const REVENUE_SHIFT_THRESHOLD = 0.05

export type VariableCostDriverShift = ExpenseCostDriver & {
  priorAmount: number
  priorShareOfRevenuePct: number
  shareOfRevenueShiftPts: number
}

export type VariableCostDriverAnalysis = {
  topByRevenueShare: ExpenseCostDriver[]
  topByRevenueShift: VariableCostDriverShift[]
}

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function resolveAccountLabel(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
): string {
  const mapping = mappingsByAccount.get(accountNumber)
  const description = mapping?.description?.trim()
  if (description) return description
  const row = findSeriesRowByCode(rows, accountNumber)
  if (row?.label?.trim()) return row.label.trim()
  return accountNumber
}

function shareOfRevenue(amount: number, revenue: number): number {
  if (Math.abs(revenue) < DATA_EPSILON) return 0
  return (amount / revenue) * 100
}

function fmtPctPlain(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")} %`
}

function fmtPoints(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${Math.abs(value).toFixed(digits).replace(".", ",")} pt`
}

function groupVariableCostAmounts(params: {
  accountNumbers: string[]
  resolveAmount: (accountNumber: string) => number
  categoryTotal: number
  revenue: number
  mappingsByAccount: Map<string, AccountMappingData>
  rows: SeriesRow[]
  codeByCode: StandardLinkCodeLookup
  groupByLinkCode?: boolean
}): ExpenseCostDriver[] {
  const {
    accountNumbers,
    resolveAmount,
    categoryTotal,
    revenue,
    mappingsByAccount,
    rows,
    codeByCode,
    groupByLinkCode = true,
  } = params

  const bucket = new Map<string, { label: string; kind: ExpenseCostDriver["kind"]; amount: number }>()

  for (const accountNumber of accountNumbers) {
    const amount = resolveAmount(accountNumber)
    if (Math.abs(amount) < DATA_EPSILON) continue

    let id = accountNumber
    let label = resolveAccountLabel(accountNumber, mappingsByAccount, rows)
    let kind: ExpenseCostDriver["kind"] = "gl-account"

    if (groupByLinkCode) {
      const mapping = mappingsByAccount.get(accountNumber)
      const group = resolveExpenseCostGroupingFromLinkCode(mapping?.link_code, codeByCode)
      if (group) {
        id = group.id
        label = group.label
        kind = "link-code"
      }
    }

    const existing = bucket.get(id)
    if (existing) {
      existing.amount += amount
    } else {
      bucket.set(id, { label, kind, amount })
    }
  }

  return [...bucket.entries()].map(([id, meta]) => ({
    id,
    label: meta.label,
    kind: meta.kind,
    amount: meta.amount,
    shareOfCategoryPct:
      Math.abs(categoryTotal) > DATA_EPSILON ? (meta.amount / categoryTotal) * 100 : 0,
    shareOfRevenuePct: shareOfRevenue(meta.amount, revenue),
  }))
}

export function analyzeVariableCostDrivers(params: {
  accountNumbers: string[]
  currentRevenue: number
  currentCategoryTotal: number
  priorRevenue: number
  priorCategoryTotal: number
  resolveCurrentAmount: (accountNumber: string) => number
  resolvePriorAmount: (accountNumber: string) => number
  mappingsByAccount: Map<string, AccountMappingData>
  rows: SeriesRow[]
  standardLinkCodes?: StandardLinkCode[]
  groupByLinkCode?: boolean
}): VariableCostDriverAnalysis {
  const codeByCode = buildStandardLinkCodeLookup(params.standardLinkCodes)
  const common = {
    accountNumbers: params.accountNumbers,
    mappingsByAccount: params.mappingsByAccount,
    rows: params.rows,
    codeByCode,
    groupByLinkCode: params.groupByLinkCode ?? true,
  }

  const currentDrivers = groupVariableCostAmounts({
    ...common,
    resolveAmount: params.resolveCurrentAmount,
    categoryTotal: params.currentCategoryTotal,
    revenue: params.currentRevenue,
  })

  const priorDrivers = groupVariableCostAmounts({
    ...common,
    resolveAmount: params.resolvePriorAmount,
    categoryTotal: params.priorCategoryTotal,
    revenue: params.priorRevenue,
  })

  const priorById = new Map(priorDrivers.map((driver) => [driver.id, driver]))

  const topByRevenueShare = [...currentDrivers]
    .sort((a, b) => b.shareOfRevenuePct - a.shareOfRevenuePct)
    .slice(0, TOP_DRIVER_COUNT)

  const topByRevenueShift = currentDrivers
    .map((driver) => {
      const prior = priorById.get(driver.id)
      const priorShare = prior?.shareOfRevenuePct ?? 0
      const shift = driver.shareOfRevenuePct - priorShare
      return {
        ...driver,
        priorAmount: prior?.amount ?? 0,
        priorShareOfRevenuePct: priorShare,
        shareOfRevenueShiftPts: shift,
      }
    })
    .filter((driver) => Math.abs(driver.shareOfRevenueShiftPts) >= REVENUE_SHIFT_THRESHOLD)
    .sort((a, b) => Math.abs(b.shareOfRevenueShiftPts) - Math.abs(a.shareOfRevenueShiftPts))
    .slice(0, TOP_DRIVER_COUNT)

  return { topByRevenueShare, topByRevenueShift }
}

function formatDriverRevenueShareEntry(driver: ExpenseCostDriver): string {
  const label = driver.label.trim()
  const lowerFirst = label.charAt(0).toLowerCase() + label.slice(1)
  return `${lowerFirst} (${formatCurrency(driver.amount)}, soit ${fmtPctPlain(driver.shareOfRevenuePct)} du chiffre d'affaires)`
}

export function formatTopVariableDriversByRevenueShare(drivers: ExpenseCostDriver[]): string | null {
  if (!drivers.length) return null

  if (drivers.length === 1) {
    return `Les coûts variables les plus significatifs en proportion du chiffre d'affaires proviennent de ${formatDriverRevenueShareEntry(drivers[0]!)}.`
  }

  const top = drivers.slice(0, 3)
  const parts = top.map((driver, index) => {
    const entry = formatDriverRevenueShareEntry(driver)
    if (index === 0) return entry
    if (index === top.length - 1) return `ainsi que de ${entry}`
    return entry
  })

  const combinedShare = top.reduce((sum, driver) => sum + driver.shareOfRevenuePct, 0)
  const leverageSentence =
    top.length >= 3 && combinedShare >= 25
      ? ` À eux seuls, ces postes représentent près de ${Math.round(combinedShare)} % du chiffre d'affaires et constituent les principaux leviers influençant la contribution marginale.`
      : " Ces postes constituent les principaux leviers influençant la contribution marginale."

  return `Les coûts variables les plus significatifs en proportion du chiffre d'affaires sont ${parts.join(", ")}.${leverageSentence}`
}

function formatDriverRevenueShiftEntry(driver: VariableCostDriverShift): string {
  const label = driver.label.trim()
  const lowerFirst = label.charAt(0).toLowerCase() + label.slice(1)
  const direction = driver.shareOfRevenueShiftPts > 0 ? "augmente" : "diminue"
  return `${lowerFirst} (${direction} de ${fmtPoints(Math.abs(driver.shareOfRevenueShiftPts))}, passant de ${fmtPctPlain(driver.priorShareOfRevenuePct)} à ${fmtPctPlain(driver.shareOfRevenuePct)} du chiffre d'affaires)`
}

export function formatTopVariableDriversByRevenueShift(
  drivers: VariableCostDriverShift[],
  priorPeriodLabel: string,
): string | null {
  if (!drivers.length) return null

  if (drivers.length === 1) {
    return `Comparativement à ${priorPeriodLabel}, le poste ayant le plus fait varier son ratio aux revenus est ${formatDriverRevenueShiftEntry(drivers[0]!)}.`
  }

  const top = drivers.slice(0, 3)
  const parts = top.map((driver, index) => {
    const entry = formatDriverRevenueShiftEntry(driver)
    if (index === 0) return entry
    if (index === top.length - 1) return `ainsi que ${entry}`
    return entry
  })

  return `Comparativement à ${priorPeriodLabel}, les postes ayant le plus fait varier leur ratio aux revenus sont ${parts.join(", ")}.`
}
