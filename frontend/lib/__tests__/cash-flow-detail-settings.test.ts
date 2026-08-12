import { describe, expect, it } from "vitest"
import {
  applyCashFlowCalcToPoint,
  applyCashFlowCalcToTrend,
  applyCashFlowActualYearTTMToRow,
  snapshotAmountForYearColumnLabel,
  mapMonthlyTrendRowsToComparisonAmounts,
  mapMonthlyTrendRowsToPastMonthComparisonAmounts,
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

  it("calcule la variation N − N−1 sur le mois civil précédent", () => {
    const labels = ["Jul 2025", "Jun 2025", "Mai 2025"]
    const values = [150, 140, 100]
    const calendar = new Map([
      ["2025-7", 150],
      ["2025-6", 140],
      ["2025-5", 100],
      ["2025-4", 90],
    ])
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", calendar, "12months")
    expect(result[0]).toBe(10)
    expect(result[1]).toBe(40)
    expect(result[2]).toBe(10)
    expect(priorPeriodLabelForTrend("Jul 2025", "12months")).toBe("Jun 2025")
    expect(priorPeriodLabelForTrend("Jan 2025", "12months")).toBe("Déc 2024")
  })

  it("utilise le mois civil précédent hors colonnes affichées", () => {
    const labels = ["Jul 2025"]
    const values = [150]
    const calendar = new Map([
      ["2025-7", 150],
      ["2025-6", 140],
    ])
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", calendar, "12months")
    expect(result[0]).toBe(10)
  })

  it("calcule la variation annuelle", () => {
    const labels = ["2026", "2025", "2024"]
    const values = [500, 400, 300]
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", undefined, "years")
    expect(result[0]).toBe(100)
    expect(result[1]).toBe(100)
  })

  it("calcule la variation annuelle sur le même mois civil (snapshot, pas TTM)", () => {
    const labels = ["Déc 2026", "Déc 2025", "Déc 2024"]
    const values = [0, 0, 0]
    const calendar = new Map([
      ["2026-12", 500],
      ["2025-12", 400],
      ["2024-12", 300],
    ])
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", calendar, "years")
    expect(result[0]).toBe(100)
    expect(result[1]).toBe(100)
    expect(result[2]).toBe(300)
    expect(priorPeriodLabelForTrend("Déc 2026", "years")).toBe("Déc 2025")
    expect(snapshotAmountForYearColumnLabel("Déc 2023", calendar)).toBe(0)
  })

  it("compare Déc 2024 à Déc 2023 à 0 $ quand 2023 est absent du calendrier", () => {
    const labels = ["Déc 2025", "Déc 2024", "Déc 2023"]
    const values = [0, 0, 999]
    const calendar = new Map<string, number>([
      ["2025-12", 80],
      ["2024-12", 50],
    ])
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", calendar, "years")
    expect(result[1]).toBe(50)
    expect(result[2]).toBe(0)
  })

  it("applique le TTM en mode Calcul Réel sur l'horizon annuel", () => {
    const labels = ["Déc 2026", "Déc 2025"]
    const calendar = new Map<string, number>()
    for (let m = 1; m <= 12; m++) {
      calendar.set(`2026-${m}`, 10)
      calendar.set(`2025-${m}`, 5)
    }
    const row = applyCashFlowActualYearTTMToRow(
      {
        current: 500,
        prior: 400,
        trendValues: [500, 400],
      },
      { trendView: "years", trendLabels: labels },
      calendar,
    )
    expect(row.trendValues).toEqual([120, 60])
    expect(row.current).toBe(120)
    expect(row.prior).toBe(60)
  })

  it("applique la somme du trimestre en mode Calcul Réel sur l'horizon trimestriel", () => {
    const labels = ["Déc 2026", "Sep 2026"]
    const calendar = new Map<string, number>([
      ["2026-10", 10],
      ["2026-11", 20],
      ["2026-12", 30],
      ["2026-7", 1],
      ["2026-8", 2],
      ["2026-9", 3],
    ])
    const row = applyCashFlowActualYearTTMToRow(
      {
        current: 999,
        prior: 888,
        trendValues: [12, 9],
      },
      { trendView: "quarters", trendLabels: labels, fiscalYearEndMonth: 12 },
      calendar,
    )
    expect(row.trendValues).toEqual([60, 6])
    expect(row.current).toBe(60)
    expect(row.prior).toBe(6)
  })

  it("en mode Réel trimestriel, somme le trimestre fiscal (fin d'exercice août) et non le civil", () => {
    // Fin d'exercice août : Q4 fiscal = Jun–Jul–Aoû (pas Jul–Sep civil).
    const labels = ["Aoû 2026", "Mai 2026"]
    const calendar = new Map<string, number>([
      ["2026-6", 10],
      ["2026-7", 20],
      ["2026-8", 30],
      // Civil Q3 extra month must NOT be included
      ["2026-9", 1000],
      // Prior fiscal Q3 = Mar–Apr–Mai
      ["2026-3", 1],
      ["2026-4", 2],
      ["2026-5", 3],
    ])
    const row = applyCashFlowActualYearTTMToRow(
      {
        current: 999,
        prior: 888,
        trendValues: [8, 5],
      },
      { trendView: "quarters", trendLabels: labels, fiscalYearEndMonth: 8 },
      calendar,
    )
    expect(row.trendValues).toEqual([60, 6])
    expect(row.current).toBe(60)
    expect(row.prior).toBe(6)
  })

  it("calcule la variation trimestrielle vs la fin du trimestre fiscal précédent", () => {
    const labels = ["Nov 2026", "Sep 2026", "Jun 2026"]
    const values = [0, 0, 0]
    const calendar = new Map([
      ["2026-11", 500],
      ["2026-9", 400],
      ["2026-6", 300],
    ])
    const result = applyCashFlowCalcToTrend(values, labels, "variation_nn1", calendar, "quarters")
    expect(priorPeriodLabelForTrend("Nov 2026", "quarters")).toBe("Sep 2026")
    expect(priorPeriodLabelForTrend("Déc 2026", "quarters")).toBe("Sep 2026")
    expect(priorPeriodLabelForTrend("Aoû 2026", "quarters")).toBe("Jun 2026")
    expect(result[0]).toBe(100)
    expect(result[1]).toBe(100)
  })

  it("en mode Réel trimestriel, exclut les mois futurs du trimestre en cours", () => {
    const labels = ["Nov 2026", "Sep 2026"]
    const calendar = new Map<string, number>([
      // T4 partiel : Oct+Nov (pas Déc)
      ["2026-10", 10],
      ["2026-11", 20],
      ["2026-12", 1000],
      // T3 complet : Jul–Sep
      ["2026-7", 1],
      ["2026-8", 2],
      ["2026-9", 3],
    ])
    const row = applyCashFlowActualYearTTMToRow(
      {
        current: 999,
        prior: 888,
        trendValues: [11, 9],
      },
      { trendView: "quarters", trendLabels: labels, fiscalYearEndMonth: 12 },
      calendar,
    )
    expect(row.trendValues).toEqual([30, 6])
    expect(row.current).toBe(30)
    expect(row.prior).toBe(6)
  })

  it("en mode Réel trimestriel à fin de trimestre, somme les 3 mois", () => {
    const labels = ["Déc 2026", "Sep 2026"]
    const calendar = new Map<string, number>([
      ["2026-10", 10],
      ["2026-11", 20],
      ["2026-12", 30],
      ["2026-7", 1],
      ["2026-8", 2],
      ["2026-9", 3],
    ])
    const row = applyCashFlowActualYearTTMToRow(
      {
        current: 999,
        prior: 888,
        trendValues: [12, 9],
      },
      { trendView: "quarters", trendLabels: labels, fiscalYearEndMonth: 12 },
      calendar,
    )
    expect(row.trendValues).toEqual([60, 6])
    expect(row.current).toBe(60)
    expect(row.prior).toBe(6)
  })

  it("calcule la variation N − N−1 sur le même mois année précédente", () => {
    const labels = ["Jul 2025", "Jun 2025", "Jul 2024"]
    const values = [150, 140, 100]
    const calendar = new Map([
      ["2025-7", 150],
      ["2025-6", 140],
      ["2024-7", 100],
      ["2024-6", 90],
    ])
    const result = applyCashFlowCalcToTrend(
      values,
      labels,
      "variation_nn1",
      calendar,
      "12months",
      "priorYearSameMonth",
    )
    expect(result[0]).toBe(50)
    expect(priorPeriodLabelForTrend("Jul 2025", "12months", "priorYearSameMonth")).toBe("Jul 2024")
  })

  it("mappe les colonnes Mensuel vers Mois actuel (courant / N−1)", () => {
    const mapped = mapMonthlyTrendRowsToComparisonAmounts([
      {
        current: 999,
        prior: 888,
        trendValues: [150, 140],
        balanceAccounts: [
          {
            accountNumber: "1000",
            accountName: "Cash",
            amount: 1,
            priorAmount: 2,
            trendValues: [50, 40],
          },
        ],
      },
    ])
    expect(mapped[0]?.current).toBe(150)
    expect(mapped[0]?.prior).toBe(140)
    expect(mapped[0]?.trendValues).toBeUndefined()
    expect(mapped[0]?.balanceAccounts?.[0]?.amount).toBe(50)
    expect(mapped[0]?.balanceAccounts?.[0]?.priorAmount).toBe(40)
  })

  it("mappe Mois passé : courant = col. 0, passé = même pipeline au mois N−1 année", () => {
    const mapped = mapMonthlyTrendRowsToPastMonthComparisonAmounts(
      [
        {
          current: 0,
          prior: 0,
          trendValues: [80, 70, 60, 20],
          balanceAccounts: [
            {
              accountNumber: "1100",
              accountName: "Clients",
              amount: 0,
              priorAmount: 0,
              trendValues: [80, 70, 60, 20],
            },
          ],
        },
      ],
      8,
      2026,
      ["Aoû 2026", "Jul 2026", "Jun 2026", "Aoû 2025"],
    )
    expect(mapped[0]?.current).toBe(80)
    expect(mapped[0]?.prior).toBe(20)
    expect(mapped[0]?.balanceAccounts?.[0]?.amount).toBe(80)
    expect(mapped[0]?.balanceAccounts?.[0]?.priorAmount).toBe(20)
  })
})
