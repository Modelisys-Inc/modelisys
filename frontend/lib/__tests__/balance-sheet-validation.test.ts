import { describe, it, expect } from "vitest"
import {
  isBalanceSheetAssetsSectionLabel,
  isBalanceSheetTotalAssetsLabel,
  isBalanceSheetTotalLiabilitiesEquityLabel,
  findBalanceSheetTotalAssetsRow,
  findBalanceSheetTotalLiabilitiesEquityRow,
  balanceSheetValidationEcart,
  isBalanceSheetBalanced,
  ensureBalanceSheetValidationStructure,
  parseValidationFormula,
  serializeValidationFormula,
  evaluateValidationFormulaCurrent,
  buildBalanceSheetValidationAmountLookup,
  defaultBalanceSheetValidationFormula,
  isBalanceSheetValidationStructureRow,
} from "../balance-sheet-validation"

describe("balance-sheet-validation labels", () => {
  it("recognizes assets section headers", () => {
    expect(isBalanceSheetAssetsSectionLabel("Actifs")).toBe(true)
    expect(isBalanceSheetAssetsSectionLabel("Actif")).toBe(true)
    expect(isBalanceSheetAssetsSectionLabel("Actifs courants")).toBe(false)
  })

  it("recognizes total assets label variants", () => {
    expect(isBalanceSheetTotalAssetsLabel("Total des actifs")).toBe(true)
    expect(isBalanceSheetTotalAssetsLabel("Total de l'actif")).toBe(true)
    expect(isBalanceSheetTotalAssetsLabel("total actif")).toBe(true)
  })

  it("recognizes total liabilities + equity label variants", () => {
    expect(isBalanceSheetTotalLiabilitiesEquityLabel("Total passifs et capitaux propres")).toBe(true)
    expect(
      isBalanceSheetTotalLiabilitiesEquityLabel("Total du passif et des capitaux propres"),
    ).toBe(true)
  })
})

describe("balanceSheetValidationEcart", () => {
  it("computes assets minus liabilities+equity", () => {
    expect(balanceSheetValidationEcart(1000, 980)).toBe(20)
    expect(balanceSheetValidationEcart(1000, 1000)).toBe(0)
    expect(balanceSheetValidationEcart(undefined, 1000)).toBeNull()
  })

  it("finds total rows in a list", () => {
    const rows = [
      { label: "Actifs", current: 0 },
      { label: "Total de l'actif", current: 500 },
      { label: "Total du passif et des capitaux propres", current: 480 },
    ]
    expect(findBalanceSheetTotalAssetsRow(rows)?.current).toBe(500)
    expect(findBalanceSheetTotalLiabilitiesEquityRow(rows)?.current).toBe(480)
  })

  it("treats |ecart| < 1 as balanced", () => {
    expect(isBalanceSheetBalanced(0)).toBe(true)
    expect(isBalanceSheetBalanced(0.5)).toBe(true)
    expect(isBalanceSheetBalanced(20)).toBe(false)
  })
})

describe("validation formula", () => {
  const structure = [
    { id: "actifs", label: "Actifs", isSection: true },
    { id: "total-actif", label: "Total de l'actif", isResult: true },
    { id: "total-passif-cp", label: "Total du passif et des capitaux propres", isResult: true },
  ]

  it("builds default formula from total labels", () => {
    expect(defaultBalanceSheetValidationFormula(structure)).toEqual([
      "+total-actif",
      "-total-passif-cp",
    ])
  })

  it("ensures a Validation structure row with default formula", () => {
    const next = ensureBalanceSheetValidationStructure(structure)
    const validation = next.find(isBalanceSheetValidationStructureRow)
    expect(validation).toBeTruthy()
    expect(validation?.label).toBe("Validation")
    expect(parseValidationFormula(validation?.formula)).toEqual([
      { sign: 1, refId: "total-actif" },
      { sign: -1, refId: "total-passif-cp" },
    ])
  })

  it("serializes and parses formula terms", () => {
    const terms = [
      { sign: 1 as const, refId: "a" },
      { sign: -1 as const, refId: "b" },
    ]
    expect(serializeValidationFormula(terms)).toEqual(["+a", "-b"])
    expect(parseValidationFormula(["+a", "-b"])).toEqual(terms)
  })

  it("evaluates formula against amount lookup", () => {
    const withValidation = ensureBalanceSheetValidationStructure(structure)
    const amounts = [
      { label: "Total de l'actif", current: 1000, prior: 900 },
      { label: "Total du passif et des capitaux propres", current: 980, prior: 900 },
    ]
    const lookup = buildBalanceSheetValidationAmountLookup(withValidation, amounts)
    const formula = defaultBalanceSheetValidationFormula(withValidation)
    expect(evaluateValidationFormulaCurrent(formula, lookup)).toBe(20)
  })
})
