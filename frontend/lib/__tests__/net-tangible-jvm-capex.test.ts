import { describe, expect, it } from "vitest"
import {
  buildNetTangibleJvmCapexPosts,
  computeNetTangibleJvmCapexAdjustment,
  isNetTangibleJvmCapexRootLinkCode,
  isNetTangibleJvmCapexRootLabel,
  isNetTangibleJvmCapexRootRow,
  netTangibleJvmStorageKey,
  parseNetTangibleJvmStorageKey,
} from "@/lib/net-tangible-jvm-capex"

describe("isNetTangibleJvmCapexRoot*", () => {
  it("matches only ALT-B / ALT-C / ALT-D roots", () => {
    expect(isNetTangibleJvmCapexRootLinkCode("ALT-B")).toBe(true)
    expect(isNetTangibleJvmCapexRootLinkCode("ALT-C")).toBe(true)
    expect(isNetTangibleJvmCapexRootLinkCode("ALT-D")).toBe(true)
    expect(isNetTangibleJvmCapexRootLinkCode("ALT-B.1")).toBe(false)
    expect(isNetTangibleJvmCapexRootLinkCode("ACT-A")).toBe(false)
  })

  it("matches labels Immobilisations corporelles / Biens loués / Actifs incorporels", () => {
    expect(isNetTangibleJvmCapexRootLabel("Immobilisations corporelles")).toBe(true)
    expect(isNetTangibleJvmCapexRootLabel("Biens loués")).toBe(true)
    expect(isNetTangibleJvmCapexRootLabel("Actifs incorporels")).toBe(true)
    expect(isNetTangibleJvmCapexRootLabel("Encaisse")).toBe(false)
  })

  it("resolves from linkCode or label", () => {
    expect(isNetTangibleJvmCapexRootRow({ linkCode: "ALT-B", label: "X" })).toBe(true)
    expect(isNetTangibleJvmCapexRootRow({ label: "Biens loués" })).toBe(true)
    expect(isNetTangibleJvmCapexRootRow({ linkCode: "ACT-A", label: "Encaisse" })).toBe(false)
  })
})

describe("buildNetTangibleJvmCapexPosts + adjustment", () => {
  it("defaults JVM to VC and computes sum(JVM − VC)", () => {
    const posts = buildNetTangibleJvmCapexPosts(
      [
        { code: "ALT-B.1", label: "Terrain", amount: 100 },
        { code: "ALT-B.2", label: "Bâtiment", amount: 400 },
      ],
      { "ALT-B.2": 550 },
    )
    expect(posts).toEqual([
      { code: "ALT-B.1", label: "Terrain", vc: 100, jvm: 100, note: "", attachments: [] },
      { code: "ALT-B.2", label: "Bâtiment", vc: 400, jvm: 550, note: "", attachments: [] },
    ])
    expect(computeNetTangibleJvmCapexAdjustment(posts)).toBe(150)
  })
})

describe("jvm storage keys", () => {
  it("ignores note keys when parsing jvm amount keys", () => {
    expect(parseNetTangibleJvmStorageKey("row-alt-b-jvm-note-ALT-B.1")).toBeNull()
  })
})
