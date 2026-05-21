/**
 * Hypothèse revenus « Custom » : variables + formule.
 * Références **style Excel** : `[Libellé de la ligne]` (le libellé correspond à la colonne du tableau).
 * Années suivantes : chaque variable peut porter une **croissance** (% ou montant) appliquée à la valeur
 * résolue de l’année précédente dans la chaîne custom consécutive.
 */

export type RevenueCustomVariableKind = "number" | "percent" | "currency"

export type RevenueCustomYoYGrowthMode = "percent" | "amount"

export type RevenueCustomDraftRow = {
  id: string
  label: string
  kind: RevenueCustomVariableKind
  /** Saisie directe (année « base » du custom ou pas d’hypothèse custom l’année précédente). */
  valueInput: string
  /** Croissance vs l’année précédente (uniquement si tableau dérivé). */
  yoyGrowthMode?: RevenueCustomYoYGrowthMode
  yoyGrowthValueInput?: string
}

export type RevenueCustomVariableRow = {
  id: string
  label: string
  kind: RevenueCustomVariableKind
  /** Valeur résolue utilisée dans la formule (après chaîne YoY si applicable). */
  value: number
  /** Si défini, la valeur de cette ligne = f(valeur année précédente, delta). Sinon saisie directe (année base). */
  yearOverYear?: {
    mode: RevenueCustomYoYGrowthMode
    /** % ex. 5 pour +5 % ; nombre : montant fixe à ajouter. */
    delta: number
  }
}

export type RevenueCustomGrowthSnapshot = {
  variables: RevenueCustomVariableRow[]
  formula: string
}

export type RevenueCustomGrowthChainEntry = {
  yearIndex: number
  snapshot: RevenueCustomGrowthSnapshot
}

const stripGroupedNumber = (s: string) =>
  s
    .trim()
    .replace(/\s/g, "")
    .replace(/\u202f/g, "")
    .replace(/\u00a0/g, "")
    .replace(/,/g, ".")

/** Affichage milliers (aligné sur l’hypothèse revenus $). */
export function formatDraftNumberForInput(n: number): string {
  if (!Number.isFinite(n)) return "0"
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(Math.round(n))
  const digits = String(abs)
  const parts: string[] = []
  for (let i = digits.length; i > 0; i -= 3) {
    parts.unshift(digits.slice(Math.max(0, i - 3), i))
  }
  return sign + parts.join(" ")
}

export function parseDraftNumericInput(s: string): number | null {
  const t = stripGroupedNumber(s)
  if (t === "") return 0
  if (t === "+" || t === "-") return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Référence lisible dans la formule (comme un nom Excel entre crochets). */
export function revenueCustomBracketRef(label: string): string {
  const t = (label.trim() || "Sans nom").replace(/\]/g, "")
  return `[${t}]`
}

/** @deprecated Préférer `revenueCustomBracketRef` ; conservé pour formules déjà sauvegardées. */
export function revenueCustomFormulaPlaceholder(id: string): string {
  return `{{${id}}}`
}

function normalizeLabelForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

function labelDuplicateError(variables: RevenueCustomVariableRow[]): string | null {
  const seen = new Map<string, string>()
  for (const v of variables) {
    const k = normalizeLabelForMatch(v.label)
    if (!k) continue
    if (seen.has(k)) {
      return `Libellés en double : « ${seen.get(k)} » et « ${v.label.trim()} ». Chaque nom entre [crochets] doit être unique.`
    }
    seen.set(k, v.label.trim())
  }
  return null
}

function substitutionExprForVariable(v: RevenueCustomVariableRow): string {
  const n = v.value
  if (!Number.isFinite(n)) return "(0)"
  if (v.kind === "percent") {
    return `(${n}/100)`
  }
  return `(${n})`
}

/**
 * Chaîne d’hypothèses **custom** consécutives se terminant à `upToYearIndex` (même poste).
 * Si une année intermédiaire n’est pas en custom, la chaîne repart à partir de la prochaine année custom.
 */
export function collectConsecutiveCustomGrowthChain(
  rowId: string,
  upToYearIndex: number,
  getAdjustment: (rowId: string, yearIndex: number) => { customGrowth?: RevenueCustomGrowthSnapshot } | null | undefined
): RevenueCustomGrowthChainEntry[] {
  const back: RevenueCustomGrowthChainEntry[] = []
  for (let y = upToYearIndex; y >= 0; y--) {
    const a = getAdjustment(rowId, y)
    const snap = a?.customGrowth
    if (snap?.variables?.length) {
      back.push({ yearIndex: y, snapshot: snap })
    } else {
      break
    }
  }
  return back.reverse()
}

/**
 * Valeurs résolues pour la **dernière** entrée de la chaîne (même ordre que les variables du dernier snapshot).
 */
export function resolveCustomGrowthVariablesFromChain(
  chain: RevenueCustomGrowthChainEntry[]
): RevenueCustomVariableRow[] {
  if (chain.length === 0) return []
  const first = chain[0]!.snapshot.variables
  let idToVal = new Map<string, number>()
  for (const v of first) {
    idToVal.set(v.id, v.value)
  }
  for (let i = 1; i < chain.length; i++) {
    const vs = chain[i]!.snapshot.variables
    const next = new Map<string, number>()
    for (const v of vs) {
      const prev = idToVal.get(v.id) ?? 0
      const yoy = v.yearOverYear
      const nv = yoy
        ? yoy.mode === "percent"
          ? prev * (1 + yoy.delta / 100)
          : prev + yoy.delta
        : v.value
      next.set(v.id, nv)
    }
    idToVal = next
  }
  const last = chain[chain.length - 1]!.snapshot
  return last.variables.map((v) => ({
    ...v,
    value: idToVal.get(v.id) ?? v.value,
  }))
}

function expandFormulaToNumericExpression(
  formula: string,
  variables: RevenueCustomVariableRow[]
): { ok: true; expr: string } | { ok: false; error: string } {
  const idToVar = new Map<string, RevenueCustomVariableRow>()
  for (const v of variables) {
    idToVar.set(v.id, v)
  }

  const dupErr = labelDuplicateError(variables)
  if (dupErr) return { ok: false, error: dupErr }

  let replaced = formula.trim()

  const unknownIds: string[] = []
  replaced = replaced.replace(/\{\{([a-zA-Z0-9-]+)\}\}/g, (_full, id: string) => {
    const v = idToVar.get(id)
    if (!v) {
      unknownIds.push(id)
      return "NaN"
    }
    return substitutionExprForVariable(v)
  })
  if (unknownIds.length > 0) {
    return { ok: false, error: `Référence inconnue : {{${unknownIds[0]}}}.` }
  }
  if (/\{\{/.test(replaced)) {
    return { ok: false, error: "Référence {{…}} incomplète ou invalide." }
  }

  const unknownBracket: string[] = []
  replaced = replaced.replace(/\[([^\]]*)\]/g, (_full, inner: string) => {
    const key = normalizeLabelForMatch(inner)
    if (!key) {
      unknownBracket.push("[]")
      return "NaN"
    }
    const found = variables.find((v) => normalizeLabelForMatch(v.label) === key)
    if (!found) {
      unknownBracket.push(inner.trim() || "(vide)")
      return "NaN"
    }
    return substitutionExprForVariable(found)
  })

  if (unknownBracket.length > 0) {
    return {
      ok: false,
      error: `Référence inconnue : [${unknownBracket[0]}]. Vérifiez l’orthographe ou les espaces (comme dans le tableau).`,
    }
  }
  if (/\[/.test(replaced)) {
    return { ok: false, error: "Crochet [ sans fermeture ]." }
  }
  if (/[a-zA-Z]/.test(replaced)) {
    return {
      ok: false,
      error:
        "Utilisez des nombres, + − * / ( ) et des noms entre crochets, ex. [Clients existants] + [Nouveaux clients].",
    }
  }

  const compact = replaced.replace(/\s/g, "")
  if (!/^[0-9+\-*/().]+$/.test(compact)) {
    return { ok: false, error: "Caractère non autorisé dans la formule (après substitution des noms)." }
  }

  return { ok: true, expr: replaced }
}

export type BuildRevenueCustomSnapshotContext =
  | { mode: "direct" }
  | { mode: "yoy"; previousEffectiveValuesById: Map<string, number> }

/** Construit le snapshot pour persistance ; null si saisie ou formule invalide. */
export function buildRevenueCustomGrowthSnapshot(
  rows: RevenueCustomDraftRow[],
  formula: string,
  ctx: BuildRevenueCustomSnapshotContext = { mode: "direct" }
): { ok: true; snapshot: RevenueCustomGrowthSnapshot; result: number } | { ok: false; error: string } {
  if (rows.length === 0) {
    return { ok: false, error: "Ajoutez au moins une ligne de variable." }
  }
  const variables: RevenueCustomVariableRow[] = []
  for (const r of rows) {
    let resolved: number
    let yoy: RevenueCustomVariableRow["yearOverYear"] | undefined

    if (ctx.mode === "yoy") {
      const prev = ctx.previousEffectiveValuesById.get(r.id) ?? 0
      const mode = r.yoyGrowthMode ?? "percent"
      const g = parseDraftNumericInput(r.yoyGrowthValueInput ?? "0")
      if (g === null) {
        return { ok: false, error: `Croissance invalide pour « ${r.label.trim() || "sans nom"} ».` }
      }
      resolved = mode === "percent" ? prev * (1 + g / 100) : prev + g
      yoy = { mode, delta: g }
    } else {
      const v = parseDraftNumericInput(r.valueInput)
      if (v === null) {
        return { ok: false, error: `Valeur invalide pour « ${r.label.trim() || "sans nom"} ».` }
      }
      resolved = v
      yoy = undefined
    }

    variables.push({
      id: r.id,
      label: r.label.trim() || "Variable",
      kind: r.kind,
      value: resolved,
      yearOverYear: yoy,
    })
  }
  const ev = evaluateRevenueCustomGrowth(formula, variables)
  if (!ev.ok) return ev
  return { ok: true, snapshot: { variables, formula: formula.trim() }, result: ev.result }
}

/** Exemple SaaS : formule lisible type Excel avec noms entre crochets. */
export function createSaaSRevenueCustomStarter(newId: () => string): {
  rows: RevenueCustomDraftRow[]
  formula: string
} {
  const idA = newId()
  const idB = newId()
  const idC = newId()
  const idD = newId()
  const la = "Clients existants"
  const lb = "Nouveaux clients"
  const lc = "Churn"
  const ld = "Prix moyen"
  return {
    rows: [
      { id: idA, label: la, kind: "number", valueInput: "100" },
      { id: idB, label: lb, kind: "number", valueInput: "10" },
      { id: idC, label: lc, kind: "percent", valueInput: "5" },
      { id: idD, label: ld, kind: "currency", valueInput: formatDraftNumberForInput(1000) },
    ],
    formula: `[${la}] + [${lb}] * [${ld}] - [${la}] * [${lc}] * [${ld}]`,
  }
}

export function appendRevenueCustomFormulaOperator(
  formula: string,
  op: "+" | "-" | "*" | "/"
): string {
  const t = formula.trimEnd()
  if (t === "") return `${op} `
  const needsSpace = !/[+\-*/(]$/.test(t)
  return `${t}${needsSpace ? " " : ""}${op} `
}

export function evaluateRevenueCustomGrowth(
  formula: string,
  variables: RevenueCustomVariableRow[]
): { ok: true; result: number } | { ok: false; error: string } {
  const raw = formula.trim()
  if (!raw) return { ok: false, error: "Saisissez une formule." }

  const expanded = expandFormulaToNumericExpression(raw, variables)
  if (!expanded.ok) return expanded

  try {
    const result = new Function(`"use strict"; return (${expanded.expr});`)() as number
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return { ok: false, error: "Résultat non numérique." }
    }
    return { ok: true, result }
  } catch {
    return { ok: false, error: "Impossible d’évaluer la formule (syntaxe ou parenthèses)." }
  }
}
