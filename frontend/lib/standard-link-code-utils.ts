import type { StandardLinkCode, StandardLinkCodeFamilyGroup } from "@/lib/api"

/** Nature comptable normale du solde (débit ou crédit). */
export type LinkCodeDtCt = "DT" | "CT"

/** DT/CT par famille — règle uniforme pour toute la charte (parents et feuilles). */
const FAMILY_DT_CT: Readonly<Record<string, LinkCodeDtCt>> = {
  ACT: "DT",
  ALT: "DT",
  PCT: "CT",
  PLT: "CT",
  CAP: "CT",
  REV: "CT",
  CMV: "DT",
  EXP: "DT",
  ADM: "DT",
  VNT: "DT",
  FIN: "DT",
  AUT: "DT",
  IMP: "DT",
}

/** Règle par défaut selon la famille. */
export function defaultDtCtForFamily(family: string): LinkCodeDtCt | undefined {
  return FAMILY_DT_CT[family.trim()]
}

/** Extrait la famille d'un code (ACT-B.1 → ACT, REV-A → REV). */
export function deriveLinkCodeFamily(code: string): string {
  const normalized = code.trim()
  if (!normalized) return ""
  return normalized.split("-")[0].split(".")[0].toUpperCase()
}

/** Résout DT/CT pour un code de liaison à partir de sa famille. */
export function resolveLinkCodeDtCt(
  row: Pick<StandardLinkCode, "code" | "family">,
): LinkCodeDtCt | undefined {
  const family = (row.family || deriveLinkCodeFamily(row.code)).trim()
  return defaultDtCtForFamily(family)
}

/** Multiplicateur d'affichage Sommaire/Détail : CT → −1, DT ou indéterminé → 1. */
export function linkCodeDtCtSignMultiplier(linkCode: string | undefined): number {
  const lc = linkCode?.trim()
  if (!lc) return 1
  return resolveLinkCodeDtCt({ code: lc, family: deriveLinkCodeFamily(lc) }) === "CT" ? -1 : 1
}

/** Affichage table (DT, CT ou tiret pour Trésorerie). */
export function linkCodeDtCtDisplay(row: Pick<StandardLinkCode, "code" | "family">): string {
  return resolveLinkCodeDtCt(row) ?? "—"
}

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

/** Ancres de famille au sommaire (REV, CMV, EXP, …) — pas les parents intermédiaires (REV-A, …). */
export const INCOME_STATEMENT_FAMILY_ANCHORS = [
  "REV",
  "CMV",
  "EXP",
  "ADM",
  "VNT",
  "FIN",
  "AUT",
  "IMP",
] as const

const INCOME_STATEMENT_FAMILY_ANCHOR_SET = new Set<string>(INCOME_STATEMENT_FAMILY_ANCHORS)

export function isIncomeStatementFamilyAnchorCode(code: string | undefined): boolean {
  const lc = code?.trim()
  if (!lc) return false
  return INCOME_STATEMENT_FAMILY_ANCHOR_SET.has(lc)
}

/**
 * Niveau de regroupement pour la ventilation CV/CF (diagnostic Dépenses).
 * - Feuille rattachée à un poste (ex. CMV-A.1) → regroupe sous le poste (CMV-A).
 * - Feuille rattachée directement à une famille (ex. CMV.1 / parent CMV) → regroupe sous le code assigné.
 */
export function resolveExpenseCostGroupingFromLinkCode(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): { id: string; label: string } | null {
  const lc = linkCode?.trim()
  if (!lc) return null
  const row = codeByCode.get(lc)
  if (!row) return { id: lc, label: lc }

  const parentCode = row.parent_code?.trim()
  if (!parentCode) {
    return { id: row.code, label: standardLinkCodeDisplayLabel(row) }
  }

  if (isIncomeStatementFamilyAnchorCode(parentCode)) {
    return { id: row.code, label: standardLinkCodeDisplayLabel(row) }
  }

  const parent = codeByCode.get(parentCode)
  if (parent) {
    return { id: parent.code, label: standardLinkCodeDisplayLabel(parent) }
  }

  return { id: parentCode, label: parentCode }
}

const INCOME_STATEMENT_FAMILY_ANCHOR_LABELS: Record<string, string> = {
  REV: "Chiffre d'affaires",
  CMV: "Coûts des produits vendus",
  EXP: "Frais d'exploitation",
  ADM: "Frais d'administration",
  VNT: "Frais de vente",
  FIN: "Frais financiers",
  AUT: "Autres dépenses (produits)",
  IMP: "Impôts",
}

/** Codes de liaison sélectionnables au sommaire : ancres de famille uniquement. */
export function filterIncomeStatementParentLinkCodes(
  codes: StandardLinkCode[],
): StandardLinkCode[] {
  const labelMap = buildStandardLinkCodeLabelMap(codes)
  return INCOME_STATEMENT_FAMILY_ANCHORS.map((fam) => {
    const fromChart = codes.find((c) => c.code === fam && !c.is_leaf)
    if (fromChart) return fromChart
    return {
      code: fam,
      family: fam,
      parent_code: null,
      label_account: INCOME_STATEMENT_FAMILY_ANCHOR_LABELS[fam] ?? fam,
      label_sub_account: null,
      label: INCOME_STATEMENT_FAMILY_ANCHOR_LABELS[fam] ?? fam,
      is_leaf: false,
      sort_order: 0,
      is_active: true,
      attached_link_codes: [],
    } satisfies StandardLinkCode
  }).map((c) => ({
    ...c,
    label_account: c.label_account || labelMap.get(c.code) || INCOME_STATEMENT_FAMILY_ANCHOR_LABELS[c.code] || c.code,
  }))
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

/** Parents Bilan + ancrages Résultats pour l’analyse fonds de roulement. */
export function workingCapitalLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const bs = balanceSheetParentLinkCodeOptions(codes)
  const is = incomeStatementParentLinkCodeOptions(codes)
  const labels = new Map<string, string>([...bs.labels, ...is.labels])
  const merged = [...new Set([...bs.codes, ...is.codes])]
  return { codes: merged, labels }
}

/**
 * Bilan + Compte de résultat (parents et feuilles, ex. CMV.1) pour l’analyse Capex.
 * Les ancres REV / CMV / … restent proposées même sans nœud charte.
 */
export function filterCapexLinkCodes(codes: StandardLinkCode[]): StandardLinkCode[] {
  const fromChart = codes.filter(
    (c) =>
      c.is_active !== false &&
      (isBalanceSheetFamily(c.family) || isIncomeStatementFamily(c.family)),
  )
  const byCode = new Set(fromChart.map((c) => c.code))
  for (const anchor of filterIncomeStatementParentLinkCodes(codes)) {
    if (!byCode.has(anchor.code)) fromChart.push(anchor)
  }
  return fromChart
}

export function capexLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const filtered = sortStandardLinkCodesHierarchically(filterCapexLinkCodes(codes))
  return {
    codes: filtered.map((c) => c.code),
    labels: buildStandardLinkCodeLabelMap(filtered),
  }
}

/**
 * Tous les codes actifs (Bilan, Compte de résultat et Trésorerie, parents et feuilles).
 * Inclut CMV.1, ALT-B, TEX-A, et les ancres de famille (REV, CMV, TEX, …).
 */
export function allAnalysisLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const capex = capexLinkCodeOptions(codes)
  const cf = cashFlowLinkCodeOptions(codes)
  const labels = new Map<string, string>([...capex.labels, ...cf.labels])
  const merged = [...new Set([...capex.codes, ...cf.codes])]
  return { codes: merged, labels }
}

export function standardLinkCodeDisplayLabel(code: StandardLinkCode): string {
  return (code.label_sub_account || code.label_account || code.label || code.code).trim()
}

export type StandardLinkCodeLookup = Map<string, StandardLinkCode>

const MAPPING_DERIVED_EMPTY = "—"

/** Bilan ou Résultats selon la famille du code de liaison (charte standard). */
export function mappingGroupeFromLinkCode(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): string {
  const lc = linkCode?.trim()
  if (!lc) return MAPPING_DERIVED_EMPTY
  const row = codeByCode.get(lc)
  if (!row) return MAPPING_DERIVED_EMPTY
  if (isBalanceSheetFamily(row.family)) return "Bilan"
  if (isIncomeStatementFamily(row.family)) return "Résultats"
  return MAPPING_DERIVED_EMPTY
}

/** Libellé du code de liaison (ex. ACT-A.1 → « Encaisse »). */
export function mappingDetailFromLinkCode(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): string {
  const lc = linkCode?.trim()
  if (!lc) return MAPPING_DERIVED_EMPTY
  const row = codeByCode.get(lc)
  if (!row) return MAPPING_DERIVED_EMPTY
  return standardLinkCodeDisplayLabel(row)
}

/** Libellé du code parent (ex. ACT-A.1 → nom de ACT-A). */
export function mappingPosteFromLinkCode(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): string {
  const lc = linkCode?.trim()
  if (!lc) return MAPPING_DERIVED_EMPTY
  const row = codeByCode.get(lc)
  if (!row) return MAPPING_DERIVED_EMPTY
  const parentCode = row.parent_code?.trim()
  if (!parentCode) return MAPPING_DERIVED_EMPTY
  const parent = codeByCode.get(parentCode)
  if (!parent) return MAPPING_DERIVED_EMPTY
  return standardLinkCodeDisplayLabel(parent)
}

/** Code parent du code de liaison (ex. ACT-A.1 → ACT-A), aligné sur la page Code de liaison. */
export function mappingParentCodeFromLinkCode(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): string {
  const lc = linkCode?.trim()
  if (!lc) return MAPPING_DERIVED_EMPTY
  const row = codeByCode.get(lc)
  if (!row) return MAPPING_DERIVED_EMPTY
  const parentCode = row.parent_code?.trim()
  return parentCode || MAPPING_DERIVED_EMPTY
}

/** Code assigné mais absent de la charte ou sans famille bilan / résultats. */
export function isMappingLinkCodeIncomplete(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): boolean {
  const lc = linkCode?.trim()
  if (!lc) return false
  if (!codeByCode.has(lc)) return true
  return mappingGroupeFromLinkCode(lc, codeByCode) === MAPPING_DERIVED_EMPTY
}

/**
 * Codes non assignables au mapping GL et non éligibles au CV/CF
 * (ajustements / provisions, amortissements, etc.).
 */
export const MAPPING_RESTRICTED_LINK_CODES = new Set([
  "CMV.11",
  "EXP.20",
  "EXP.21",
  "ADM.20",
  "ADM.21",
])

/** Familles dont aucun code n'est assignable au mapping comptable. */
export const MAPPING_RESTRICTED_FAMILIES = new Set(["AUT"])

export function isMappingRestrictedLinkCode(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): boolean {
  const lc = linkCode?.trim()
  if (!lc) return false
  if (MAPPING_RESTRICTED_LINK_CODES.has(lc)) return true
  const row = codeByCode.get(lc)
  if (row && MAPPING_RESTRICTED_FAMILIES.has(row.family)) return true
  return false
}

/** Feuilles assignables au mapping GL (hors codes / familles restreints). */
export function filterAssignableMappingLinkCodes(codes: StandardLinkCode[]): StandardLinkCode[] {
  const lookup = new Map(codes.map((c) => [c.code, c]))
  return filterMappableLeafLinkCodes(codes).filter((c) => !isMappingRestrictedLinkCode(c.code, lookup))
}

/** Familles entièrement exclues des options coûts variables / fixes (mapping comptable). */
export const MAPPING_COST_TYPE_EXCLUDED_FAMILIES = new Set(["REV", "IMP"])

/**
 * Codes FIN éligibles au CV/CF (frais bancaires variables ou fixes selon le GL).
 * Les autres codes FIN (intérêts, etc.) restent exclus.
 */
export const MAPPING_COST_TYPE_INCLUDED_FIN_LINK_CODES = new Set(["FIN.1"])

/** CV/CF : compte de résultat hors REV et IMP ; parmi FIN, seul FIN.1. */
export function showsMappingCostTypeOptions(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): boolean {
  const lc = linkCode?.trim()
  if (!lc) return false
  const row = codeByCode.get(lc)
  if (!row) return false
  if (!isIncomeStatementFamily(row.family)) return false
  if (MAPPING_COST_TYPE_EXCLUDED_FAMILIES.has(row.family)) return false
  if (isMappingRestrictedLinkCode(lc, codeByCode)) return false
  if (row.family === "FIN" && !MAPPING_COST_TYPE_INCLUDED_FIN_LINK_CODES.has(lc)) return false
  return true
}

/** Sélecteur « compte de revenu associé » : charges variables uniquement (pas REV ni IMP). */
export function showsMappingVariableRevenueLinkOption(
  linkCode: string | undefined,
  codeByCode: StandardLinkCodeLookup,
): boolean {
  if (!showsMappingCostTypeOptions(linkCode, codeByCode)) return false
  const row = codeByCode.get(linkCode!.trim())
  if (!row) return false
  return row.family !== "REV" && row.family !== "IMP"
}

export type MappingCostTypeLabel = "variable" | "fixed" | "unset" | "na"

export function mappingCostTypeLabel(
  account: {
    linkCode?: string
    variableCosts?: boolean
    fixedCosts?: boolean
  },
  codeByCode: StandardLinkCodeLookup,
): MappingCostTypeLabel {
  if (!showsMappingCostTypeOptions(account.linkCode, codeByCode)) return "na"
  const variable = !!account.variableCosts
  const fixed = !!account.fixedCosts
  if (variable && !fixed) return "variable"
  if (fixed && !variable) return "fixed"
  return "unset"
}

export function mappingCostTypeDisplayLabel(
  account: {
    linkCode?: string
    variableCosts?: boolean
    fixedCosts?: boolean
  },
  codeByCode: StandardLinkCodeLookup,
): string {
  switch (mappingCostTypeLabel(account, codeByCode)) {
    case "variable":
      return "Variable"
    case "fixed":
      return "Fixe"
    case "unset":
      return "—"
    default:
      return "N/A"
  }
}

export function isMappingCostTypeUnset(
  account: {
    linkCode?: string
    variableCosts?: boolean
    fixedCosts?: boolean
  },
  codeByCode: StandardLinkCodeLookup,
): boolean {
  return mappingCostTypeLabel(account, codeByCode) === "unset"
}

/** Feuilles REV pour l'affectation des coûts variables (REV-A.1, etc.). */
export function filterRevenueLeafLinkCodes(codes: StandardLinkCode[]): StandardLinkCode[] {
  return sortStandardLinkCodesHierarchically(
    codes.filter((c) => c.is_leaf && c.family === "REV"),
  )
}

export function sanitizeMappingCostTypeFields<
  T extends {
    linkCode?: string
    variableCosts?: boolean
    fixedCosts?: boolean
    variableCostRevenueLinkCode?: string
  },
>(draft: T, codeByCode: StandardLinkCodeLookup): T {
  if (!showsMappingCostTypeOptions(draft.linkCode, codeByCode)) {
    return {
      ...draft,
      variableCosts: false,
      fixedCosts: false,
      variableCostRevenueLinkCode: undefined,
    }
  }
  if (!draft.variableCosts || !showsMappingVariableRevenueLinkOption(draft.linkCode, codeByCode)) {
    return { ...draft, variableCostRevenueLinkCode: undefined }
  }
  return draft
}

/** Racine des codes de liaison éligibles à la section Trésorerie (ex. CAP-C, CAP-C.1). */
export const CAP_C_CASH_FLOW_ROOT = "CAP-C"

/** Bénéfice net au bilan : calculé, non mappable au GL. */
export const NET_INCOME_BALANCE_LINK_CODE = "CAP-C.1"

/** Familles P&L (AUT reste affichée au CDR mais n’entre pas dans CAP-C.1). */
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

/** Numérateur CAP-C.1 : revenus (CT → ×−1). */
export const NET_INCOME_REVENUE_FAMILIES = ["REV"] as const

/** Dénominateur CAP-C.1 : charges (sans AUT). */
export const NET_INCOME_EXPENSE_FAMILIES = [
  "CMV",
  "EXP",
  "ADM",
  "VNT",
  "FIN",
  "IMP",
] as const

export function isComputedNetIncomeLinkCode(code: string): boolean {
  return code.trim() === NET_INCOME_BALANCE_LINK_CODE
}

/** Racines PLT éligibles à la saisie durée restante / taux d'intérêt (mapping comptable). */
export const MAPPING_LIABILITY_TERM_LINK_CODE_ROOTS = ["PLT-B", "PLT-G", "PLT-C", "PLT-D"] as const

export function isMappingLiabilityTermLinkCode(code: string): boolean {
  const normalized = code.trim()
  if (!normalized) return false
  return MAPPING_LIABILITY_TERM_LINK_CODE_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}.`),
  )
}

export function showsMappingLiabilityTermOptions(linkCode: string | undefined): boolean {
  const lc = linkCode?.trim()
  if (!lc) return false
  return isMappingLiabilityTermLinkCode(lc)
}

export function sanitizeMappingLiabilityTermFields<
  T extends {
    linkCode?: string
    liabilityRemainingYears?: number
    liabilityInterestRate?: number
  },
>(draft: T): T {
  if (!showsMappingLiabilityTermOptions(draft.linkCode)) {
    return {
      ...draft,
      liabilityRemainingYears: undefined,
      liabilityInterestRate: undefined,
    }
  }
  return draft
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

/** Immobilisations capex (ALT-B / ALT-C / ALT-D) : choix Coût vs Amortissement cumulé. */
export function showsMappingAltAssetTypeOptions(linkCode: string | undefined): boolean {
  const lc = linkCode?.trim()
  if (!lc) return false
  return isCapexProjectionLinkCode(lc)
}

export type MappingAltAssetTypeLabel = "cost" | "accumulated" | "unset" | "na"

export function mappingAltAssetTypeLabel(account: {
  linkCode?: string
  altAssetCost?: boolean
  altAccumulatedAmortization?: boolean
}): MappingAltAssetTypeLabel {
  if (!showsMappingAltAssetTypeOptions(account.linkCode)) return "na"
  const cost = !!account.altAssetCost
  const accumulated = !!account.altAccumulatedAmortization
  if (cost && !accumulated) return "cost"
  if (accumulated && !cost) return "accumulated"
  return "unset"
}

export function mappingAltAssetTypeDisplayLabel(account: {
  linkCode?: string
  altAssetCost?: boolean
  altAccumulatedAmortization?: boolean
}): string {
  switch (mappingAltAssetTypeLabel(account)) {
    case "cost":
      return "Coût"
    case "accumulated":
      return "Amort. cumulé"
    case "unset":
      return "—"
    default:
      return "N/A"
  }
}

export function isMappingAltAssetTypeUnset(account: {
  linkCode?: string
  altAssetCost?: boolean
  altAccumulatedAmortization?: boolean
}): boolean {
  return mappingAltAssetTypeLabel(account) === "unset"
}

export function sanitizeMappingAltAssetFields<
  T extends {
    linkCode?: string
    altAssetCost?: boolean
    altAccumulatedAmortization?: boolean
  },
>(draft: T): T {
  if (!showsMappingAltAssetTypeOptions(draft.linkCode)) {
    return {
      ...draft,
      altAssetCost: false,
      altAccumulatedAmortization: false,
    }
  }
  return draft
}

/** Libellé colonne Type : immobilisations capex ou CV/CF. */
export function mappingAccountTypeDisplayLabel(
  account: {
    linkCode?: string
    variableCosts?: boolean
    fixedCosts?: boolean
    altAssetCost?: boolean
    altAccumulatedAmortization?: boolean
  },
  codeByCode: StandardLinkCodeLookup,
): string {
  const altLabel = mappingAltAssetTypeDisplayLabel(account)
  if (altLabel !== "N/A") return altLabel
  return mappingCostTypeDisplayLabel(account, codeByCode)
}

export function isMappableStandardLinkCode(code: StandardLinkCode): boolean {
  if (code.is_active === false) return false
  if (isCashFlowFamily(code.family)) return false
  if (!code.is_leaf) return false
  return !isComputedNetIncomeLinkCode(code.code)
}

export function filterMappableLeafLinkCodes(codes: StandardLinkCode[]): StandardLinkCode[] {
  return codes.filter(isMappableStandardLinkCode)
}

export function incomeStatementLeafCodesForNetIncome(codes: StandardLinkCode[]): string[] {
  const families = new Set<string>([
    ...NET_INCOME_REVENUE_FAMILIES,
    ...NET_INCOME_EXPENSE_FAMILIES,
  ])
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

/** Codes Trésorerie — Investissement (famille TIN ou clé agrégée « TIN »). */
export function isTinFamilyLinkCode(
  linkCode: string | undefined,
  codeByCode?: StandardLinkCodeLookup,
): boolean {
  const lc = linkCode?.trim()
  if (!lc) return false
  const row = codeByCode?.get(lc)
  if (row) return row.family === "TIN"
  if (lc === "TIN") return true
  return /^TIN[.-]/i.test(lc)
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
  const labels = buildStandardLinkCodeLabelMap(filtered)
  // Ancres familiales : le sommaire agrège les codes de la structure Détail.
  for (const family of CASH_FLOW_FAMILIES) {
    if (!labels.has(family)) {
      labels.set(family, CASH_FLOW_FAMILY_LABELS[family])
    }
  }
  const merged = [...CASH_FLOW_FAMILIES, ...filtered.map((c) => c.code)]
  return {
    codes: [...new Set(merged)],
    labels,
  }
}

/** Codes supplémentaires pour la liaison Trésorerie Détail (bilan ACT-A / PCT-A). */
export const CASH_FLOW_DETAIL_EXTRA_LINK_CODES = ["ACT-A", "PCT-A"] as const

/** TEX / TIN / TFI + ACT-A / PCT-A pour Paramètres Trésorerie Détail. */
export function cashFlowDetailLinkCodeOptions(codes: StandardLinkCode[]): {
  codes: string[]
  labels: Map<string, string>
} {
  const cf = cashFlowLinkCodeOptions(codes)
  const bs = balanceSheetParentLinkCodeOptions(codes)
  const labels = new Map<string, string>([...cf.labels, ...bs.labels])
  for (const code of CASH_FLOW_DETAIL_EXTRA_LINK_CODES) {
    if (!labels.has(code)) labels.set(code, code)
  }
  const merged = [...new Set([...cf.codes, ...CASH_FLOW_DETAIL_EXTRA_LINK_CODES])].sort((a, b) =>
    a.localeCompare(b, "fr", { numeric: true }),
  )
  return { codes: merged, labels }
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

  if (codes.some((c) => c.code === parent)) {
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

  // Family anchor (e.g. summary "REV" when chart roots are REV-A, REV-B, … but no "REV" node).
  if (isIncomeStatementFamily(parent) || isBalanceSheetFamily(parent)) {
    const familyLeaves = codes.filter(
      (c) => c.family === parent && isMappableStandardLinkCode(c),
    )
    return sortStandardLinkCodesHierarchically(familyLeaves)
  }

  return []
}

/** REV family roots used as Détail sub-lines (REV-A, REV-B, …) when the summary anchor is « REV ». */
export function getRevenueFamilyGroupingParents(codes: StandardLinkCode[]): StandardLinkCode[] {
  return sortStandardLinkCodesHierarchically(
    codes.filter(
      (c) =>
        c.family === "REV" &&
        c.is_active !== false &&
        !c.is_leaf &&
        (c.parent_code == null || c.parent_code === ""),
    ),
  )
}

/**
 * Codes to materialize as Détail sub-lines under a summary annex parent.
 * REV @ family level → grouping parents (REV-A, …); otherwise → leaf descendants.
 */
export function getDetailSubLineCodesFromStandardLinkCode(
  parentCode: string,
  codes: StandardLinkCode[],
): StandardLinkCode[] {
  const parent = parentCode.trim()
  if (!parent) return []

  if (parent === "REV" && !codes.some((c) => c.code === "REV")) {
    return getRevenueFamilyGroupingParents(codes)
  }

  return getLeafDescendantsOfStandardLinkCode(parentCode, codes)
}

/** Liaison fields for a synced Détail sub-line (parent codes roll up descendant leaves). */
export function detailSubLineLiaisonFromStandardTarget(
  target: StandardLinkCode,
  codes: StandardLinkCode[],
): { linkCode: string; liaisonMode: "single" | "sum"; liaisonSumCodes?: string[] } {
  if (!target.is_leaf) {
    const leafCodes = getLeafDescendantsOfStandardLinkCode(target.code, codes).map((c) => c.code)
    if (leafCodes.length > 0) {
      return { linkCode: target.code, liaisonMode: "sum", liaisonSumCodes: leafCodes }
    }
  }
  return { linkCode: target.code, liaisonMode: "single" }
}
