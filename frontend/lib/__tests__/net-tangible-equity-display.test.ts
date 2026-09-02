import { describe, expect, it } from "vitest"
import {
  NET_TANGIBLE_EQUITY_TOTAL_LABEL,
  NET_TANGIBLE_LIABILITIES_AND_ACTIF_NET_LABEL,
  collapseEquityForNetTangibleValuation,
  isBalanceSheetTotalLiabilitiesOnlyLabel,
  isNetTangibleLiabilitiesAndActifNetLabel,
  netTangibleValidationColumnAmount,
  resolveNetTangibleActifNetVcaAcn,
  resolveNetTangibleLiabilitiesAndActifNetVcaAcn,
} from "@/lib/net-tangible-equity-display"

describe("collapseEquityForNetTangibleValuation", () => {
  it("hides equity detail, renames Actif net and passifs+actif net total", () => {
    const rows = [
      { label: "Total des passifs", isSection: false, current: 100 },
      { label: "Capitaux propres", isSection: true, current: 0 },
      { label: "Capital-actions", isSection: false, current: 30 },
      { label: "Surplus d'apport", isSection: false, current: 5 },
      { label: "Bénéfices non répartis", isSection: false, current: 65 },
      { label: "Total des capitaux propres", isSection: false, current: 100 },
      { label: "Total des passifs et des capitaux propres", isSection: false, current: 200 },
    ]

    const result = collapseEquityForNetTangibleValuation(rows)

    expect(result.map((r) => r.label)).toEqual([
      "Total des passifs",
      NET_TANGIBLE_EQUITY_TOTAL_LABEL,
      NET_TANGIBLE_LIABILITIES_AND_ACTIF_NET_LABEL,
    ])
    expect(result.find((r) => r.label === NET_TANGIBLE_EQUITY_TOTAL_LABEL)?.current).toBe(100)
  })

  it("does not drop unrelated rows", () => {
    const rows = [
      { label: "Actif", isSection: true, current: 0 },
      { label: "Encaisse", isSection: false, current: 10 },
    ]
    expect(collapseEquityForNetTangibleValuation(rows)).toEqual(rows)
  })
})

describe("isBalanceSheetTotalLiabilitiesOnlyLabel", () => {
  it("matches total liabilities without equity", () => {
    expect(isBalanceSheetTotalLiabilitiesOnlyLabel("Total des passifs")).toBe(true)
    expect(isBalanceSheetTotalLiabilitiesOnlyLabel("Total du passif")).toBe(true)
    expect(isBalanceSheetTotalLiabilitiesOnlyLabel("Total passifs et capitaux propres")).toBe(false)
    expect(isBalanceSheetTotalLiabilitiesOnlyLabel("Total des passifs et de l'actif net")).toBe(
      false,
    )
    expect(isBalanceSheetTotalLiabilitiesOnlyLabel("Total des passifs courants")).toBe(false)
  })
})

describe("isNetTangibleLiabilitiesAndActifNetLabel", () => {
  it("matches original and renamed labels", () => {
    expect(isNetTangibleLiabilitiesAndActifNetLabel("Total passifs et capitaux propres")).toBe(true)
    expect(
      isNetTangibleLiabilitiesAndActifNetLabel("Total des passifs et des capitaux propres"),
    ).toBe(true)
    expect(isNetTangibleLiabilitiesAndActifNetLabel(NET_TANGIBLE_LIABILITIES_AND_ACTIF_NET_LABEL)).toBe(
      true,
    )
    expect(isNetTangibleLiabilitiesAndActifNetLabel("Total des passifs")).toBe(false)
  })
})

describe("resolveNetTangibleActifNetVcaAcn", () => {
  it("computes Actif net VCA/ACN as Total actif − Total passifs", () => {
    const rows = [
      { label: "Encaisse", rowId: "a", current: 100 },
      { label: "Total de l'actif", rowId: "ta", current: 1000 },
      { label: "Fournisseurs", rowId: "p", current: 200 },
      { label: "Total des passifs", rowId: "tp", current: 400 },
      { label: "Actif net", rowId: "an", current: 600 },
    ]
    const amounts = {
      ta: { adjustments: 50, debts: 10, assets: 5 },
      tp: { adjustments: 20, debts: 0, assets: 0 },
    }
    // VCA: (1000+50) − (400+20) = 630
    // ACN: (1050−10−5) − (420−0−0) = 1035 − 420 = 615
    expect(resolveNetTangibleActifNetVcaAcn(rows, amounts)).toEqual({ vca: 630, acn: 615 })
  })
})

describe("resolveNetTangibleLiabilitiesAndActifNetVcaAcn", () => {
  it("equals Total des passifs + Actif net (= Total actif)", () => {
    const rows = [
      { label: "Total de l'actif", rowId: "ta", current: 1000 },
      { label: "Total des passifs", rowId: "tp", current: 400 },
      { label: "Actif net", rowId: "an", current: 600 },
      {
        label: "Total des passifs et des capitaux propres",
        rowId: "tle",
        current: 1000,
      },
    ]
    const amounts = {
      ta: { adjustments: 50, debts: 10, assets: 5 },
      tp: { adjustments: 20, debts: 0, assets: 0 },
    }
    // Passifs VCA 420 + Actif net VCA 630 = 1050 (= Total actif VCA)
    // Passifs ACN 420 + Actif net ACN 615 = 1035 (= Total actif ACN)
    expect(resolveNetTangibleLiabilitiesAndActifNetVcaAcn(rows, amounts)).toEqual({
      vca: 1050,
      acn: 1035,
    })
  })
})

describe("netTangibleValidationColumnAmount", () => {
  it("uses overrides so Validation VCA/ACN matches displayed totals", () => {
    const rows = [
      { label: "Total de l'actif", rowId: "ta", current: 1000 },
      { label: "Total des passifs", rowId: "tp", current: 400 },
      { label: "Total des capitaux propres", rowId: "an", current: 600 },
      {
        label: "Total des passifs et des capitaux propres",
        rowId: "tle",
        current: 1000,
      },
    ]
    const amounts = {
      ta: { adjustments: 50, debts: 0, assets: 0 },
      tp: { adjustments: 0, debts: 0, assets: 0 },
      tle: { adjustments: 999, debts: 0, assets: 0 },
    }
    const actifNet = resolveNetTangibleActifNetVcaAcn(rows, amounts)!
    const le = resolveNetTangibleLiabilitiesAndActifNetVcaAcn(rows, amounts)!
    const overrides = { actifNet, liabilitiesAndActifNet: le }
    expect(netTangibleValidationColumnAmount(rows[3]!, amounts, "vca", overrides)).toBe(le.vca)
    expect(le.vca).toBe(1050)
    expect(actifNet.vca).toBe(650)
    // Validation: Total actif − Total passifs+CP (override) = 0
    expect(1050 - le.vca).toBe(0)
  })
})
