import { describe, expect, it } from "vitest"
import {
  applyCashFlowCalcToPoint,
  applyCashFlowCalcToTrend,
  priorPeriodLabelForTrend,
  readRowCashFlowCalcMode,
  readRowCashFlowTinDisplayMode,
  reconcileCashFlowSectionTotalsFromStructure,
  reconcileDetailRowTotalsFromGlAccounts,
  resolveCashFlowFormulaPointAmount,
  resolveCashFlowFormulaPointAmountFromProcessed,
  resolveCashFlowFormulaTrendValuesFromProcessed,
  shouldReconcileCashFlowDetailRowFromGlAccounts,
  structureRowShowsCashFlowCalcSelector,
  structureRowShowsCashFlowTinDisplaySelector,
  structureUsesCashFlowTinCostMode,
  type CashFlowOperandSnapshot,
} from "@/lib/cash-flow-detail-settings"

describe("cash-flow-detail-settings", () => {
  it("lit le mode Calcul avec défaut Réel", () => {
    expect(readRowCashFlowCalcMode({})).toBe("actual")
    expect(readRowCashFlowCalcMode({ cashFlowCalcMode: "variation_nn1" })).toBe("variation_nn1")
    expect(readRowCashFlowCalcMode({ cashFlowCalcMode: "variation_n1n" })).toBe("variation_n1n")
  })

  it("affiche le sélecteur Réel / Coût seulement pour un code TIN unique", () => {
    expect(
      structureRowShowsCashFlowTinDisplaySelector({
        label: "Investissement",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "TIN-INV",
      }),
    ).toBe(true)
    expect(
      structureRowShowsCashFlowTinDisplaySelector({
        label: "Exploitation",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "TEX-A",
      }),
    ).toBe(false)
    expect(readRowCashFlowTinDisplayMode({})).toBe("actual")
    expect(readRowCashFlowTinDisplayMode({ cashFlowTinDisplayMode: "cost" })).toBe("cost")
  })

  it("détecte si la structure utilise le mode Coût TIN", () => {
    expect(
      structureUsesCashFlowTinCostMode([
        {
          label: "Investissement",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "TIN-INV",
          cashFlowTinDisplayMode: "actual",
        },
      ]),
    ).toBe(false)
    expect(
      structureUsesCashFlowTinCostMode([
        {
          label: "Investissement",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "TIN-INV",
          cashFlowTinDisplayMode: "cost",
        },
      ]),
    ).toBe(true)
  })

  it("affiche le sélecteur Calcul seulement pour un code unique", () => {
    expect(
      structureRowShowsCashFlowCalcSelector({
        label: "Exploitation",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "TEX-A",
      }),
    ).toBe(true)
    expect(
      structureRowShowsCashFlowCalcSelector({
        label: "Total",
        defineMapping: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["TEX-A", "TEX-B"],
      }),
    ).toBe(false)
    expect(
      structureRowShowsCashFlowCalcSelector({
        label: "Exploitation",
        defineMapping: false,
        liaisonMode: "single",
      }),
    ).toBe(false)
  })

  it("agrège une formule à partir de montants déjà transformés", () => {
    const operands = new Map<string, CashFlowOperandSnapshot>([
      ["TIN-A", { current: 100, prior: 0, trendValues: [100, 80] }],
      ["TIN-B", { current: 10, prior: 0, trendValues: [10, 5] }],
    ])
    const result = resolveCashFlowFormulaPointAmountFromProcessed(
      { liaisonMode: "sum", liaisonSumCodes: ["TIN-A", "TIN-B"] },
      (code) => operands.get(code),
    )
    expect(result).toEqual({ current: 110, prior: 0 })
    const trends = resolveCashFlowFormulaTrendValuesFromProcessed(
      { liaisonMode: "sum", liaisonSumCodes: ["TIN-A", "TIN-B"] },
      (code) => operands.get(code),
      { trendView: "12months", trendLabels: ["A", "B"] },
    )
    expect(trends).toEqual([110, 85])
  })

  it("réconcilie un total de section avec les lignes affichées au-dessus", () => {
    const structure = [
      { label: "Ligne A", linkCode: "TIN-A", defineMapping: true, liaisonMode: "single" },
      { label: "Ligne B", linkCode: "TIN-B", defineMapping: true, liaisonMode: "single" },
      { label: "Flux Investissement", isResult: true, isBold: true },
    ]
    const detailRows = [
      { current: 100, prior: 0, trendValues: [100, 90] },
      { current: 10, prior: 0, trendValues: [10, 0] },
      { current: 999, prior: 0, trendValues: [999, 0] },
    ]
    const reconciled = reconcileCashFlowSectionTotalsFromStructure(detailRows, structure)
    expect(reconciled[2]?.current).toBe(110)
    expect(reconciled[2]?.trendValues).toEqual([110, 90])
  })

  it("variation nette cumule les sous-totaux déjà réconciliés", () => {
    const structure = [
      { label: "Ligne A", linkCode: "TIN-A", defineMapping: true, liaisonMode: "single" },
      { label: "Flux Investissement", isResult: true },
      { label: "Ligne B", linkCode: "TIN-B", defineMapping: true, liaisonMode: "single" },
      { label: "Flux Financement", isResult: true },
      { label: "Variation nette de la trésorerie", isResult: true },
    ]
    const detailRows = [
      { current: 100, prior: 0 },
      { current: 999, prior: 0 },
      { current: 50, prior: 0 },
      { current: 888, prior: 0 },
      { current: 0, prior: 0 },
    ]
    const reconciled = reconcileCashFlowSectionTotalsFromStructure(detailRows, structure)
    expect(reconciled[1]?.current).toBe(100)
    expect(reconciled[3]?.current).toBe(50)
    expect(reconciled[4]?.current).toBe(150)
  })

  it("ne réconcilie pas une ligne formule (somme de codes) même si isResult", () => {
    const structure = [
      { label: "Ligne A", linkCode: "TIN-A", defineMapping: true, liaisonMode: "single" },
      {
        label: "Variation nette",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["TIN-A"],
      },
    ]
    const detailRows = [
      { current: 100, prior: 0 },
      { current: 42, prior: 0 },
    ]
    const reconciled = reconcileCashFlowSectionTotalsFromStructure(detailRows, structure)
    expect(reconciled[1]?.current).toBe(42)
  })

  it("agrège une somme avec le mode Calcul de chaque opérande", () => {
    const calcModeByCode = new Map([
      ["TEX-A", "actual" as const],
      ["TEX-B", "variation_nn1" as const],
    ])
    const operands = new Map<string, CashFlowOperandSnapshot>([
      ["TEX-A", { current: 100, prior: 80 }],
      ["TEX-B", { current: 50, prior: 30 }],
    ])
    const result = resolveCashFlowFormulaPointAmount(
      {
        liaisonMode: "sum",
        liaisonSumCodes: ["TEX-A", "TEX-B"],
      },
      calcModeByCode,
      (code) => operands.get(code),
    )
    expect(result).toEqual({ current: 120, prior: 80 })
  })

  it("ne réconcilie pas le total GL en mode Réel", () => {
    expect(shouldReconcileCashFlowDetailRowFromGlAccounts("actual")).toBe(false)
    expect(shouldReconcileCashFlowDetailRowFromGlAccounts("variation_nn1")).toBe(true)
    expect(shouldReconcileCashFlowDetailRowFromGlAccounts("variation_n1n")).toBe(true)
  })

  it("réconcilie le total de ligne avec la somme des comptes GL", () => {
    const row = reconcileDetailRowTotalsFromGlAccounts({
      current: 999,
      prior: 888,
      trendValues: [999, 888],
      balanceAccounts: [
        { amount: 60, priorAmount: 10, trendValues: [60, 50] },
        { amount: 50, priorAmount: 20, trendValues: [50, 40] },
      ],
    })
    expect(row.current).toBe(110)
    expect(row.prior).toBe(30)
    expect(row.trendValues).toEqual([110, 90])
  })

  it("applique la variation puis réconcilie la somme GL", () => {
    const accounts = [
      { amount: 0, priorAmount: 0, trendValues: [0, 0] },
      { amount: 10_000, priorAmount: 0, trendValues: [10_000, 10_000] },
    ]

    const row = reconcileDetailRowTotalsFromGlAccounts({
      current: 0,
      prior: 0,
      trendValues: [50_000, 0],
      balanceAccounts: accounts,
    })
    expect(row.trendValues).toEqual([10_000, 10_000])
    expect(row.current).toBe(10_000)
  })

  it("applique les variations ponctuelles", () => {
    expect(applyCashFlowCalcToPoint(120, 100, "actual")).toEqual({ current: 120, prior: 100 })
    expect(applyCashFlowCalcToPoint(120, 100, "variation_nn1")).toEqual({ current: 20, prior: 0 })
    expect(applyCashFlowCalcToPoint(120, 100, "variation_n1n")).toEqual({ current: -20, prior: 0 })
  })

  it("calcule la variation N − N−1 sur la période précédente affichée", () => {
    const labels = ["Aoû 2026", "Jul 2026", "Aoû 2025"]
    const values = [150, 140, 100]
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", undefined, "12months")
    expect(result[0]).toBe(10)
    expect(result[1]).toBe(40)
    expect(priorPeriodLabelForTrend("Aoû 2026", "12months")).toBe("Aoû 2025")
  })

  it("calcule la variation annuelle", () => {
    const labels = ["2026", "2025", "2024"]
    const values = [500, 400, 300]
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", undefined, "years")
    expect(result[0]).toBe(100)
    expect(result[1]).toBe(100)
  })
})
