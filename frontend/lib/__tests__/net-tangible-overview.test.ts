import { describe, expect, it } from "vitest"
import { buildNetTangibleOverviewMetrics } from "@/lib/net-tangible-overview"

describe("buildNetTangibleOverviewMetrics", () => {
  it("computes VC, VCA, ACN, debts, surplus, required assets; FDR stays empty", () => {
    const rows = [
      { label: "Encaisse", id: "a", current: 100, isResult: false },
      { label: "Placements", id: "b", current: 900, isResult: false },
      { label: "Total de l'actif", id: "ta", current: 1000, isResult: true },
      { label: "Fournisseurs", id: "p", current: 400, isResult: false },
      { label: "Total des passifs", id: "tp", current: 400, isResult: true },
      { label: "Total des capitaux propres", id: "eq", current: 600, isResult: true },
    ]
    const values = {
      a: { adjustments: 0, debts: 0, assets: 50 },
      b: { adjustments: 50, debts: 100, assets: 0 },
      // Totals may also hold rolled values when structure is present; leaves drive sums.
    }

    const structure = [
      { label: "Encaisse", linkCode: "ACT-A", isResult: false },
      { label: "Placements", linkCode: "ACT-B", isResult: false },
      {
        label: "Total de l'actif",
        linkCode: "ACT",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ACT-A", "ACT-B"],
      },
      { label: "Fournisseurs", linkCode: "PCT-C", isResult: false },
      {
        label: "Total des passifs",
        linkCode: "PCT",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["PCT-C"],
      },
      {
        label: "Total des capitaux propres",
        linkCode: "CAP",
        isResult: true,
      },
    ]

    const metrics = buildNetTangibleOverviewMetrics(rows, values, { structure })
    const byId = Object.fromEntries(metrics.map((m) => [m.id, m]))

    expect(byId.vc?.value).toBe(600)
    // Actif net VCA = (1000+50) − (400+0) = 650
    expect(byId.vca?.value).toBe(650)
    // Actif net ACN = (1050−100−50) − (400−0−0) = 900 − 400 = 500
    expect(byId.acn?.value).toBe(500)
    expect(byId.dettes?.value).toBe(100)
    expect(byId["actifs-excedentaires"]?.value).toBe(50)
    // Total actif VCA 1050 − 50 = 1000
    expect(byId["actifs-requis"]?.value).toBe(1000)
    expect(byId["fdr-representatif"]?.value).toBeNull()
  })
})
