/**
 * Simulation mensuelle d’une immobilisation Capex (dotation / VNC).
 * Partagée par le Sommaire Hypothèse et le moteur annuel (`buildCapexAssetYearStates`).
 */

export type CapexDepreciationMethodMonthly = "linear" | "declining"

export type CapexAssetMonthState = {
  additions: number
  cost: number
  bookValue: number
  depreciation: number
}

/** Répartit des montants flottants en dollars entiers (somme = round(sum floats)). */
function roundFloatSeriesToDollars(floats: number[]): number[] {
  const n = floats.length
  if (n === 0) return []
  const target = Math.round(floats.reduce((a, b) => a + b, 0))
  const out = floats.map((x) => Math.floor(Math.max(0, x)))
  let diff = target - out.reduce((a, b) => a + b, 0)
  let guard = 0
  while (diff !== 0 && guard < 5000) {
    let best = 0
    let bestFrac = -Infinity
    for (let i = 0; i < n; i++) {
      const frac = Math.max(0, floats[i]!) - out[i]!
      if (diff > 0 && frac > bestFrac) {
        bestFrac = frac
        best = i
      } else if (diff < 0 && out[i]! > 0) {
        const give = out[i]! - Math.max(0, floats[i]!)
        if (give > bestFrac) {
          bestFrac = give
          best = i
        }
      }
    }
    if (diff > 0) {
      out[best] = (out[best] ?? 0) + 1
      diff--
    } else if (out[best]! > 0) {
      out[best] = (out[best] ?? 0) - 1
      diff++
    } else {
      break
    }
    guard++
  }
  return out
}

/**
 * Après l’ajout du mois :
 * - dégressif = (taux annuel / 12) × VNC ;
 * - linéaire = (taux annuel / 12) × Coût (plafonné à la VNC).
 * Dotation annuelle = somme des mois ; VNC annuelle = clôture décembre.
 * Les cents sont répartis pour que la somme mensuelle = round(somme flottante)
 * (ex. linéaire sans ajout mi-année → même total qu’un amort. annuel taux × coût).
 */
export function simulateCapexAssetYearMonths(params: {
  openingCost: number
  openingBookValue: number
  monthlyAdditions: number[]
  ratePercent: number
  method: CapexDepreciationMethodMonthly
}): {
  months: CapexAssetMonthState[]
  depreciationExpense: number
  endingCost: number
  endingBookValue: number
  endingAccumulatedDepreciation: number
} {
  let cost = Math.max(0, Math.round(Number(params.openingCost) || 0))
  let book = Math.max(0, Math.round(Number(params.openingBookValue) || 0))
  const rate = Math.max(0, Number(params.ratePercent) || 0)
  const method = params.method === "declining" ? "declining" : "linear"
  const monthlyRate = rate / 100 / 12

  const additionsPerMonth = Array.from({ length: 12 }, (_, i) =>
    Math.max(0, Math.round(Number(params.monthlyAdditions[i]) || 0)),
  )

  // Passe 1 : trajectoire flottante pour les dotations
  let costF = cost
  let bookF = book
  const floatDeps: number[] = []
  for (let i = 0; i < 12; i++) {
    const add = additionsPerMonth[i]!
    costF += add
    bookF += add
    let d = 0
    if (bookF > 0 && rate > 0) {
      d = method === "declining" ? bookF * monthlyRate : costF * monthlyRate
      d = Math.min(Math.max(0, d), bookF)
    }
    floatDeps.push(d)
    bookF -= d
  }

  const depreciationMonths = roundFloatSeriesToDollars(floatDeps)

  // Passe 2 : appliquer les dollars arrondis pour Coût / VNC affichés
  const months: CapexAssetMonthState[] = []
  let depreciationExpense = 0
  for (let i = 0; i < 12; i++) {
    const additions = additionsPerMonth[i]!
    cost += additions
    book += additions
    let depreciation = Math.min(depreciationMonths[i] ?? 0, Math.max(0, book))
    book -= depreciation
    depreciationExpense += depreciation
    months.push({ additions, cost, bookValue: book, depreciation })
  }

  return {
    months,
    depreciationExpense,
    endingCost: cost,
    endingBookValue: book,
    endingAccumulatedDepreciation: Math.max(0, cost - book),
  }
}
