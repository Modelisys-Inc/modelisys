import type { StandardLinkCode, StandardLinkCodeFamilyGroup } from "@/lib/api"

/** Depth-first order: parent, then its children (by sort_order). */
export function sortStandardLinkCodesHierarchically(
  codes: StandardLinkCode[],
): StandardLinkCode[] {
  if (codes.length === 0) return []

  const byCode = new Map(codes.map((c) => [c.code, c]))
  const childrenByParent = new Map<string | null, StandardLinkCode[]>()

  for (const code of codes) {
    const parent =
      code.parent_code && byCode.has(code.parent_code) ? code.parent_code : null
    const siblings = childrenByParent.get(parent) ?? []
    siblings.push(code)
    childrenByParent.set(parent, siblings)
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
  }

  const result: StandardLinkCode[] = []
  const visited = new Set<string>()

  const walk = (parent: string | null) => {
    for (const child of childrenByParent.get(parent) ?? []) {
      if (visited.has(child.code)) continue
      visited.add(child.code)
      result.push(child)
      walk(child.code)
    }
  }

  walk(null)

  for (const code of [...codes].sort(
    (a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code),
  )) {
    if (!visited.has(code.code)) {
      visited.add(code.code)
      result.push(code)
      walk(code.code)
    }
  }

  return result
}

/** Families used in the income statement (Compte de résultat). */
export const INCOME_STATEMENT_FAMILIES = new Set([
  "REV",
  "CMV",
  "EXP",
  "ADM",
  "VNT",
  "FIN",
  "AUT",
  "IMP",
])

/** Families used in the balance sheet (Bilan). */
export const BALANCE_SHEET_FAMILIES = new Set(["ACT", "ALT", "PCT", "PLT", "CAP"])

export function isIncomeStatementFamily(family: string): boolean {
  return INCOME_STATEMENT_FAMILIES.has(family)
}

export function isBalanceSheetFamily(family: string): boolean {
  return BALANCE_SHEET_FAMILIES.has(family)
}

/** Parent codes (`is_leaf = false`) from income-statement families only. */
export function filterIncomeStatementParentLinkCodes(
  codes: StandardLinkCode[],
): StandardLinkCode[] {
  return codes.filter((c) => !c.is_leaf && isIncomeStatementFamily(c.family))
}

/** Parent codes (`is_leaf = false`) from balance-sheet families only. */
export function filterBalanceSheetParentLinkCodes(
  codes: StandardLinkCode[],
): StandardLinkCode[] {
  return codes.filter((c) => !c.is_leaf && isBalanceSheetFamily(c.family))
}

export function buildStandardLinkCodeLabelMap(
  codes: StandardLinkCode[],
): Map<string, string> {
  return new Map(
    codes.map((c) => [
      c.code,
      (c.label_sub_account || c.label_account || c.label || c.code).trim(),
    ]),
  )
}

export function incomeStatementParentLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const filtered = filterIncomeStatementParentLinkCodes(codes)
  const sorted = sortStandardLinkCodesHierarchically(filtered)
  return {
    codes: sorted.map((c) => c.code),
    labels: buildStandardLinkCodeLabelMap(sorted),
  }
}

export function balanceSheetParentLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const filtered = filterBalanceSheetParentLinkCodes(codes)
  const sorted = sortStandardLinkCodesHierarchically(filtered)
  return {
    codes: sorted.map((c) => c.code),
    labels: buildStandardLinkCodeLabelMap(sorted),
  }
}

export function standardLinkCodeDisplayLabel(code: StandardLinkCode): string {
  return (code.label_sub_account || code.label_account || code.label || code.code).trim()
}

/** Racine des codes de liaison éligibles à la section Trésorerie (ex. CAP-C, CAP-C.1). */
export const CAP_C_CASH_FLOW_ROOT = "CAP-C"

/** Bénéfice net au bilan : calculé, non mappable au GL. */
export const NET_INCOME_BALANCE_LINK_CODE = "CAP-C.1"

/** Familles du compte de résultat qui alimentent CAP-C.1. */
export const NET_INCOME_SUM_FAMILIES = [
  "REV",
  "CMV",
  "EXP",
  "ADM",
  "VNT",
  "FIN",
  "AUT",
  "IMP",
] as const

export function isComputedNetIncomeLinkCode(code: string): boolean {
  return code.trim() === NET_INCOME_BALANCE_LINK_CODE
}

/** Racines Bilan affichées dans « Estimation des Capex annuels » (projections). */
export const CAPEX_PROJECTION_LINK_CODE_ROOTS = ["ALT-B", "ALT-C", "ALT-D"] as const

export function isCapexProjectionLinkCode(code: string): boolean {
  const normalized = code.trim()
  if (!normalized) return false
  return CAPEX_PROJECTION_LINK_CODE_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}.`),
  )
}

export function capexProjectionParentRoot(code: string): (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number] | null {
  const normalized = code.trim()
  if (!normalized) return null
  return (
    CAPEX_PROJECTION_LINK_CODE_ROOTS.find(
      (root) => normalized === root || normalized.startsWith(`${root}.`),
    ) ?? null
  )
}

export function compareCapexProjectionLinkCodes(a: string, b: string): number {
  const rootOf = (code: string) =>
    CAPEX_PROJECTION_LINK_CODE_ROOTS.find((root) => code === root || code.startsWith(`${root}.`)) ?? ""
  const ia = CAPEX_PROJECTION_LINK_CODE_ROOTS.indexOf(
    rootOf(a) as (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number],
  )
  const ib = CAPEX_PROJECTION_LINK_CODE_ROOTS.indexOf(
    rootOf(b) as (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number],
  )
  if (ia !== ib) return ia - ib
  return a.localeCompare(b, "fr", { numeric: true })
}

export function isMappableStandardLinkCode(code: StandardLinkCode): boolean {
  if (isCashFlowFamily(code.family)) return false
  if (!code.is_leaf) return false
  return !isComputedNetIncomeLinkCode(code.code)
}

export function filterMappableLeafLinkCodes(codes: StandardLinkCode[]): StandardLinkCode[] {
  return codes.filter(isMappableStandardLinkCode)
}

export function incomeStatementLeafCodesForNetIncome(codes: StandardLinkCode[]): string[] {
  const families = new Set<string>(NET_INCOME_SUM_FAMILIES)
  return codes
    .filter((c) => c.is_leaf && families.has(c.family))
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
    .map((c) => c.code)
}

/** Indique si le code peut recevoir une section Trésorerie (ft_category). Déprécié. */
export function canSelectCashFlowSection(
  _code: string,
  _family: string,
  _isLeaf: boolean,
  _parentCode: string | null | undefined,
  _allCodes: StandardLinkCode[],
): boolean {
  return false
}

/** Indique si un code appartient au sous-arbre CAP-C (CAP-C, CAP-C.1, CAP-C.2, …). */
export function isCapCCashFlowEligible(
  code: string,
  parentCode: string | null | undefined,
  familyCodes: StandardLinkCode[],
): boolean {
  const normalized = code.trim()
  if (
    normalized === CAP_C_CASH_FLOW_ROOT ||
    normalized.startsWith(`${CAP_C_CASH_FLOW_ROOT}.`)
  ) {
    return true
  }

  const byCode = new Map(familyCodes.map((c) => [c.code, c]))
  let current = parentCode?.trim() || null
  while (current) {
    if (
      current === CAP_C_CASH_FLOW_ROOT ||
      current.startsWith(`${CAP_C_CASH_FLOW_ROOT}.`)
    ) {
      return true
    }
    current = byCode.get(current)?.parent_code ?? null
  }
  return false
}

/** Valeurs stockées en base (`ft_category`) pour la section Trésorerie d’un code parent. */
export const CASH_FLOW_SECTION_VALUES = ["Exploitation", "Investissement", "Financement"] as const

export type CashFlowSectionValue = (typeof CASH_FLOW_SECTION_VALUES)[number]

export const CASH_FLOW_SECTION_NONE = "__none__"

export const CASH_FLOW_SECTION_OPTIONS: { value: CashFlowSectionValue; label: string }[] = [
  { value: "Exploitation", label: "Trésorerie — Exploitation" },
  { value: "Investissement", label: "Trésorerie — Investissement" },
  { value: "Financement", label: "Trésorerie — Financement" },
]

export function isCashFlowSectionValue(value: string): value is CashFlowSectionValue {
  return (CASH_FLOW_SECTION_VALUES as readonly string[]).includes(value)
}

export function cashFlowSectionDisplayLabel(ftCategory: string | null | undefined): string {
  if (!ftCategory) return "—"
  const match = CASH_FLOW_SECTION_OPTIONS.find((o) => o.value === ftCategory)
  return match?.label ?? ftCategory
}

/** Familles Trésorerie (codes créables dans la charte). */
export const CASH_FLOW_FAMILIES = ["TEX", "TIN", "TFI"] as const

export type CashFlowFamily = (typeof CASH_FLOW_FAMILIES)[number]

/** @deprecated use CASH_FLOW_FAMILIES */
export const CASH_FLOW_VIRTUAL_FAMILIES = CASH_FLOW_FAMILIES

export type CashFlowVirtualFamily = CashFlowFamily

export function isCashFlowFamily(family: string): family is CashFlowFamily {
  return (CASH_FLOW_FAMILIES as readonly string[]).includes(family)
}

/** @deprecated use isCashFlowFamily */
export function isCashFlowVirtualFamily(family: string): family is CashFlowVirtualFamily {
  return isCashFlowFamily(family)
}

export const CASH_FLOW_FAMILY_LABELS: Record<CashFlowFamily, string> = {
  TEX: "Trésorerie — Exploitation",
  TIN: "Trésorerie — Investissement",
  TFI: "Trésorerie — Financement",
}

/** @deprecated use CASH_FLOW_FAMILY_LABELS */
export const CASH_FLOW_VIRTUAL_FAMILY_LABELS = CASH_FLOW_FAMILY_LABELS

/** Codes Bilan / Compte de résultat sélectionnables pour un code Trésorerie. */
export function filterCashFlowAttachableLinkCodes(codes: StandardLinkCode[]): StandardLinkCode[] {
  return codes.filter(
    (c) => isBalanceSheetFamily(c.family) || isIncomeStatementFamily(c.family),
  )
}

export function cashFlowAttachableLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const filtered = sortStandardLinkCodesHierarchically(filterCashFlowAttachableLinkCodes(codes))
  return {
    codes: filtered.map((c) => c.code),
    labels: buildStandardLinkCodeLabelMap(filtered),
  }
}

/** Codes Trésorerie (TEX / TIN / TFI) pour le mode « Code unique » au sommaire Trésorerie. */
export function cashFlowLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const filtered = [...codes]
    .filter((c) => isCashFlowFamily(c.family))
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
  return {
    codes: filtered.map((c) => c.code),
    labels: buildStandardLinkCodeLabelMap(filtered),
  }
}

/** @deprecated use cashFlowLinkCodeOptions */
export function cashFlowCategoryLinkCodeOptions(): {
  codes: string[]
  labels: Map<string, string>
} {
  return {
    codes: [...CASH_FLOW_FAMILIES],
    labels: new Map(
      CASH_FLOW_FAMILIES.map((family) => [family, CASH_FLOW_FAMILY_LABELS[family]]),
    ),
  }
}

export function attachedLinkCodesDisplay(
  attached: string[] | null | undefined,
  labels: Map<string, string>,
): string {
  if (!attached?.length) return "—"
  return attached
    .map((code) => {
      const label = labels.get(code)
      return label ? `${code} — ${label}` : code
    })
    .join(", ")
}

/** Retourne les groupes tels quels (les familles TEX/TIN/TFI viennent de l'API). */
export function augmentLinkCodeGroupsWithCashFlowFamilies(
  groups: StandardLinkCodeFamilyGroup[],
  _flatCodes: StandardLinkCode[],
): StandardLinkCodeFamilyGroup[] {
  return groups
}

/** Leaf codes nested under a parent code from the standard chart (e.g. REV → REV.1, REV.2). */
export function getLeafDescendantsOfStandardLinkCode(
  parentCode: string,
  codes: StandardLinkCode[],
): StandardLinkCode[] {
  const parent = parentCode.trim()
  if (!parent) return []
  if (!codes.some((c) => c.code === parent)) return []

  const leaves: StandardLinkCode[] = []
  const walk = (code: string) => {
    for (const child of codes) {
      if (child.parent_code !== code) continue
      if (child.is_leaf) leaves.push(child)
      else walk(child.code)
    }
  }
  walk(parent)
  return sortStandardLinkCodesHierarchically(leaves)
}
