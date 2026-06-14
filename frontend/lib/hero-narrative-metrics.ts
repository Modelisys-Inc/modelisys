/** Chiffres de référence partagés — hero « Trajectoire de performance » et section Approche Modelisys. */
export const NARRATIVE_BASELINE = {
  revenus: "12 M$",
  baiia: "1,8 M$",
  margeBaiia: "15 %",
  margeBrute: "32 %",
  valeur: "4,2 M$",
  baiiaNormalise: "935 000 $",
  multiple: "4,5×",
  fondsRoulement: "1,3 M$",
  dette: "2,4 M$",
} as const

export const NARRATIVE_TARGET = {
  revenus: "18 M$",
  baiia: "3,2 M$",
  margeBaiia: "18 %",
  valeur: "7 M$",
  fondsRoulement: "1,6 M$",
  dette: "2,1 M$",
} as const

export const NARRATIVE_PROJECTION = {
  an1: {
    revenus: NARRATIVE_BASELINE.revenus,
    margeBaiia: NARRATIVE_BASELINE.margeBaiia,
    baiia: NARRATIVE_BASELINE.baiia,
    valeur: NARRATIVE_BASELINE.valeur,
    fondsRoulement: NARRATIVE_BASELINE.fondsRoulement,
    capex: "600 k$",
    dette: NARRATIVE_BASELINE.dette,
    cashFlow: "520 k$",
  },
  an2: {
    revenus: "15 M$",
    margeBaiia: "17 %",
    baiia: "2,5 M$",
    valeur: "5,6 M$",
    fondsRoulement: "1,4 M$",
    capex: "850 k$",
    dette: "3,1 M$",
    cashFlow: "650 k$",
  },
  an3: {
    revenus: NARRATIVE_TARGET.revenus,
    margeBaiia: NARRATIVE_TARGET.margeBaiia,
    baiia: NARRATIVE_TARGET.baiia,
    valeur: NARRATIVE_TARGET.valeur,
    fondsRoulement: NARRATIVE_TARGET.fondsRoulement,
    capex: "720 k$",
    dette: NARRATIVE_TARGET.dette,
    cashFlow: "780 k$",
  },
} as const

export const NARRATIVE_COMPARISON = [
  { label: "Revenus", today: NARRATIVE_BASELINE.revenus, target: NARRATIVE_TARGET.revenus },
  { label: "BAIIA", today: NARRATIVE_BASELINE.baiia, target: NARRATIVE_TARGET.baiia },
  { label: "Marge BAIIA", today: NARRATIVE_BASELINE.margeBaiia, target: NARRATIVE_TARGET.margeBaiia },
  { label: "Valeur d'entreprise", today: NARRATIVE_BASELINE.valeur, target: NARRATIVE_TARGET.valeur },
] as const

export const NARRATIVE_DIVISIONS = [
  { name: "Services", revenue: "7,0 M$", grossMargin: "34 %", baiia: "1,1 M$" },
  { name: "Manufacturier", revenue: "5,0 M$", grossMargin: "28 %", baiia: "0,7 M$" },
] as const

/** Écarts pilotage — réel vs prévu vs passé (trimestre en cours). */
export const NARRATIVE_PILOTAGE = {
  periode: "T2 · en cours",
  rows: [
    {
      label: "Revenus",
      passe: "2,9 M$",
      prevu: "3,6 M$",
      reel: "3,8 M$",
      ecart: "+200 k$",
      ecartTone: "positive" as const,
    },
    {
      label: "Marge brute",
      passe: "31 %",
      prevu: "32 %",
      reel: "30 %",
      ecart: "−2 pts",
      ecartTone: "negative" as const,
    },
    {
      label: "BAIIA",
      passe: "420 k$",
      prevu: "480 k$",
      reel: "450 k$",
      ecart: "−30 k$",
      ecartTone: "negative" as const,
    },
    {
      label: "Capex",
      passe: "140 k$",
      prevu: "210 k$",
      reel: "265 k$",
      ecart: "+55 k$",
      ecartTone: "negative" as const,
    },
    {
      label: "Cash flow",
      passe: "125 k$",
      prevu: "160 k$",
      reel: "142 k$",
      ecart: "−18 k$",
      ecartTone: "negative" as const,
    },
  ],
  note: {
    revenus:
      "Les ventes dépassent le budget grâce à la division manufacturière (+280 k$), partiellement compensées par un retard sur deux contrats services.",
    marge:
      "La marge brute recule de 2 points : hausse des matières premières (+1,2 pt) et mix produits défavorable (+0,8 pt).",
    capex:
      "Le capex dépasse le prévu de 55 k$ — travaux d'intégration post-acquisition non budgétisés au T1.",
  },
} as const
