export const HERO_VALUE_DRIVER_IDS = [
  "croissance",
  "rentabilite",
  "tresorerie",
  "efficacite",
  "risque",
] as const

export type HeroValueDriverId = (typeof HERO_VALUE_DRIVER_IDS)[number]

export type HeroValueDriver = {
  id: HeroValueDriverId
  label: string
  shortLabel: string
  /** Court commentaire sous le titre. */
  comment: string
  improves: string
  deteriorates: string
  angleDeg: number
}

export const HERO_VALUE_DRIVERS: readonly HeroValueDriver[] = [
  {
    id: "croissance",
    label: "Croissance",
    shortLabel: "Croissance",
    comment: "La croissance crée de la valeur seulement si le BAIIA suit.",
    improves: "Revenus et BAIIA en hausse — idéalement au même rythme ou plus vite pour le BAIIA.",
    deteriorates: "Revenus en hausse, mais BAIIA stable ou en baisse.",
    angleDeg: -90,
  },
  {
    id: "rentabilite",
    label: "Rentabilité",
    shortLabel: "Rentabilité",
    comment: "Toutes les divisions et lignes de revenus ne contribuent pas pareil au BAIIA.",
    improves: "Mix orienté vers les segments les plus rentables.",
    deteriorates: "Croissance dans les divisions ou produits à faible marge.",
    angleDeg: -18,
  },
  {
    id: "tresorerie",
    label: "Trésorerie",
    shortLabel: "Trésorerie",
    comment: "Le cash se lit : résultat opérationnel ± fonds de roulement − capex − financement",
    improves: "BAIIA converti en trésorerie, BFR maîtrisé, capex discipliné.",
    deteriorates: "Profits comptables sans cash, BFR qui gonfle ou investissements mal absorbés.",
    angleDeg: 54,
  },
  {
    id: "efficacite",
    label: "Efficacité du capital",
    shortLabel: "Capital",
    comment: "La structure financière révèle des actifs productifs, excédentaires ou sous-utilisés.",
    improves: "Actifs alignés sur les opérations, structure légère et équilibrée.",
    deteriorates: "Capital immobilisé, actifs excédentaires ou passif mal calibré.",
    angleDeg: 126,
  },
  {
    id: "risque",
    label: "Risque",
    shortLabel: "Risque",
    comment: "Le multiple reflète ce qui pourrait fragiliser l'entreprise demain.",
    improves: "Clientèle diversifiée, équipe autonome, revenus prévisibles.",
    deteriorates: "Concentration client, dépendance au propriétaire, employés clés, forte saisonnalité.",
    angleDeg: 198,
  },
] as const

export function heroValueDriverById(id: HeroValueDriverId): HeroValueDriver {
  const driver = HERO_VALUE_DRIVERS.find((item) => item.id === id)
  if (!driver) return HERO_VALUE_DRIVERS[0]
  return driver
}
