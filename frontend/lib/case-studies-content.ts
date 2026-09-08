/**
 * Contenu marketing — page Études de cas.
 * Chaque étude suit les trois phases de l’approche Modelisys :
 * Diagnostic → Planification → Pilotage, appliquées à l’histoire du client.
 */

export const CASE_STUDY_IDS = [
  "services",
  "manufacturiere",
  "cyclique",
  "groupe",
  "cabinet",
  "franchise",
] as const

export type CaseStudyId = (typeof CASE_STUDY_IDS)[number]

export type CaseStudyContent = {
  id: CaseStudyId
  number: string
  /** Profil / type d’entreprise (onglet + eyebrow). */
  label: string
  /** Accroche narrative courte. */
  tagline: string
  /** Diagnostic — ce que la lecture a permis de comprendre. */
  diagnostic: string
  /** Planification — projections et scénarios du cas. */
  planification: string
  /** Pilotage — réel vs passé vs projection, actions correctives. */
  pilotage: string
  /** Chiffres clés affichés sous le titre (optionnel, 2–3 max). */
  figures: readonly { label: string; value: string }[]
}

export const CASE_STUDIES_CONTENT: Record<CaseStudyId, CaseStudyContent> = {
  services: {
    id: "services",
    number: "01",
    label: "Services",
    tagline: "Quand les totaux cachent une division qui perd de l’argent",
    diagnostic:
      "Le diagnostic part des états financiers et révèle ce que les totaux masquaient. Valeur d’entreprise : 4,2 M$ (multiple 4,5× sur un BAIIA normalisé de 935 000 $). Marge consolidée affichée à 12 % — mais le conseil tourne à 18 % tandis que la technique affiche −4 %. Cause isolée : 320 000 $ de frais partagés mal alloués. Concentration, liquidité et leviers de marge sont documentés division par division. Pour la première fois, le dirigeant sait quelle division crée de la valeur — et laquelle la détruit.",
    planification:
      "À partir de ce diagnostic, l’équipe projette revenus, dépenses fixes et variables, et frais partagés par division sur trois ans. Deux scénarios sont modélisés : statu quo (valeur stagnante vers 4,4 M$) et plan d’action (réallocation de 180 000 $ de frais, réduction de 90 000 $ de coûts variables, pricing sur la technique). Objectif retenu : technique à 8 % de marge, consolidé à 15 %, valeur à 5,8 M$. Les budgets mensuels par division sont calés sur ce scénario — pas sur une ambition sans modèle.",
    pilotage:
      "Chaque mois, Modelisys compare le réel au passé et à la projection. Au sixième mois, la technique progresse mais reste à −1 % — sous les 8 % visés. L’écart est traduit en −45 000 $ sur la trajectoire de valeur. Actions : pricing sur trois contrats, plafond de dépenses variables (−60 000 $/an), allocation des frais revue. La projection est recalibrée ; valeur projetée remontée à 5,4 M$. Le cap de 5,8 M$ tient, parce que le pilotage corrige dès que le réel dévie du plan.",
    figures: [
      { label: "Départ", value: "4,2 M$" },
      { label: "Objectif", value: "5,8 M$" },
      { label: "Horizon", value: "3 ans" },
    ],
  },
  manufacturiere: {
    id: "manufacturiere",
    number: "02",
    label: "Manufacturière",
    tagline: "Acquérir, fermer une division — et chiffrer l’impact avant d’agir",
    diagnostic:
      "Le diagnostic fixe la photo avant toute décision structurante. Valeur actuelle : 4,2 M$. Marge brute stable à 32 %, mais 45 % des revenus chez trois clients. Fonds de roulement sous tension (liquidité à 1,1, délai de recouvrement de 68 jours). Une division non rentable pèse sur la marge opérationnelle. Leviers identifiés : diversifier la clientèle, réduire le BFR de 15 %, gagner 2 points de marge — et chiffrer l’effet d’une acquisition avant de s’engager.",
    planification:
      "Le dirigeant fixe un cap : 7 M$ de valeur en 3 ans via une acquisition à 24 mois et la fermeture de la division déficitaire. Modelisys projette revenus, dépenses, FDR, capex et financement pour chaque option. L’acquisition et la fermeture sont modélisées ensemble : impact sur le compte de résultat, le bilan et le cash. Besoin de financement anticipé : 850 000 $ au moment de l’achat. La fermeture libère +180 000 $ de trésorerie et +0,6 M$ de valeur projetée à terme. Le scénario retenu devient le plan de référence.",
    pilotage:
      "À mi-parcours, le réel dépasse le modèle côté ventes (embauche d’un vendeur) — mais les dépenses variables grimpent plus vite que prévu. Modelisys compare réel, N−1 et projection : écart de −80 000 $ sur la trajectoire vers 7 M$. Le plan est recalibré (dépenses resserrées, embauche reportée de six mois, financement ramené à 780 000 $). Chaque mois, le même tableau — réel vs passé vs scénario — protège le cap sans attendre la clôture annuelle.",
    figures: [
      { label: "Départ", value: "4,2 M$" },
      { label: "Objectif", value: "7 M$" },
      { label: "Financement", value: "850 k$" },
    ],
  },
  cyclique: {
    id: "cyclique",
    number: "03",
    label: "Cyclique",
    tagline: "Voir le creux de cash avant qu’il ne devienne une crise",
    diagnostic:
      "Le diagnostic relie valeur, BFR et liquidité sur le même horizon. Valeur : 3,5 M$. BFR : 2,1 M$ — dont 980 000 $ immobilisés en stocks et un délai de recouvrement de 72 jours. Trésorerie disponible : 420 000 $, jugée insuffisante pour absorber le prochain creux de cycle. Le risque n’est plus intuitif : il est daté, chiffré, et visible avant la crise.",
    planification:
      "Objectif : maintenir la valeur à 3,5 M$ minimum tout en finançant 1,2 M$ de capex sur deux ans. Modelisys projette revenus saisonniers, coûts, FDR, phases de capex (600 000 $ puis 600 000 $) et flux de trésorerie mois par mois. Les scénarios révèlent un besoin de marge de crédit de 350 000 $ au creux — à négocier avec la banque avant la tension. Le plan de cash devient aussi structurant que le plan d’investissement.",
    pilotage:
      "Au quatrième mois, les matières grimpent de 12 % vs projection. Le réel tombe à 380 000 $ de trésorerie — sous le seuil de 600 000 $ visé. Écart quantifié : 220 000 $ de tension. Comparé au passé et au scénario, la dérive est immédiate. Phase 2 des capex reportée de neuf mois, DSO cible ramené de 72 à 58 jours, fournisseurs renégociés (−15 jours). Le pilotage transforme le cash d’une surprise annuelle en un suivi mensuel réel vs plan.",
    figures: [
      { label: "Valeur", value: "3,5 M$" },
      { label: "BFR", value: "2,1 M$" },
      { label: "Seuil cash", value: "600 k$" },
    ],
  },
  groupe: {
    id: "groupe",
    number: "04",
    label: "Groupe",
    tagline: "Quatre sociétés, une seule lecture de la valeur",
    diagnostic:
      "Le diagnostic consolide les quatre sociétés sur une base unique. Valeur groupe : 12 M$ — A à 4,8 M$, B à 4,2 M$, C à −200 000 $ de perte annuelle. Intercos de 1,8 M$ mal documentés : écarts de consolidation récurrents, clôtures retardées. Pour la première fois, la famille voit quelle entité crée de la valeur, laquelle la détruit, et où les flux croisés brouillent la lecture.",
    planification:
      "Objectif groupe : 16 M$ en 4 ans. Deux trajectoires sont projetées — intégrer et redresser C, ou céder la filiale — avec revenus, dépenses, éliminations intercos, trésorerie groupe et besoins de financement. Scénario intégration : économies de 150 000 $/an, valeur vers 14,5 M$ en 3 ans. Scénario cession : +2,2 M$ immédiat, mais perte de 400 000 $ de revenus croisés. Modelisys permet de choisir sur des chiffres, pas sur un ressenti familial.",
    pilotage:
      "Reporting uniformisé chaque mois : mêmes KPI, mêmes périodes, réel vs N−1 vs scénario. Au troisième mois, un écart intercos de 90 000 $ non éliminé est détecté et corrigé avant la clôture trimestrielle. Plan hybride retenu : cession partielle de C (60 %) et redressement du reste. Valeur groupe suivie en continu : 13,2 M$ à mi-parcours, trajectoire révisée vers 15,4 M$. Le pilotage tient le groupe aligné — une photo, une trajectoire, des écarts traités à temps.",
    figures: [
      { label: "Groupe", value: "12 M$" },
      { label: "Objectif", value: "16 M$" },
      { label: "Filiale C", value: "−200 k$/an" },
    ],
  },
  cabinet: {
    id: "cabinet",
    number: "05",
    label: "Cabinet",
    tagline: "CPA et dirigeant, enfin sur la même histoire de valeur",
    diagnostic:
      "Le cabinet structure le diagnostic client dans Modelisys : valeur à 2,8 M$, ratio de liquidité à 1,1, marge opérationnelle à 9 % (sous la médiane sectorielle de 14 %), 52 % des revenus chez deux clients. Dirigeant et CPA partagent la même lecture — fini les Excel contradictoires. Le diagnostic pose aussi les leviers : diversification, marge, BFR.",
    planification:
      "Ambition du dirigeant : 4,5 M$ de valeur en 3 ans. Ensemble, ils projettent revenus (acquisition de deux clients cibles, +800 000 $), dépenses et marge progressive de 9 % à 15 %, optimisation du BFR (−200 000 $ immobilisés) et un besoin de financement ponctuel de 120 000 $ pour soutenir la croissance. Le scénario devient le plan d’accompagnement du cabinet — pas une feuille volante à côté des états.",
    pilotage:
      "Revues mensuelles dans Modelisys : réel vs passé vs scénario. Au quatrième mois, un dépassement de 60 000 $ sur les coûts variables apparaît avant la clôture ; le cabinet alerte le dirigeant. Plan recalibré : embauche reportée, plafond de dépenses, nouveau client signé (+12 % de revenus). Valeur projetée : de 3,1 M$ à 3,6 M$ à 12 mois. Le cabinet ne livre plus seulement des états — il pilote une trajectoire de valeur que le client suit mois après mois.",
    figures: [
      { label: "Départ", value: "2,8 M$" },
      { label: "Objectif", value: "4,5 M$" },
      { label: "BFR", value: "−200 k$" },
    ],
  },
  franchise: {
    id: "franchise",
    number: "06",
    label: "Franchise",
    tagline: "Douze sites, trois qui tirent le réseau vers le bas",
    diagnostic:
      "Le diagnostic évalue le réseau à 6,1 M$ et compare les 12 sites sur les mêmes indicateurs. Marge moyenne 14 % — mais trois sites sous 8 % (dont un à 4,1 %), tandis que le meilleur tourne à 19 %. Causes racines isolées : coûts de main-d’œuvre mal calibrés et promotions non rentables sur les sites faibles. Sans cette lecture, le franchiseur ne voyait qu’une moyenne qui masquait les dérives.",
    planification:
      "Objectif : tous les sites à 12 %+ de marge et 7,5 M$ de valeur réseau en 3 ans. Modelisys projette, site par site, revenus, coûts de main-d’œuvre, coût des marchandises et promotions. Scénarios testés : optimisation main-d’œuvre (−8 % sur sites faibles), promotions ciblées (+5 % de trafic sur sites moyens), consolidation des achats (−3 % sur le CMV). La trajectoire réseau vers 7,5 M$ n’est retenue qu’une fois les leviers chiffrés par site.",
    pilotage:
      "Suivi mensuel par site : réel vs N−1 vs scénario. Au troisième mois, le site #7 passe de 6,2 % à 4,1 % — alerte dès la semaine 3, pas à la clôture annuelle. Coaching ciblé sur les trois sites faibles, partage des pratiques du site à 19 %, promotions révisées. À 12 mois : marge réseau 13,1 %, valeur projetée 7,1 M$ — en ligne vers 7,5 M$. Le réseau se pilote comme un portefeuille : chaque écart site a un impact valeur, visible immédiatement.",
    figures: [
      { label: "Réseau", value: "6,1 M$" },
      { label: "Objectif", value: "7,5 M$" },
      { label: "Sites faibles", value: "3 / 12" },
    ],
  },
}

export const CASE_STUDIES_ORDER = CASE_STUDY_IDS
