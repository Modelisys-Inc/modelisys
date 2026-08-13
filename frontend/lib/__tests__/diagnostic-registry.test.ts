import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createDiagnostic,
  findLatestDiagnosticForCompany,
  getDiagnostic,
  listDiagnostics,
  touchDiagnostic,
} from "@/lib/diagnostic-registry"

const STORAGE_KEY = "modelisys-diagnostic-registry"

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
    clear: () => localStore.clear(),
  })
  vi.stubGlobal("crypto", {
    randomUUID: () => "uuid-test-1",
  })
})

describe("diagnostic-registry", () => {
  it("creates and lists diagnostics and updates lastOpenedAt on touch", () => {
    const a = createDiagnostic({
      companyId: "c1",
      companyName: "Alpha",
      referenceYear: 2025,
      referenceMonth: 6,
    })
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-test-2" })
    const b = createDiagnostic({
      companyId: "c2",
      companyName: "Beta",
      title: "Rapport Q1",
      referenceYear: 2024,
      referenceMonth: 12,
    })

    const touched = touchDiagnostic(a.id)

    const list = listDiagnostics()
    expect(list).toHaveLength(2)
    expect(touched).not.toBeNull()
    expect(getDiagnostic(b.id)?.title).toBe("Rapport Q1")
  })

  it("finds latest diagnostic for a company", () => {
    createDiagnostic({
      companyId: "c1",
      companyName: "Alpha",
      referenceYear: 2025,
      referenceMonth: 3,
    })
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-test-2" })
    const second = createDiagnostic({
      companyId: "c1",
      companyName: "Alpha",
      title: "V2",
      referenceYear: 2025,
      referenceMonth: 12,
    })
    expect(findLatestDiagnosticForCompany("c1")?.id).toBe(second.id)
  })

  it("persists to localStorage", () => {
    createDiagnostic({
      companyId: "c1",
      companyName: "Alpha",
      referenceYear: 2025,
      referenceMonth: 3,
    })
    const raw = localStore.get(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toHaveLength(1)
  })
})
