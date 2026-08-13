import { describe, expect, it } from "vitest"
import {
  filterCashFlowDetailRowsWithStructureForHorizon,
  shouldKeepCashFlowDetailRowForHorizon,
} from "../cash-flow-horizon-filter"

describe("cash-flow-horizon-filter", () => {
  it("masque un poste liaison à zéro sans comptes GL", () => {
    const structure = [{ label: "TEX-1", linkCode: "TEX-1", defineMapping: true }]
    const rows = [
      {
        label: "TEX-1",
        current: 0,
        prior: 0,
        hasLiaisonCode: true,
        rowId: "TEX-1",
      },
    ]

    expect(shouldKeepCashFlowDetailRowForHorizon(rows[0]!, structure[0], "current")).toBe(false)
    const filtered = filterCashFlowDetailRowsWithStructureForHorizon(rows, structure, "current")
    expect(filtered.rows).toHaveLength(0)
  })

  it("conserve un poste à zéro avec un compte GL non nul", () => {
    const structure = [{ label: "TIN-1", linkCode: "TIN-1", defineMapping: true }]
    const rows = [
      {
        label: "TIN-1",
        current: 0,
        prior: 0,
        hasLiaisonCode: true,
        rowId: "TIN-1",
        balanceAccounts: [{ accountNumber: "1000", amount: 50, priorAmount: 0 }],
      },
    ]

    expect(shouldKeepCashFlowDetailRowForHorizon(rows[0]!, structure[0], "current")).toBe(true)
  })

  it("conserve les totaux de section et la trésorerie fixe même à zéro", () => {
    const structure = [
      { label: "Activités d'exploitation", isSection: true },
      { label: "Total exploitation", isResult: true, linkCode: "TEX-T", defineMapping: true },
      { label: "Trésorerie au début" },
      { label: "Variation de la trésorerie", isResult: true },
    ]
    const rows = [
      { label: "Activités d'exploitation", isSection: true, current: 0, prior: 0 },
      { label: "Total exploitation", isSubtotal: true, current: 0, prior: 0, hasLiaisonCode: true },
      { label: "Trésorerie au début", current: 0, prior: 0, hasLiaisonCode: true },
      { label: "Variation de la trésorerie", isSubtotal: true, current: 0, prior: 0 },
    ]

    const filtered = filterCashFlowDetailRowsWithStructureForHorizon(rows, structure, "current")
    expect(filtered.rows).toHaveLength(4)
  })

  it("masque un poste à zéro en vue mensuelle si toutes les colonnes sont nulles", () => {
    const structure = [{ label: "TFI-1", linkCode: "TFI-1", defineMapping: true }]
    const rows = [
      {
        label: "TFI-1",
        current: 0,
        prior: 0,
        trendValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        hasLiaisonCode: true,
      },
    ]

    const filtered = filterCashFlowDetailRowsWithStructureForHorizon(rows, structure, "12months")
    expect(filtered.rows).toHaveLength(0)
  })
})
