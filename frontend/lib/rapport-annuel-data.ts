export const REPORT_YEARS = ["2021", "2022", "2023", "2024", "2025"] as const
export const TRAJECTORY_YEARS = ["2024", "2025", "2026", "2027", "2028"] as const

export const INK = "#222732"
export const SAND = "#C4B5A4"
export const ORANGE = "#E0742D"
export const STEEL = "#5B7C99"
export const CLAY = "#8C5A3C"
export const SAGE = "#3F6F5B"

export const EXECUTIVE_KPIS = [
  { label: "Revenus", value: "2 979 k$", delta: "+17,6 %" },
  { label: "Contribution", value: "1 565 k$", delta: "+2,5 pts" },
  { label: "Bénéfice net", value: "507 k$", delta: "+4,3 pts" },
  { label: "BAIIA", value: "670 k$", delta: "+5,0 pts" },
  { label: "FCF", value: "501 k$", delta: "sommaire" },
  { label: "Dettes", value: "0 k$", delta: "portant intérêt" },
  { label: "Excédent", value: "1 197 k$", delta: "sommaire" },
  { label: "Valeur des actions", value: "4,9–5,4 M$", delta: "illustrative" },
] as const

export const TOC = [
  { index: "01", href: "#sommaire", label: "Sommaire exécutif" },
  { index: "02", href: "#apercu", label: "Aperçu" },
  { index: "03", href: "#performance", label: "Performance" },
  { index: "04", href: "#situation", label: "Situation" },
  { index: "05", href: "#trajectoire", label: "Trajectoire" },
  { index: "06", href: "#valorisation", label: "Valorisation" },
  { index: "07", href: "#plan", label: "Plan d’action" },
] as const

export const RISKS = [
  {
    title: "Concentration des clients",
    text: "Dépendance envers un nombre limité de clients, et risque financier lié à la perte de l’un d’eux.",
    level: "élevé",
  },
  {
    title: "Durée et récurrence des contrats",
    text: "Durée des engagements et récurrence des revenus, donc stabilité et prévisibilité des ventes.",
    level: "élevé",
  },
  {
    title: "Personnes-clés",
    text: "Connaissances, relations et compétences détenues par quelques personnes, et conséquences de leur départ.",
    level: "élevé",
  },
  {
    title: "Concentration sectorielle",
    text: "Dépendance envers un secteur d’activité et exposition aux fluctuations de ce secteur.",
    level: "modéré",
  },
  {
    title: "Intensité de la concurrence",
    text: "Niveau de concurrence et effets sur les prix, les marges, la fidélisation et la croissance.",
    level: "modéré",
  },
  {
    title: "Cycles économiques",
    text: "Sensibilité de la demande, des revenus, des marges et des flux aux cycles économiques.",
    level: "modéré",
  },
  {
    title: "Concentration géographique",
    text: "Répartition de la clientèle et dépendance envers un territoire ou un marché particulier.",
    level: "faible",
  },
  {
    title: "Saisonnalité des revenus",
    text: "Variations dans l’année et effets sur la rentabilité, les liquidités et les besoins de financement.",
    level: "faible",
  },
  {
    title: "Concentration des fournisseurs",
    text: "Dépendance envers peu de fournisseurs : hausses de coûts, ruptures ou perte d’un fournisseur.",
    level: "faible",
  },
  {
    title: "Taux de roulement",
    text: "Fréquence des départs et effets sur les coûts, la productivité, la continuité et la rétention.",
    level: "faible",
  },
  {
    title: "Difficulté d’embauche",
    text: "Capacité à recruter les ressources nécessaires pour soutenir l’activité et la croissance.",
    level: "faible",
  },
  {
    title: "Durée du bail",
    text: "Durée restante du bail et conditions de renouvellement pour le maintien des activités.",
    level: "faible",
  },
  {
    title: "Conformité réglementaire",
    text: "Obligations applicables à l’entreprise et risques de sanctions ou de restrictions.",
    level: "faible",
  },
  {
    title: "Poursuites et litiges",
    text: "Exposition à des poursuites, à des frais juridiques et à une atteinte à la réputation.",
    level: "faible",
  },
  {
    title: "Risques environnementaux",
    text: "Obligations environnementales, contamination des sites et responsabilité de l’entreprise.",
    level: "faible",
  },
  {
    title: "Taux de change",
    text: "Exposition aux devises et effets possibles sur les revenus, les coûts, les marges et la rentabilité.",
    level: "faible",
  },
  {
    title: "Concentration du marché",
    text: "Répartition du marché entre les principaux acteurs et leur influence sur les prix.",
    level: "faible",
  },
  {
    title: "Barrières à l’entrée",
    text: "Obstacles à l’arrivée de nouveaux concurrents : investissements, réglementation, expertise.",
    level: "faible",
  },
] as const

export const GLOSSARY = [
  { term: "BAIIA", text: "Bénéfice avant intérêts, impôts et amortissement." },
  { term: "BAI", text: "Bénéfice avant impôts." },
  { term: "FCF", text: "Flux de trésorerie disponible avant financement." },
  { term: "FdR", text: "Fonds de roulement." },
  { term: "FdRHC", text: "Fonds de roulement hors caisse." },
  { term: "VCN", text: "Valeur comptable nette." },
  { term: "CMPC", text: "Coût moyen pondéré du capital." },
  { term: "Projection", text: "Réel des mois écoulés, plus la projection des mois restants." },
  { term: "Prévision", text: "Projections financières préparées par la direction, servant de référence." },
] as const
