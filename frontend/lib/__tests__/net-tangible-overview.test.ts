import { describe, expect, it } from "vitest"
import {
  applyNetTangibleFdrOverviewAdjustment,
  buildNetTangibleOverviewMetrics,
} from "@/lib/net-tangible-overview"
describe("buildNetTangibleOverviewMetrics", () => {
  it("derives surplus from Total de l'actif / Total des passifs and FDR from court terme rows", () => {
    const rows = [
      { label: "Encaisse", id: "a", current: 600, isResult: false },
      { label: "Clients", id: "b", current: 400, isResult: false },
      {
        label: "Total de l'actif à court terme",
        id: "total-act-ct",
        current: 1000,
        isResult: true,
      },
      { label: "Immobilisations", id: "alt-b", current: 500, isResult: false },
      {
        label: "Total ALT",
        id: "total-alt",
        current: 500,
        isResult: true,
      },
      {
        label: "Total de l'actif",
        id: "total-actif",
        current: 1500,
        isResult: true,
      },
      { label: "Fournisseurs", id: "p", current: 200, isResult: false },
      {
        label: "Total du passif à court terme",
        id: "total-pct-ct",
        current: 200,
        isResult: true,
      },
      {
        label: "Total des passifs",
        id: "total-passifs",
        current: 200,
        isResult: true,
      },
      { label: "Total des capitaux propres", id: "eq", current: 600, isResult: true },
    ]
    const values = {
      a: { adjustments: 0, debts: 0, assets: 50 },
      b: { adjustments: 0, debts: 0, assets: 30 },
      "alt-b": { adjustments: 20, debts: 10, assets: 5 },
      p: { adjustments: 0, debts: 0, assets: 40 },
    }

    const structure = [
      { label: "Encaisse", linkCode: "ACT-A", isResult: false },
      { label: "Clients", linkCode: "ACT-C", isResult: false },
      {
        label: "Total de l'actif à court terme",
        linkCode: "ACT",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ACT-A", "ACT-C"],
      },
      { label: "Immobilisations", linkCode: "ALT-B", isResult: false },
      {
        label: "Total ALT",
        linkCode: "ALT",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ALT-B"],
      },
      {
        label: "Total de l'actif",
        isResult: true,
        formula: ["+ACT", "+ALT"],
      },
      { label: "Fournisseurs", linkCode: "PCT-C", isResult: false },
      {
        label: "Total du passif à court terme",
        linkCode: "PCT",
        isResult: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["PCT-C"],
      },
      {
        label: "Total des passifs",
        isResult: true,
        formula: ["+PCT"],
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
    expect(byId.dettes?.value).toBe(10)
    // Total de l'actif Actifs (50+30+5) − Total des passifs Actifs (40) = 45
    expect(byId["actifs-excedentaires"]?.value).toBe(45)
    // Total ALT ACN = 500 + 20 − 10 − 5 = 505
    expect(byId["actifs-requis"]?.value).toBe(505)
    // ACT CT ACN (1000 − (50+30)) − PCT CT ACN (200 − 40) = 920 − 160 = 760
    expect(byId["fdr-representatif"]?.value).toBe(760)
  })

  it("returns null for family-derived metrics when grand totals and court terme rows are missing", () => {
    const rows = [
      { label: "Encaisse", id: "a", current: 100, isResult: false },
      { label: "Total des capitaux propres", id: "eq", current: 100, isResult: true },
    ]
    const values = {
      a: { adjustments: 0, debts: 0, assets: 50 },
    }

    const metrics = buildNetTangibleOverviewMetrics(rows, values)
    const byId = Object.fromEntries(metrics.map((m) => [m.id, m]))

    expect(byId["actifs-excedentaires"]?.value).toBeNull()
    expect(byId["actifs-requis"]?.value).toBeNull()
    expect(byId["fdr-representatif"]?.value).toBeNull()
  })

  it("actifs requis falls back to top-level ALT family rows when root ALT total is absent", () => {
    const rows = [
      { label: "Encaisse", id: "a", current: 600, isResult: false },
      { label: "Immobilisations corporelles", id: "alt-b", current: 300, isResult: false },
      { label: "Actifs incorporels", id: "alt-d", current: 200, isResult: false },
      { label: "Total des capitaux propres", id: "eq", current: 500, isResult: true },
    ]
    const values = {
      "alt-b": { adjustments: 20, debts: 10, assets: 5 },
      "alt-d": { adjustments: 10, debts: 5, assets: 3 },
    }

    const structure = [
      { label: "Encaisse", linkCode: "ACT-A", isResult: false },
      { label: "Immobilisations corporelles", linkCode: "ALT-B", isResult: false },
      { label: "Actifs incorporels", linkCode: "ALT-D", isResult: false },
      { label: "Total des capitaux propres", linkCode: "CAP", isResult: true },
    ]

    const metrics = buildNetTangibleOverviewMetrics(rows, values, { structure })
    const byId = Object.fromEntries(metrics.map((m) => [m.id, m]))

    // ALT ACN = (300+20−10−5) + (200+10−5−3) = 305 + 202 = 507
    expect(byId["actifs-requis"]?.value).toBe(507)
  })

  it("applies FDR adjustment to bandeau FDR, ACN and surplus assets", () => {
    const base = buildNetTangibleOverviewMetrics(
      [
        { label: "Encaisse", id: "a", current: 600, isResult: false },
        {
          label: "Total de l'actif à court terme",
          id: "total-act-ct",
          current: 1000,
          isResult: true,
        },
        {
          label: "Total de l'actif",
          id: "total-actif",
          current: 1500,
          isResult: true,
        },
        {
          label: "Total du passif à court terme",
          id: "total-pct-ct",
          current: 200,
          isResult: true,
        },
        {
          label: "Total des passifs",
          id: "total-passifs",
          current: 200,
          isResult: true,
        },
        { label: "Total des capitaux propres", id: "eq", current: 600, isResult: true },
      ],
      {
        a: { adjustments: 0, debts: 0, assets: 50 },
      },
      {
        structure: [
          { label: "Encaisse", linkCode: "ACT-A", isResult: false },
          {
            label: "Total de l'actif à court terme",
            linkCode: "ACT",
            isResult: true,
            liaisonMode: "sum",
            liaisonSumCodes: ["ACT-A"],
          },
          {
            label: "Total de l'actif",
            isResult: true,
            formula: ["+ACT"],
          },
          {
            label: "Total du passif à court terme",
            linkCode: "PCT",
            isResult: true,
          },
          {
            label: "Total des passifs",
            isResult: true,
            formula: ["+PCT"],
          },
          {
            label: "Total des capitaux propres",
            linkCode: "CAP",
            isResult: true,
          },
        ],
      },
    )
    const byIdBase = Object.fromEntries(base.map((m) => [m.id, m]))
    const fdrBase = byIdBase["fdr-representatif"]?.value
    expect(fdrBase).not.toBeNull()

    const adjusted = applyNetTangibleFdrOverviewAdjustment(base, {
      fdrAdjustedValue: (fdrBase ?? 0) + 100,
      fdrAdjustmentDollarDelta: 100,
    })
    const byId = Object.fromEntries(adjusted.map((m) => [m.id, m]))

    expect(byId["fdr-representatif"]?.label).toBe("FDR représentatif ajusté")
    expect(byId["fdr-representatif"]?.value).toBe((fdrBase ?? 0) + 100)
    expect(byId.acn?.value).toBe((byIdBase.acn?.value ?? 0) + 100)
    expect(byId["actifs-excedentaires"]?.value).toBe(
      (byIdBase["actifs-excedentaires"]?.value ?? 0) - 100,
    )
  })
})
