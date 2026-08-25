import { describe, it, expect } from "vitest"
import {
  buildDebtLoanFromCapexFinancing,
  resolveCapexAssetLinkCodeForDebt,
  type CapexFinancingConfig,
} from "../capex-financing-utils"
import { debtLinkCodeFromCapexAssetLinkCode } from "../standard-link-code-utils"

const financedConfig = (partial?: Partial<CapexFinancingConfig>): CapexFinancingConfig => ({
  projectName: "Projet test",
  totalAmount: 100_000,
  serviceDate: { year: 2026, month: 1 },
  mode: "financed",
  financedAmount: 100_000,
  debt: {
    interestRate: 5,
    termMonths: 60,
    repaymentMode: "interest_only",
    firstPaymentDate: { year: 2026, month: 1 },
  },
  ...partial,
})

describe("debtLinkCodeFromCapexAssetLinkCode", () => {
  it("maps ALT-B and ALT-D to PLT-C", () => {
    expect(debtLinkCodeFromCapexAssetLinkCode("ALT-B")).toBe("PLT-C")
    expect(debtLinkCodeFromCapexAssetLinkCode("ALT-B.1")).toBe("PLT-C")
    expect(debtLinkCodeFromCapexAssetLinkCode("ALT-D.2")).toBe("PLT-C")
  })

  it("maps ALT-C to PLT-D", () => {
    expect(debtLinkCodeFromCapexAssetLinkCode("ALT-C")).toBe("PLT-D")
    expect(debtLinkCodeFromCapexAssetLinkCode("ALT-C.1")).toBe("PLT-D")
  })

  it("returns undefined for non-capex codes", () => {
    expect(debtLinkCodeFromCapexAssetLinkCode("ACT-A")).toBeUndefined()
    expect(debtLinkCodeFromCapexAssetLinkCode("")).toBeUndefined()
  })
})

describe("resolveCapexAssetLinkCodeForDebt", () => {
  it("uses row linkCode when present", () => {
    expect(
      resolveCapexAssetLinkCodeForDebt("detail-uuid-1", { rowLinkCode: "ALT-B.2" }),
    ).toBe("ALT-B.2")
  })

  it("resolves from structure when rowId is a UUID", () => {
    expect(
      resolveCapexAssetLinkCodeForDebt("detail-uuid-equip", {
        structureRows: [
          { id: "detail-uuid-other", linkCode: "ALT-B.1" },
          { id: "detail-uuid-equip", linkCode: "ALT-B.3", label: "Équipement" },
        ],
      }),
    ).toBe("ALT-B.3")
  })

  it("falls back to rowId when it is already an ALT code", () => {
    expect(resolveCapexAssetLinkCodeForDebt("ALT-C")).toBe("ALT-C")
  })
})

describe("buildDebtLoanFromCapexFinancing", () => {
  it("sets sourceLinkCode PLT-C for financed corporeal / intangible assets", () => {
    const loan = buildDebtLoanFromCapexFinancing(
      financedConfig(),
      "detail-uuid-1:adj1",
      2026,
      undefined,
      "ALT-B.1",
    )
    expect(loan).toMatchObject({
      sourceType: "capex",
      sourceCapexKey: "detail-uuid-1:adj1",
      sourceLinkCode: "PLT-C",
      principal: 100_000,
      hypothesisDefined: true,
    })
  })

  it("sets sourceLinkCode PLT-D for financed leased assets", () => {
    const loan = buildDebtLoanFromCapexFinancing(
      financedConfig({ projectName: "Location camion" }),
      "ALT-C-1:adj2",
      2026,
      undefined,
      "ALT-C",
    )
    expect(loan?.sourceLinkCode).toBe("PLT-D")
  })

  it("keeps existing sourceLinkCode when asset code is unknown", () => {
    const loan = buildDebtLoanFromCapexFinancing(
      financedConfig(),
      "x-1:adj",
      2026,
      "loan-1",
      "ACT-A",
      "PLT-C",
    )
    expect(loan?.sourceLinkCode).toBe("PLT-C")
  })

  it("returns null when cash (no financed amount)", () => {
    expect(
      buildDebtLoanFromCapexFinancing(
        financedConfig({ mode: "cash", financedAmount: undefined, debt: undefined }),
        "k",
        2026,
        undefined,
        "ALT-B",
      ),
    ).toBeNull()
  })
})
