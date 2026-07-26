import { describe, it, expect } from "vitest"
import type { StandardLinkCode } from "@/lib/api"
import {
  balanceSheetDetailCanExpandGlAccounts,
  balanceSheetDetailRowAllowsGlBreakdown,
  balanceSheetDetailRowsLookLikeGlAccounts,
} from "@/lib/balance-sheet-detail-rows"

const standardCodes: StandardLinkCode[] = [
  {
    code: "ACT-C",
    family: "ACT",
    is_leaf: false,
    label: "Actifs courants C",
    label_account: "Actifs courants C",
    label_sub_account: "",
    parent_code: null,
    sort_order: 1,
    is_active: true,
  },
  {
    code: "ACT-C.1",
    family: "ACT",
    is_leaf: true,
    label: "Encaisse",
    label_account: "Encaisse",
    label_sub_account: "",
    parent_code: "ACT-C",
    sort_order: 2,
    is_active: true,
  },
]

describe("balanceSheetDetailRowsLookLikeGlAccounts", () => {
  it("accepte des numéros de compte GL", () => {
    expect(
      balanceSheetDetailRowsLookLikeGlAccounts(
        [
          { id: "1000" },
          { id: "1010" },
        ],
        standardCodes,
      ),
    ).toBe(true)
  })

  it("refuse des enfants de structure (codes de liaison)", () => {
    expect(
      balanceSheetDetailRowsLookLikeGlAccounts(
        [{ id: "ACT-C.1" }, { id: "ACT-C.2" }],
        standardCodes,
      ),
    ).toBe(false)
  })
})

describe("balanceSheetDetailRowAllowsGlBreakdown", () => {
  it("autorise le parent ACT-C (liaison somme) pour expansion GL", () => {
    const structRow = {
      label: "ACT-C",
      linkCode: "ACT-C",
      liaisonMode: "sum",
      liaisonSumCodes: ["ACT-C.1", "ACT-C.2"],
      detailOnly: true,
      defineMapping: true,
    }
    expect(
      balanceSheetDetailRowAllowsGlBreakdown(structRow, standardCodes, { indent: true }),
    ).toBe(true)
  })

  it("autorise la feuille ACT-C.1", () => {
    const structRow = {
      label: "Encaisse",
      linkCode: "ACT-C.1",
      liaisonMode: "single",
      detailOnly: true,
      defineMapping: true,
    }
    expect(
      balanceSheetDetailRowAllowsGlBreakdown(structRow, standardCodes, { indent: true }),
    ).toBe(true)
  })

  it("refuse les titres d’annexe", () => {
    expect(
      balanceSheetDetailRowAllowsGlBreakdown(
        { linkCode: "ACT-C", defineMapping: true },
        standardCodes,
        { isAnnexTitle: true },
      ),
    ).toBe(false)
  })
})

describe("balanceSheetDetailCanExpandGlAccounts", () => {
  const leafStruct = {
    label: "Encaisse",
    linkCode: "ACT-C.1",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
  }

  it("expand avec un seul compte GL", () => {
    expect(
      balanceSheetDetailCanExpandGlAccounts(leafStruct, standardCodes, {
        balanceAccounts: [{ accountNumber: "1000", accountName: "Cash", amount: 100 }],
      }),
    ).toBe(true)
  })

  it("expand avec deux comptes GL ou plus", () => {
    expect(
      balanceSheetDetailCanExpandGlAccounts(leafStruct, standardCodes, {
        balanceAccounts: [
          { accountNumber: "1000", accountName: "Cash", amount: 100 },
          { accountNumber: "1010", accountName: "Bank", amount: 50 },
        ],
      }),
    ).toBe(true)
  })

  it("expand le parent ACT-C lorsque les comptes sont de vrais GL", () => {
    expect(
      balanceSheetDetailCanExpandGlAccounts(
        {
          linkCode: "ACT-C",
          liaisonMode: "sum",
          liaisonSumCodes: ["ACT-C.1"],
        },
        standardCodes,
        {
          balanceAccounts: [
            { accountNumber: "1000", accountName: "A", amount: 1 },
            { accountNumber: "1010", accountName: "B", amount: 2 },
          ],
        },
      ),
    ).toBe(true)
  })

  it("n’expand pas si detailRows sont des enfants de structure", () => {
    expect(
      balanceSheetDetailCanExpandGlAccounts(
        {
          linkCode: "ACT-C",
          liaisonMode: "sum",
          liaisonSumCodes: ["ACT-C.1"],
        },
        standardCodes,
        {
          balanceAccounts: [
            { accountNumber: "ACT-C.1", accountName: "Encaisse", amount: 1 },
          ],
        },
      ),
    ).toBe(false)
  })
})
