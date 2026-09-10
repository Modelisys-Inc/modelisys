import { formatCurrency } from "@/lib/financial-utils"
import {
  isCodeMappingEnabled,
  normalizeCodeList,
  normalizeLiaisonFactor,
  normalizeLiaisonMode,
  type LiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  normalizeWorkingCapitalDisplayFormat,
  workingCapitalRowRefCode,
  workingCapitalStructureViewRows,
  type WorkingCapitalDisplayFormat,
} from "@/lib/working-capital-structure-utils"

const FORMAT_LABEL: Record<WorkingCapitalDisplayFormat, string> = {
  currency: "$",
  number: "Nombre",
  percent: "%",
  days: "Jours",
}

const FORMULA_MODES: ReadonlySet<LiaisonMode> = new Set([
  "sum",
  "difference",
  "product",
  "quotient",
])

export function formatCapitalisationDisplayFormat(row: Record<string, unknown>): string {
  const fmt = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
  return fmt ? FORMAT_LABEL[fmt] : "—"
}

/** Libellé du champ de saisie dans le panneau d’hypothèse (aligné VCA). */
export function capitalisationHypothesisValueLabel(row: Record<string, unknown>): string {
  const fmt = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
  if (fmt === "percent") return "Taux (%)"
  if (fmt === "currency") return "Montant ($)"
  if (fmt === "days") return "Jours"
  return "Valeur"
}

/** Aide courte sous le titre du panneau. */
export function capitalisationHypothesisHelp(row: Record<string, unknown>): string {
  const fmt = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
  if (fmt === "percent") return "Saisissez le taux retenu pour ce poste, avec une note si besoin."
  if (fmt === "currency") return "Saisissez le montant retenu pour ce poste, avec une note si besoin."
  if (fmt === "days") return "Saisissez le nombre de jours retenu pour ce poste, avec une note si besoin."
  return "Saisissez la valeur retenue pour ce poste, avec une note si besoin."
}

/** Clé de persistance des hypothèses (id de structure, sinon libellé). */
export function capitalisationRowStorageKey(row: Record<string, unknown>): string | null {
  const id = String(row.id ?? "").trim()
  if (id) return id
  const label = String(row.label ?? "").trim()
  return label || null
}

export function isCapitalisationHypothesisRow(row: Record<string, unknown>): boolean {
  if (!isCodeMappingEnabled(row)) return false
  const mode = normalizeLiaisonMode(row)
  // « single » legacy traité comme hypothèse (plus de code unique en Multiplicateur).
  return mode === "na" || mode === "single"
}

export function isCapitalisationFormulaRow(row: Record<string, unknown>): boolean {
  if (!isCodeMappingEnabled(row)) return false
  return FORMULA_MODES.has(normalizeLiaisonMode(row))
}

/** Libellé de liaison pour le tableau hors Paramètres. */
export function describeCapitalisationLiaison(row: Record<string, unknown>): string {
  if (!isCodeMappingEnabled(row)) return "—"
  const mode = normalizeLiaisonMode(row)
  if (mode === "na" || mode === "single") return "Hypothèse"
  if (mode === "sum") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    return codes.length ? codes.join(" + ") : "Addition"
  }
  if (mode === "difference") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (!nums.length && !dens.length) return "Soustraction"
    return `${nums.join(" + ") || "…"} − ${dens.join(" + ") || "…"}`
  }
  if (mode === "product") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    return codes.length ? codes.join(" × ") : "Multiplication"
  }
  if (mode === "quotient") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    const factor = normalizeLiaisonFactor(row.liaisonFactor)
    const base = `${nums.join(" + ") || "…"} ÷ ${dens.join(" + ") || "…"}`
    return factor !== 1 ? `${base} × ${factor}` : base
  }
  return "—"
}

export function capitalisationStructureViewRows(structure: Record<string, unknown>[]) {
  return workingCapitalStructureViewRows(structure)
}

export function indentCapitalisationRow(row: Record<string, unknown>): boolean {
  if (typeof row.indent === "boolean") return row.indent
  if (row.isBold === true || row.isSection === true || row.isResult === true) return false
  return true
}

function findCapitalisationRefRow(
  structure: Record<string, unknown>[],
  code: string,
): Record<string, unknown> | null {
  const target = code.trim()
  if (!target) return null
  for (const row of structure) {
    const ref = workingCapitalRowRefCode(row)
    if (ref === target) return row
  }
  return null
}

/** Affichage % (ex. 26,5) → unité naturelle (0,265) pour × / ÷. */
function toNaturalUnit(value: number, format: WorkingCapitalDisplayFormat | null): number {
  return format === "percent" ? value / 100 : value
}

/** Unité naturelle → affichage du poste résultat (ex. 0,0164 → 1,64 %). */
function fromNaturalUnit(value: number, format: WorkingCapitalDisplayFormat | null): number {
  return format === "percent" ? value * 100 : value
}

/**
 * Résout le montant d’un poste Multiplicateur :
 * - Hypothèse → valeur saisie (`valuesByKey`)
 * - Formule → calcul sur les postes référencés (libellés)
 * - Multiplication / division : les postes en % sont convertis en fractions
 *   (6,2 % × 26,5 % = 1,643 %, pas 164,3 %)
 */
export function resolveCapitalisationAmount(
  row: Record<string, unknown>,
  structure: Record<string, unknown>[],
  valuesByKey: Record<string, number>,
  visiting: Set<string> = new Set(),
): number | null {
  if (!isCodeMappingEnabled(row)) return null
  const mode = normalizeLiaisonMode(row)

  const selfRef = workingCapitalRowRefCode(row) ?? capitalisationRowStorageKey(row)
  if (selfRef) {
    if (visiting.has(selfRef)) return 0
    visiting = new Set(visiting)
    visiting.add(selfRef)
  }

  if (mode === "na" || mode === "single") {
    const key = capitalisationRowStorageKey(row)
    if (!key) return null
    const byKey = valuesByKey[key]
    if (byKey != null && Number.isFinite(byKey)) return byKey
    const byLabel = valuesByKey[String(row.label ?? "").trim()]
    if (byLabel != null && Number.isFinite(byLabel)) return byLabel
    return null
  }

  const amountFor = (code: string): number => {
    const target = code.trim()
    if (!target) return 0
    const refRow = findCapitalisationRefRow(structure, target)
    if (refRow) {
      return resolveCapitalisationAmount(refRow, structure, valuesByKey, visiting) ?? 0
    }
    const direct = valuesByKey[target]
    return direct != null && Number.isFinite(direct) ? direct : 0
  }

  const amountNaturalFor = (code: string): number => {
    const target = code.trim()
    if (!target) return 0
    const refRow = findCapitalisationRefRow(structure, target)
    const display = amountFor(target)
    const fmt = refRow ? normalizeWorkingCapitalDisplayFormat(refRow.displayFormat) : null
    return toNaturalUnit(display, fmt)
  }

  const resultFormat = normalizeWorkingCapitalDisplayFormat(row.displayFormat)

  if (mode === "sum") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    if (codes.length === 0) return null
    return codes.reduce((sum, c) => sum + amountFor(c), 0)
  }
  if (mode === "product") {
    const codes = normalizeCodeList(row.liaisonSumCodes)
    if (codes.length === 0) return null
    const natural = codes.reduce((prod, c) => prod * amountNaturalFor(c), 1)
    return fromNaturalUnit(natural, resultFormat)
  }
  if (mode === "difference") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (nums.length === 0 && dens.length === 0) return null
    const n = nums.reduce((sum, c) => sum + amountFor(c), 0)
    const d = dens.reduce((sum, c) => sum + amountFor(c), 0)
    return n - d
  }
  if (mode === "quotient") {
    const nums = normalizeCodeList(row.liaisonNumeratorCodes)
    const dens = normalizeCodeList(row.liaisonDenominatorCodes)
    if (nums.length === 0 && dens.length === 0) return null
    const n = nums.reduce((sum, c) => sum + amountNaturalFor(c), 0)
    const d = dens.reduce((sum, c) => sum + amountNaturalFor(c), 0)
    if (d === 0) return 0
    const natural = (n / d) * normalizeLiaisonFactor(row.liaisonFactor)
    return fromNaturalUnit(natural, resultFormat)
  }
  return null
}

export function formatCapitalisationValue(
  value: number | null,
  row: Record<string, unknown>,
): string {
  if (value == null || !Number.isFinite(value)) return "—"
  const fmt = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
  if (fmt === "percent") {
    return `${value.toLocaleString("fr-CA", { maximumFractionDigits: 2 })} %`
  }
  if (fmt === "currency") return formatCurrency(value)
  if (fmt === "days") {
    return `${value.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} j`
  }
  return value.toLocaleString("fr-CA", { maximumFractionDigits: 2 })
}

/** Charge values + notes depuis ForecastConfig (accepte l’ancien format plat). */
export function parseCapitalisationValuesConfig(data: unknown): {
  values: Record<string, number>
  notes: Record<string, string>
} {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const values: Record<string, number> = {}
  const notes: Record<string, string> = {}

  const nestedValues = source.values
  if (nestedValues && typeof nestedValues === "object") {
    for (const [k, v] of Object.entries(nestedValues as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v)
      if (Number.isFinite(n)) values[k] = n
    }
  } else {
    for (const [k, v] of Object.entries(source)) {
      if (k === "notes" || k === "values") continue
      const n = typeof v === "number" ? v : Number(v)
      if (Number.isFinite(n)) values[k] = n
    }
  }

  const nestedNotes = source.notes
  if (nestedNotes && typeof nestedNotes === "object") {
    for (const [k, v] of Object.entries(nestedNotes as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) notes[k] = v
    }
  }

  return { values, notes }
}
