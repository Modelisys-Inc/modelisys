import type { StandardLinkCode } from "@/lib/api"
import { isBalanceSheetFamily } from "@/lib/standard-link-code-utils"

/** Libellés de section par famille (alignés sur `statement_template._FAMILY_SECTION_LABEL`). */
export const BALANCE_SHEET_FAMILY_SECTION_LABELS: Record<string, string> = {
  ACT: "Actif à court terme",
  ALT: "Actif à long terme",
  PCT: "Passif à court terme",
  PLT: "Passif à long terme",
  CAP: "Capitaux propres",
}

function normLabel(s: string): string {
  return s.trim().toLowerCase()
}

/** Famille associée à un libellé de section sommaire bilan. */
export function balanceSheetFamilyForSectionLabel(label: string): string | null {
  const lab = normLabel(label)
  if (!lab) return null
  for (const [fam, sectionLabel] of Object.entries(BALANCE_SHEET_FAMILY_SECTION_LABELS)) {
    if (normLabel(sectionLabel) === lab) return fam
  }
  if (lab === "actif") return "ACT"
  if (lab === "passif") return "PCT"
  if (lab === "capitaux propres") return "CAP"
  return null
}

/** Code parent standard dont le libellé correspond (sections intermédiaires). */
export function standardParentCodeForBalanceSheetSectionLabel(
  label: string,
  standardCodes: StandardLinkCode[],
): string | null {
  const lab = normLabel(label)
  if (!lab) return null
  for (const c of standardCodes) {
    if (c.is_leaf) continue
    if (!isBalanceSheetFamily(c.family)) continue
    const display = (c.label_account || c.label_sub_account || c.label || c.code).trim()
    if (normLabel(display) === lab) return c.code
  }
  return null
}
