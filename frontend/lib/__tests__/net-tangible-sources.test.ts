import { describe, expect, it } from "vitest"
import { buildNetTangibleSourceRows } from "@/components/net-tangible/sources-section"

describe("buildNetTangibleSourceRows — annex Capex", () => {
  const parentId = "parent-alt-b"
  const rows = [{ id: parentId, label: "Immobilisations corporelles" }]

  it("lists Parent - Child for JVM adjustments and Excédent by annex post", () => {
    const sourceRows = buildNetTangibleSourceRows({
      rows,
      valuesByRowId: {
        [parentId]: { vc: 100_000, adjustments: 15_000, debts: 0, assets: 8_000, vca: 115_000 },
      },
      notesByRowId: {
        [parentId]: { adjustments: "", debts: "", assets: "" },
      },
      jvmByCodeByRowId: {
        [parentId]: { "ALT-B.1": 60_000, "ALT-B.2": 55_000 },
      },
      jvmNotesByCodeByRowId: {
        [parentId]: { "ALT-B.1": "Évaluation terrain" },
      },
      excedentByCodeByRowId: {
        [parentId]: { "ALT-B.2": 8_000 },
      },
      excedentNotesByCodeByRowId: {
        [parentId]: { "ALT-B.2": "Surplus bâtiment" },
      },
      annexPostsByParentRowId: {
        [parentId]: [
          { code: "ALT-B.1", label: "Terrains", vc: 50_000 },
          { code: "ALT-B.2", label: "Bâtiments", vc: 50_000 },
        ],
      },
      fdrAdjNote: "",
      fdrAdjustedValue: null,
      fdrAdjModeLabel: "Ajustement $",
      fdrAdjustmentDollarDelta: null,
    })

    const adjustments = sourceRows.filter((r) => r.group === "adjustments")
    expect(adjustments).toEqual([
      expect.objectContaining({
        id: `${parentId}-jvm-ALT-B.1`,
        param: "Immobilisations corporelles - Terrains",
        note: "Évaluation terrain",
      }),
      expect.objectContaining({
        id: `${parentId}-jvm-ALT-B.2`,
        param: "Immobilisations corporelles - Bâtiments",
      }),
    ])
    expect(adjustments[0]?.valueLabel).toMatch(/^\+.*10/)
    expect(adjustments[1]?.valueLabel).toMatch(/^\+.*5/)

    const assets = sourceRows.filter((r) => r.group === "assets")
    expect(assets).toEqual([
      expect.objectContaining({
        id: `${parentId}-excedent-ALT-B.2`,
        param: "Immobilisations corporelles - Bâtiments",
        note: "Surplus bâtiment",
      }),
    ])
    expect(assets[0]?.valueLabel).toMatch(/^\+/)
  })

  it("expands from JVM keys even when annexPosts is empty (repli libellé = code)", () => {
    const sourceRows = buildNetTangibleSourceRows({
      rows,
      valuesByRowId: {
        [parentId]: { vc: 100_000, adjustments: 468_002, debts: 0, assets: 0, vca: 568_002 },
      },
      notesByRowId: {
        [parentId]: { adjustments: "", debts: "", assets: "" },
      },
      jvmByCodeByRowId: {
        [parentId]: { "ALT-B.1": 150_000, "ALT-B.2": 208_000 },
      },
      jvmNotesByCodeByRowId: {},
      excedentByCodeByRowId: {},
      excedentNotesByCodeByRowId: {},
      annexPostsByParentRowId: {
        [parentId]: [
          { code: "ALT-B.1", label: "Terrains", vc: 50_000 },
          { code: "ALT-B.2", label: "Bâtiments", vc: 100_000 },
        ],
      },
      fdrAdjNote: "",
      fdrAdjustedValue: null,
      fdrAdjModeLabel: "Ajustement $",
      fdrAdjustmentDollarDelta: null,
    })

    const adjustments = sourceRows.filter((r) => r.group === "adjustments")
    expect(adjustments.map((r) => r.param)).toEqual([
      "Immobilisations corporelles - Terrains",
      "Immobilisations corporelles - Bâtiments",
    ])
    expect(adjustments.every((r) => r.param !== "Immobilisations corporelles")).toBe(true)
    expect(adjustments[0]?.valueLabel).toMatch(/^\+.*100/)
    expect(adjustments[1]?.valueLabel).toMatch(/^\+.*108/)
  })

  it("does not fall back to parent total when JVM keys exist", () => {
    const sourceRows = buildNetTangibleSourceRows({
      rows,
      valuesByRowId: {
        [parentId]: { vc: 100_000, adjustments: 468_002, debts: 0, assets: 0, vca: 568_002 },
      },
      notesByRowId: {
        [parentId]: { adjustments: "", debts: "", assets: "" },
      },
      jvmByCodeByRowId: {
        [parentId]: { "ALT-B.1": 150_000 },
      },
      jvmNotesByCodeByRowId: {},
      excedentByCodeByRowId: {},
      excedentNotesByCodeByRowId: {},
      // Pas d’annexe résolue : libellé = code, VC = 0 → delta = JVM
      annexPostsByParentRowId: {},
      fdrAdjNote: "",
      fdrAdjustedValue: null,
      fdrAdjModeLabel: "Ajustement $",
      fdrAdjustmentDollarDelta: null,
    })

    expect(sourceRows.some((r) => r.param === "Immobilisations corporelles")).toBe(false)
    expect(sourceRows[0]).toEqual(
      expect.objectContaining({
        param: "Immobilisations corporelles - ALT-B.1",
        group: "adjustments",
      }),
    )
  })

  it("skips annex posts with zero delta / zero excédent", () => {
    const sourceRows = buildNetTangibleSourceRows({
      rows,
      valuesByRowId: {
        [parentId]: { vc: 50_000, adjustments: 0, debts: 0, assets: 0, vca: 50_000 },
      },
      notesByRowId: {
        [parentId]: { adjustments: "", debts: "", assets: "" },
      },
      jvmByCodeByRowId: {
        [parentId]: { "ALT-B.1": 50_000 },
      },
      jvmNotesByCodeByRowId: {},
      excedentByCodeByRowId: {
        [parentId]: { "ALT-B.1": 0 },
      },
      excedentNotesByCodeByRowId: {},
      annexPostsByParentRowId: {
        [parentId]: [{ code: "ALT-B.1", label: "Terrains", vc: 50_000 }],
      },
      fdrAdjNote: "",
      fdrAdjustedValue: null,
      fdrAdjModeLabel: "Ajustement $",
      fdrAdjustmentDollarDelta: null,
    })

    expect(sourceRows).toHaveLength(0)
  })

  it("keeps leaf Dettes / Excédent labels for non-annexe rows", () => {
    const debtId = "debt-row"
    const sourceRows = buildNetTangibleSourceRows({
      rows: [{ id: debtId, label: "Dette à long terme" }],
      valuesByRowId: {
        [debtId]: { vc: 10_000, adjustments: 0, debts: 10_000, assets: 2_000, vca: 10_000 },
      },
      notesByRowId: {
        [debtId]: { adjustments: "", debts: "Banque", assets: "Cash excédentaire" },
      },
      jvmByCodeByRowId: {},
      jvmNotesByCodeByRowId: {},
      excedentByCodeByRowId: {},
      excedentNotesByCodeByRowId: {},
      fdrAdjNote: "",
      fdrAdjustedValue: null,
      fdrAdjModeLabel: "Ajustement $",
      fdrAdjustmentDollarDelta: null,
    })

    expect(sourceRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: "debts",
          param: "Dette à long terme",
          note: "Banque",
        }),
        expect.objectContaining({
          group: "assets",
          param: "Dette à long terme",
          note: "Cash excédentaire",
        }),
      ]),
    )
  })
})
