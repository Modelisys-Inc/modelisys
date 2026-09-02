import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createValuation,
  getValuation,
  listValuations,
  listValuationsForCompany,
  removeValuation,
  touchValuation,
  valuationDetailPath,
  valuationPlanBackHref,
} from "@/lib/valuation-registry"

const STORAGE_KEY = "modelisys-valuation-registry"

const localStore = new Map<string, string>()

beforeEach(() => {
  localStore.clear()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => localStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStore.set(key, value)
    },
    removeItem: (key: string) => {
      localStore.delete(key)
    },
    clear: () => {
      localStore.clear()
    },
  })
})

describe("valuation-registry", () => {
  it("creates and lists valuations for a company", () => {
    const a = createValuation({
      companyId: "c1",
      companyName: "Acme",
      title: "Valorisation A",
      referenceYear: 2026,
      referenceMonth: 3,
    })
    createValuation({
      companyId: "c2",
      companyName: "Beta",
      title: "Valorisation B",
      referenceYear: 2025,
      referenceMonth: 12,
    })

    expect(listValuations()).toHaveLength(2)
    expect(listValuationsForCompany("c1").map((v) => v.id)).toEqual([a.id])
    expect(getValuation(a.id)?.title).toBe("Valorisation A")
  })

  it("touches and removes valuations", () => {
    const v = createValuation({
      companyId: "c1",
      companyName: "Acme",
      title: "Temp",
      referenceYear: 2026,
      referenceMonth: 1,
    })
    const touched = touchValuation(v.id)
    expect(touched?.lastOpenedAt).toBeTruthy()
    removeValuation(v.id)
    expect(getValuation(v.id)).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")).toEqual([])
  })

  it("builds dashboard path with query params", () => {
    const path = valuationDetailPath({
      id: "v1",
      companyId: "c1",
      referenceMonth: 8,
      referenceYear: 2026,
    })
    expect(path).toContain("/evaluation/v1?")
    expect(path).toContain("companyId=c1")
    expect(path).toContain("refMonth=8")
    expect(path).toContain("refYear=2026")
    expect(path).not.toContain("valuationId=")
  })

  it("builds tool path with valuationId", () => {
    const path = valuationDetailPath(
      {
        id: "v1",
        companyId: "c1",
        referenceMonth: 8,
        referenceYear: 2026,
      },
      "/evaluation/business-model",
    )
    expect(path).toContain("/evaluation/business-model?")
    expect(path).toContain("valuationId=v1")
  })

  it("builds plan back href from search params", () => {
    const href = valuationPlanBackHref({
      get: (key: string) => {
        const values: Record<string, string> = {
          valuationId: "v1",
          companyId: "c1",
          refMonth: "3",
          refYear: "2026",
        }
        return values[key] ?? null
      },
    })
    expect(href).toBe("/evaluation/v1?companyId=c1&refMonth=3&refYear=2026")
  })
})
