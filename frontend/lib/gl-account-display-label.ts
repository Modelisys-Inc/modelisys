/**
 * Affichage libellé compte GL : un seul « 2500 — Description »,
 * sans doubler le n° si la description le contient déjà.
 */
export function accountLabelAlreadyIncludesNumber(
  accountNumber: string,
  accountName: string,
): boolean {
  const n = accountNumber.trim()
  const name = (accountName || "").trim()
  if (!n || !name) return false
  if (name === n) return true
  if (!name.startsWith(n)) return false
  const rest = name.slice(n.length)
  return rest === "" || /^[\s\u2014\u2013\-:]/.test(rest)
}

/** Retire les préfixes « 2500 — » répétés en tête du libellé. */
export function stripLeadingGlAccountNumber(accountNumber: string, accountName: string): string {
  const n = accountNumber.trim()
  let name = (accountName || "").trim()
  if (!n) return name
  while (name.startsWith(n)) {
    const rest = name.slice(n.length)
    if (rest === "" || /^[\s\u2014\u2013\-:]/.test(rest)) {
      name = rest.replace(/^[\s\u2014\u2013\-:]+/, "").trim()
      continue
    }
    break
  }
  return name
}

/** Libellé unique pour une ligne GL expandée : `2500 — Description`. */
export function formatGlAccountDisplayLabel(accountNumber: string, accountName: string): string {
  const n = accountNumber.trim()
  const desc = stripLeadingGlAccountNumber(accountNumber, accountName)
  if (!n) return desc
  if (!desc) return n
  return `${n} — ${desc}`
}
