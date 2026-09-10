import { describe, expect, it } from "vitest"
import {
  capitalisationHypothesisValueLabel,
  describeCapitalisationLiaison,
  formatCapitalisationDisplayFormat,
  formatCapitalisationValue,
  indentCapitalisationRow,
  isCapitalisationFormulaRow,
  isCapitalisationHypothesisRow,
  parseCapitalisationValuesConfig,
  resolveCapitalisationAmount,
} from "@/lib/capitalisation-structure"

describe("capitalisation-structure", () => {
  it("describes hypothesis and the four formula modes", () => {
    expect(
      describeCapitalisationLiaison({
        label: "Rendement sans risque",
        defineMapping: true,
        liaisonMode: "na",
      }),
    ).toBe("Hypothèse")
    expect(
      describeCapitalisationLiaison({
        label: "Total",
        defineMapping: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["A", "B"],
      }),
    ).toBe("A + B")
    expect(
      describeCapitalisationLiaison({
        label: "Écart",
        defineMapping: true,
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["A"],
        liaisonDenominatorCodes: ["B"],
      }),
    ).toBe("A − B")
    expect(
      describeCapitalisationLiaison({
        label: "Produit",
        defineMapping: true,
        liaisonMode: "product",
        liaisonSumCodes: ["A", "B"],
      }),
    ).toBe("A × B")
    expect(
      describeCapitalisationLiaison({
        label: "Ratio",
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["A"],
        liaisonDenominatorCodes: ["B"],
      }),
    ).toBe("A ÷ B")
  })

  it("maps indent and format helpers", () => {
    expect(indentCapitalisationRow({ indent: true })).toBe(true)
    expect(indentCapitalisationRow({ isBold: true })).toBe(false)
    expect(formatCapitalisationDisplayFormat({ displayFormat: "percent" })).toBe("%")
  })

  it("resolves hypothesis inputs and formula totals", () => {
    const structure = [
      { id: "r1", label: "Rendement sans risque", defineMapping: true, liaisonMode: "na" },
      {
        id: "r2",
        label: "Prime de risque",
        defineMapping: true,
        liaisonMode: "na",
        displayFormat: "percent",
      },
      {
        id: "r3",
        label: "Total",
        defineMapping: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["Rendement sans risque", "Prime de risque"],
        displayFormat: "percent",
      },
    ]
    const values = { r1: 3.5, r2: 5 }

    expect(isCapitalisationHypothesisRow(structure[0]!)).toBe(true)
    expect(isCapitalisationFormulaRow(structure[2]!)).toBe(true)
    expect(resolveCapitalisationAmount(structure[0]!, structure, values)).toBe(3.5)
    expect(resolveCapitalisationAmount(structure[2]!, structure, values)).toBe(8.5)
    expect(formatCapitalisationValue(8.5, structure[2]!)).toBe("8,5 %")
  })

  it("multiplies percent operands as fractions (6.2% × 26.5% = 1.643%)", () => {
    const structure = [
      {
        id: "pretax",
        label: "Coût de la dette avant impôts",
        defineMapping: true,
        liaisonMode: "na",
        displayFormat: "percent",
      },
      {
        id: "tax",
        label: "Taux d'imposition",
        defineMapping: true,
        liaisonMode: "na",
        displayFormat: "percent",
      },
      {
        id: "savings",
        label: "Économies d'impôts",
        defineMapping: true,
        liaisonMode: "product",
        liaisonSumCodes: ["Coût de la dette avant impôts", "Taux d'imposition"],
        displayFormat: "percent",
      },
    ]
    const values = { pretax: 6.2, tax: 26.5 }
    const result = resolveCapitalisationAmount(structure[2]!, structure, values)
    expect(result).toBeCloseTo(1.643, 3)
    expect(formatCapitalisationValue(result, structure[2]!)).toBe("1,64 %")
  })

  it("parses nested and legacy flat config payloads", () => {
    expect(
      parseCapitalisationValuesConfig({
        values: { r1: 3.5 },
        notes: { r1: "Note" },
      }),
    ).toEqual({ values: { r1: 3.5 }, notes: { r1: "Note" } })
    expect(parseCapitalisationValuesConfig({ r1: 2, r2: 1 })).toEqual({
      values: { r1: 2, r2: 1 },
      notes: {},
    })
    expect(capitalisationHypothesisValueLabel({ displayFormat: "percent" })).toBe("Taux (%)")
  })
})
