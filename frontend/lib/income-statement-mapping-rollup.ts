import type { AccountMappingData, StandardLinkCode } from "@/lib/api"
import { INCOME_STATEMENT_FAMILIES, isIncomeStatementFamily } from "@/lib/standard-link-code-utils"

/** Libellés de section par famille (alignés sur `statement_template._FAMILY_SECTION_LABEL`). */
export const INCOME_STATEMENT_FAMILY_SECTION_LABELS: Record<string, string> = {
  REV: "Chiffre d'affaires",
  CMV: "Coûts des produits vendus",
  EXP: "Frais d'exploitation",
  ADM: "Frais d'administration",
  VNT: "Frais de vente",
  FIN: "Frais financiers",
  AUT: "Autres dépenses (produits)",
  IMP: "Impôts",
}

function normLabel(s: string): string {
  return s.trim().toLowerCase()
}

function addAccount(index: Map<string, Set<string>>, key: string, account: string) {
  const k = key.trim()
  const a = account.trim()
  if (!k || !a) return
  let set = index.get(k)
  if (!set) {
    set = new Set()
    index.set(k, set)
  }
  set.add(a)
}

/**
 * Index des comptes GL par code de liaison, avec remontée parent + ancre famille
 * (même logique que `build_parent_rollup_index` côté backend).
 */
export function buildIncomeStatementMappedLinkCodeIndex(
  mappings: AccountMappingData[],
  standardCodes: StandardLinkCode[],
): Map<string, Set<string>> {
  const chart = new Map(standardCodes.map((c) => [c.code, c]))
  const index = new Map<string, Set<string>>()

  for (const mapping of mappings) {
    const lc = String(mapping.link_code ?? "").trim()
    const acct = String(mapping.account_number ?? "").trim()
    if (!lc || !acct) continue

    addAccount(index, lc, acct)

    const meta = chart.get(lc)
    let current = meta?.parent_code ?? null
    while (current) {
      addAccount(index, current, acct)
      current = chart.get(current)?.parent_code ?? null
    }

    const fam = String(meta?.family ?? "").trim()
    if (fam && isIncomeStatementFamily(fam)) {
      addAccount(index, fam, acct)
    }
  }

  return index
}

export function incomeStatementLinkCodeHasMappedAccounts(
  linkCode: string,
  index: Map<string, Set<string>>,
): boolean {
  const lc = linkCode.trim()
  if (!lc) return false
  return (index.get(lc)?.size ?? 0) > 0
}

/** Famille associée à un libellé de section sommaire (ex. « Coûts des produits vendus » → CMV). */
export function incomeStatementFamilyForSectionLabel(label: string): string | null {
  const lab = normLabel(label)
  if (!lab) return null
  for (const [fam, sectionLabel] of Object.entries(INCOME_STATEMENT_FAMILY_SECTION_LABELS)) {
    if (normLabel(sectionLabel) === lab) return fam
  }
  return null
}

/** Code parent standard dont le libellé correspond (sections intermédiaires REV-A, …). */
export function standardParentCodeForSectionLabel(
  label: string,
  standardCodes: StandardLinkCode[],
): string | null {
  const lab = normLabel(label)
  if (!lab) return null
  for (const c of standardCodes) {
    if (c.is_leaf) continue
    if (!isIncomeStatementFamily(c.family)) continue
    const display = (c.label_account || c.label_sub_account || c.label || c.code).trim()
    if (normLabel(display) === lab) return c.code
  }
  return null
}

export function incomeStatementFamilyHasMappedAccounts(
  family: string,
  index: Map<string, Set<string>>,
): boolean {
  const fam = family.trim().toUpperCase()
  if (!INCOME_STATEMENT_FAMILIES.has(fam)) return false
  return (index.get(fam)?.size ?? 0) > 0
}
