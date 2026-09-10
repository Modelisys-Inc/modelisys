import { describe, expect, it } from "vitest"
import {
  isNetTangibleRollupRow,
  netTangibleDerivedAmount,
  resolveNetTangibleColumnRollups,
  type NetTangibleRollupRow,
} from "@/lib/net-tangible-column-rollup"

describe("resolveNetTangibleColumnRollups", () => {
  it("keeps leaf values and sums positional subtotals", () => {
    const rows: NetTangibleRollupRow[] = [
      { label: "Encaisse", rowId: "a", linkCode: "ACT-A" },
      { label: "Clients", rowId: "b", linkCode: "ACT-C" },
      { label: "Total de l'actif à court terme", rowId: "total-act", isResult: true },
    ]
    const values = {
      a: { adjustments: 100, debts: 10, assets: 5 },
      b: { adjustments: 50, debts: 20, assets: 0 },
    }
    const resolved = resolveNetTangibleColumnRollups(rows, values)
    expect(resolved.a).toEqual({ adjustments: 100, debts: 10, assets: 5 })
    expect(resolved.b).toEqual({ adjustments: 50, debts: 20, assets: 0 })
    expect(resolved["total-act"]).toEqual({ adjustments: 150, debts: 30, assets: 5 })
  })

  it("sums via liaisonSumCodes", () => {
    const rows: NetTangibleRollupRow[] = [
      { label: "Encaisse", rowId: "a", linkCode: "ACT-A" },
      { label: "Clients", rowId: "b", linkCode: "ACT-C" },
      {
        label: "Total ACT",
        rowId: "total",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ACT-A", "ACT-C"],
      },
    ]
    const values = {
      a: { adjustments: 10, debts: 1, assets: 0 },
      b: { adjustments: 20, debts: 2, assets: 3 },
    }
    const resolved = resolveNetTangibleColumnRollups(rows, values)
    expect(resolved.total).toEqual({ adjustments: 30, debts: 3, assets: 3 })
  })

  it("evaluates formula refs including nested subtotals", () => {
    const rows: NetTangibleRollupRow[] = [
      { label: "Encaisse", rowId: "a", linkCode: "ACT-A" },
      { label: "Clients", rowId: "b", linkCode: "ACT-C" },
      {
        label: "Total court terme",
        rowId: "ct",
        isResult: true,
        formula: ["+ACT-A", "+ACT-C"],
      },
      { label: "Immos", rowId: "immo", linkCode: "ALT-B" },
      {
        label: "Total de l'actif",
        rowId: "ta",
        isResult: true,
        formula: ["+ct", "+ALT-B"],
      },
    ]
    const values = {
      a: { adjustments: 10, debts: 0, assets: 0 },
      b: { adjustments: 20, debts: 0, assets: 0 },
      immo: { adjustments: 5, debts: 0, assets: 0 },
    }
    const resolved = resolveNetTangibleColumnRollups(rows, values)
    expect(resolved.ct).toEqual({ adjustments: 30, debts: 0, assets: 0 })
    expect(resolved.ta).toEqual({ adjustments: 35, debts: 0, assets: 0 })
  })

  it("detects rollup rows", () => {
    expect(isNetTangibleRollupRow({ label: "x", isResult: true })).toBe(true)
    expect(isNetTangibleRollupRow({ label: "x", formula: ["+A"] })).toBe(true)
    expect(isNetTangibleRollupRow({ label: "x", liaisonMode: "sum", liaisonSumCodes: ["A"] })).toBe(
      true,
    )
    expect(isNetTangibleRollupRow({ label: "x", linkCode: "ACT-A" })).toBe(false)
  })
})

describe("netTangibleDerivedAmount", () => {
  it("computes VCA and ACN from book + column amounts", () => {
    const amounts = { adjustments: 100, debts: 30, assets: 20 }
    expect(netTangibleDerivedAmount(1000, amounts, "vca")).toBe(1100)
    expect(netTangibleDerivedAmount(1000, amounts, "acn")).toBe(1050)
    expect(netTangibleDerivedAmount(1000, undefined, "vca")).toBe(1000)
    expect(netTangibleDerivedAmount(1000, undefined, "acn")).toBe(1000)
  })
})
