import { describe, expect, it } from "vitest"
import {
  buildNetTangibleSurplusPosts,
  computeNetTangibleSurplusAssetsTotal,
  parseNetTangibleExcedentNoteStorageKey,
  parseNetTangibleExcedentStorageKey,
} from "@/lib/net-tangible-surplus-assets"

describe("buildNetTangibleSurplusPosts", () => {
  it("uses resolved JVM from jvm posts and saved excedent per code", () => {
    const posts = buildNetTangibleSurplusPosts(
      [
        { code: "ALT-B.1", label: "Terrain", vc: 100, jvm: 120, note: "", attachments: [] },
        { code: "ALT-B.2", label: "Bâtiment", vc: 400, jvm: 550, note: "", attachments: [] },
      ],
      { "ALT-B.2": 75_000 },
    )
    expect(posts[0]?.jvm).toBe(120)
    expect(posts[0]?.excedent).toBe(0)
    expect(posts[1]?.jvm).toBe(550)
    expect(posts[1]?.excedent).toBe(75_000)
  })
})

describe("computeNetTangibleSurplusAssetsTotal", () => {
  it("sums excedent amounts", () => {
    const total = computeNetTangibleSurplusAssetsTotal([
      { code: "A", label: "A", jvm: 100, excedent: 10_000, note: "", attachments: [] },
      { code: "B", label: "B", jvm: 200, excedent: 25_000, note: "", attachments: [] },
    ])
    expect(total).toBe(35_000)
  })
})

describe("excedent storage keys", () => {
  it("ignores note keys when parsing excedent amount keys", () => {
    expect(parseNetTangibleExcedentStorageKey("row-alt-b-excedent-note-ALT-B.1")).toBeNull()
    expect(parseNetTangibleExcedentStorageKey("row-alt-b-excedent-ALT-B.1")).toEqual({
      parentRowId: "row-alt-b",
      code: "ALT-B.1",
    })
    expect(parseNetTangibleExcedentNoteStorageKey("row-alt-b-excedent-note-ALT-B.1")).toEqual({
      parentRowId: "row-alt-b",
      code: "ALT-B.1",
    })
  })
})
