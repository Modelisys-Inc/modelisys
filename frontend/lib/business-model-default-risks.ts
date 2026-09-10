export type BusinessRiskLevel = "low" | "medium" | "high" | null

export type BusinessRiskDefinition = {
  id: string
  category: string
  name: string
  description: string
  impact: string
  recommendation: string
  level: BusinessRiskLevel
  note?: string
}

export const DEFAULT_BUSINESS_RISKS: BusinessRiskDefinition[] = [
  // CLIENTS
  {
    id: "customer-concentration",
    category: "Clients",
    name: "Concentration clientèle",
    description: "Concentration des revenus dans un nombre limité de clients (client #1, top 3 ou top 5 clients représentent une part importante des revenus)",
    impact: "Ce risque expose l'entreprise à une perte de revenus significative si un ou plusieurs clients clés changent de fournisseur, compromettant la stabilité financière et la continuité opérationnelle. Un acquéreur percevra cette concentration comme un signe de vulnérabilité et d'instabilité des revenus, ce qui réduit l'attractivité de l'entreprise et peut affecter négativement le multiple de valorisation. La dépendance excessive à quelques clients crée une incertitude sur la pérennité des revenus futurs, impactant directement la valeur perçue de l'entreprise.",
    recommendation: "Diversifier activement le portefeuille clients en développant de nouveaux comptes stratégiques. Réduire progressivement la dépendance aux clients les plus importants. Négocier des contrats à long terme avec les clients existants pour sécuriser les revenus. Établir une stratégie de développement commercial ciblée pour élargir la base client.",
    level: null,
  },
  {
    id: "customer-contract-duration",
    category: "Clients",
    name: "Durée des contrats clients",
    description: "Absence ou courte durée des contrats avec les principaux clients",
    impact: "Ce risque crée une incertitude majeure sur la pérennité des revenus futurs, rendant difficile la planification stratégique et financière. Un acquéreur considérera les revenus non contractuels comme moins fiables et prévisibles, ce qui diminue la confiance dans la stabilité de l'entreprise. Cette absence de visibilité contractuelle impacte négativement la valorisation en réduisant la certitude des flux de trésorerie futurs, élément clé dans l'évaluation d'une entreprise.",
    recommendation: "Négocier des contrats à long terme avec clauses de renouvellement automatique pour sécuriser les revenus futurs. Documenter les relations commerciales établies même sans contrat formel pour démontrer la stabilité des relations clients.",
    level: null,
  },
  {
    id: "customer-geographic-concentration",
    category: "Clients",
    name: "Concentration géographique des clients",
    description: "Concentration des revenus dans une région géographique limitée",
    impact: "Ce risque expose l'entreprise à une vulnérabilité accrue face aux conditions économiques locales, créant une dépendance géographique qui peut compromettre la résilience de l'entreprise. Un acquéreur percevra cette concentration géographique comme un facteur limitant la diversification et la croissance, réduisant ainsi l'attractivité de l'investissement. Cette dépendance régionale impacte la valorisation en limitant le potentiel de croissance et en augmentant l'exposition aux risques locaux.",
    recommendation: "Développer une présence dans d'autres régions ou marchés. Diversifier géographiquement le portefeuille clients pour réduire la dépendance régionale.",
    level: null,
  },
  {
    id: "customer-industry-concentration",
    category: "Clients",
    name: "Concentration sectorielle des clients",
    description: "Concentration des revenus dans un secteur d'activité spécifique",
    impact: "Ce risque expose l'entreprise à une vulnérabilité accrue face aux cycles économiques du secteur, créant une dépendance qui peut compromettre la stabilité des revenus lors de récessions sectorielles. Un acquéreur considérera cette concentration sectorielle comme un facteur de risque systémique, réduisant la diversification du portefeuille et limitant la résilience de l'entreprise. Cette dépendance sectorielle impacte la valorisation en augmentant la volatilité des revenus et en réduisant la capacité de l'entreprise à résister aux cycles économiques défavorables.",
    recommendation: "Diversifier le portefeuille clients en ciblant d'autres secteurs d'activité pour réduire la dépendance sectorielle. Développer une stratégie commerciale pour élargir la base client dans différents secteurs et réduire l'exposition aux cycles économiques d'un seul secteur.",
    level: null,
  },

  // FOURNISSEURS
  {
    id: "supplier-concentration",
    category: "Fournisseurs",
    name: "Concentration fournisseurs",
    description: "Dépendance importante envers un fournisseur principal ou un nombre limité de fournisseurs (top 3)",
    impact: "Ce risque expose l'entreprise à une interruption potentielle de l'approvisionnement et à une augmentation des coûts si les fournisseurs modifient leurs conditions, compromettant la continuité opérationnelle et la rentabilité. Un acquéreur percevra cette dépendance comme un point de vulnérabilité critique dans la chaîne d'approvisionnement, créant une incertitude sur la capacité de l'entreprise à maintenir ses opérations et à s'adapter aux changements du marché. Cette dépendance impacte la valorisation en réduisant la flexibilité opérationnelle, en limitant la résilience de la chaîne d'approvisionnement et en augmentant les risques de perturbation des activités.",
    recommendation: "Identifier et qualifier des fournisseurs alternatifs pour réduire la dépendance. Diversifier le portefeuille fournisseurs et qualifier des fournisseurs de secours pour les matières critiques afin d'assurer la continuité des approvisionnements. Négocier des contrats d'approvisionnement avec clauses de protection pour sécuriser les relations commerciales.",
    level: null,
  },
  {
    id: "supplier-single-source",
    category: "Fournisseurs",
    name: "Fournisseur unique pour produits/services critiques",
    description: "Dépendance à un fournisseur unique pour des produits ou services essentiels",
    impact: "Ce risque représente une menace critique pour la continuité d'activité, créant une dépendance totale qui peut paralyser complètement les opérations en cas de défaillance du fournisseur unique. Un acquéreur considérera ce risque comme extrêmement pénalisant, car il compromet la viabilité même de l'entreprise et crée une vulnérabilité opérationnelle majeure. Cette dépendance critique impacte significativement la valorisation en réduisant drastiquement l'attractivité de l'investissement et en augmentant considérablement le risque perçu.",
    recommendation: "Urgence: identifier et qualifier au minimum un fournisseur alternatif. Négocier des contrats avec clauses de continuité. Documenter les processus de qualification des fournisseurs alternatifs.",
    level: null,
  },
  {
    id: "supplier-geographic-concentration",
    category: "Fournisseurs",
    name: "Concentration géographique des fournisseurs",
    description: "Concentration des fournisseurs dans une région géographique limitée",
    impact: "Ce risque expose l'entreprise à une vulnérabilité accrue face aux risques géopolitiques, catastrophes naturelles ou perturbations logistiques, créant une dépendance géographique qui peut compromettre la continuité des approvisionnements. Un acquéreur percevra cette concentration géographique comme un facteur de risque systémique, réduisant la résilience de la chaîne d'approvisionnement. Cette dépendance impacte la valorisation en augmentant l'exposition aux risques externes et en limitant la capacité de l'entreprise à maintenir ses opérations en cas de perturbation régionale.",
    recommendation: "Diversifier géographiquement le portefeuille fournisseurs. Établir des relations avec des fournisseurs dans différentes régions pour réduire les risques.",
    level: null,
  },

  // RH
  {
    id: "key-employee-dependency",
    category: "RH",
    name: "Dépendance aux employés clés",
    description: "Dépendance critique envers un ou plusieurs employés clés",
    impact: "Ce risque expose l'entreprise à une perte critique de connaissances, de relations et de capacités opérationnelles si un employé clé quitte l'organisation, compromettant la continuité des opérations et le développement. Un acquéreur considérera cette dépendance comme un signe de fragilité organisationnelle et de risque de perte de valeur en cas de départ, réduisant la confiance dans la pérennité de l'entreprise. Cette dépendance impacte significativement la valorisation en créant une incertitude sur la capacité de l'entreprise à maintenir ses performances sans ces personnes clés.",
    recommendation: "Documenter tous les processus critiques. Mettre en place des plans de succession. Former des remplaçants potentiels. Négocier des clauses de non-concurrence et de rétention avec les employés clés.",
    level: null,
  },
  {
    id: "founder-dependency",
    category: "RH",
    name: "Dépendance envers le fondateur/dirigeant",
    description: "L'entreprise dépend fortement du fondateur ou dirigeant principal",
    impact: "Ce risque représente une menace critique pour la continuité de l'entreprise, créant une dépendance totale qui compromet la viabilité de l'organisation en cas d'absence du fondateur ou dirigeant. Un acquéreur considérera ce risque comme extrêmement pénalisant, car il crée une incertitude majeure sur la capacité de l'entreprise à fonctionner sans cette personne, rendant difficile le transfert des relations et connaissances essentielles. Cette dépendance impacte drastiquement la valorisation en réduisant considérablement l'attractivité de l'investissement et en créant un risque de perte de valeur importante.",
    recommendation: "Déléguer progressivement les responsabilités critiques. Documenter les relations clients et processus. Mettre en place une équipe de direction solide. Planifier une transition progressive.",
    level: null,
  },
  {
    id: "employee-turnover",
    category: "RH",
    name: "Taux de roulement du personnel",
    description: "Taux de roulement élevé du personnel",
    impact: "Ce risque génère des coûts récurrents de recrutement et de formation, tout en provoquant une perte continue de connaissances organisationnelles, compromettant la productivité et l'efficacité opérationnelle. Un acquéreur considérera ce roulement élevé comme un signe de problèmes organisationnels sous-jacents, réduisant la confiance dans la stabilité de l'entreprise et sa capacité à retenir les talents. Ce roulement impacte la valorisation en augmentant les coûts opérationnels, en réduisant la productivité et en créant une instabilité organisationnelle.",
    recommendation: "Analyser les causes du roulement. Améliorer les conditions de travail, la rémunération et les avantages sociaux. Mettre en place des programmes de rétention et de développement de carrière.",
    level: null,
  },
  {
    id: "hiring-personnel",
    category: "RH",
    name: "Embauche du personnel",
    description: "Difficultés à recruter et embaucher du personnel qualifié",
    impact: "Ce risque expose l'entreprise à des difficultés pour recruter et embaucher du personnel qualifié, compromettant la capacité de croissance et la qualité des opérations en raison d'un manque de ressources humaines compétentes. Un acquéreur percevra ces difficultés de recrutement comme un facteur limitant le potentiel de croissance et créant une dépendance aux employés existants, réduisant la confiance dans la capacité de l'entreprise à se développer et à maintenir ses standards de qualité. Ces difficultés impactent la valorisation en limitant le potentiel de croissance et en créant une incertitude sur la capacité de l'entreprise à répondre à la demande croissante.",
    recommendation: "Développer une marque employeur attractive. Améliorer les processus de recrutement et de sélection. Offrir des conditions de travail compétitives et des opportunités de développement. Mettre en place des programmes de formation et de développement des compétences.",
    level: null,
  },

  // FINANCEMENT
  {
    id: "debt-level",
    category: "Financement",
    name: "Niveau d'endettement",
    description: "Niveau d'endettement élevé par rapport aux actifs ou aux flux de trésorerie",
    impact: "Ce risque crée un risque financier élevé et impose des contraintes significatives sur les opérations, compromettant la flexibilité stratégique et la capacité de l'entreprise à investir dans la croissance. Un acquéreur considérera ce niveau d'endettement comme un facteur de risque financier majeur, réduisant la marge de manœuvre opérationnelle et créant une dépendance aux créanciers. Cet endettement impacte négativement la valorisation en augmentant le risque financier perçu et en limitant la capacité de l'entreprise à générer de la valeur pour les actionnaires.",
    recommendation: "Réduire progressivement l'endettement. Optimiser la structure du capital. Renégocier les conditions de dette si possible.",
    level: null,
  },
  {
    id: "interest-rate-sensitivity",
    category: "Financement",
    name: "Sensibilité aux taux d'intérêt",
    description: "Exposition importante aux variations des taux d'intérêt",
    impact: "Ce risque expose l'entreprise à une vulnérabilité accrue face aux variations des taux d'intérêt, compromettant la rentabilité et la prévisibilité des coûts financiers en cas de hausse des taux. Un acquéreur percevra cette sensibilité comme un facteur de risque financier, créant une incertitude sur la capacité de l'entreprise à maintenir sa rentabilité dans un environnement de taux plus élevés. Cette sensibilité impacte la valorisation en augmentant l'exposition aux risques de marché et en réduisant la prévisibilité des résultats financiers.",
    recommendation: "Considérer le refinancement à taux fixe. Utiliser des instruments de couverture si approprié. Réduire l'endettement à taux variable.",
    level: null,
  },
  {
    id: "working-capital-requirements",
    category: "Financement",
    name: "Besoins élevés en fonds de roulement",
    description: "Besoins importants en fonds de roulement pour les opérations",
    impact: "Ce risque crée des contraintes importantes sur la trésorerie et nécessite un financement supplémentaire, compromettant la flexibilité financière et la capacité de l'entreprise à gérer efficacement son cycle d'exploitation. Un acquéreur considérera ces besoins élevés comme un facteur limitant la génération de trésorerie libre et créant une dépendance au financement externe. Ces besoins impactent la valorisation en réduisant la capacité de l'entreprise à générer de la trésorerie disponible et en augmentant les besoins de financement.",
    recommendation: "Optimiser la gestion du fonds de roulement. Négocier de meilleures conditions avec clients et fournisseurs. Mettre en place des outils de prévision de trésorerie.",
    level: null,
  },
  {
    id: "access-to-capital",
    category: "Financement",
    name: "Accès limité au capital",
    description: "Difficultés d'accès au financement ou au capital",
    impact: "Ce risque crée des contraintes significatives sur la croissance et les investissements, compromettant le potentiel de développement de l'entreprise et sa capacité à saisir les opportunités de marché. Un acquéreur percevra cet accès limité comme un facteur limitant le potentiel de croissance et réduisant l'attractivité de l'investissement, particulièrement pour les investisseurs cherchant des opportunités de croissance. Cette limitation impacte la valorisation en réduisant le potentiel de croissance perçu et en créant une incertitude sur la capacité de l'entreprise à se développer.",
    recommendation: "Diversifier les sources de financement. Améliorer les ratios financiers. Développer des relations avec plusieurs institutions financières.",
    level: null,
  },

  // OPERATIONS
  {
    id: "technology-dependency",
    category: "Opérations",
    name: "Retard technologique",
    description: "Systèmes ou technologies obsolètes ou non à jour, nécessitant des investissements importants pour se moderniser",
    impact: "Ce risque expose l'entreprise à une inefficacité opérationnelle et à un manque de compétitivité en raison de systèmes technologiques obsolètes, compromettant l'efficacité, la clarté financière, la clarté des opérations et l'optimisation interne. Un acquéreur considérera ce retard technologique comme un facteur nécessitant des investissements massifs pour se mettre à jour, créant une incertitude sur les coûts de modernisation et la capacité de l'entreprise à maintenir sa compétitivité. Ce retard impacte significativement la valorisation en nécessitant des investissements technologiques importants qui réduisent la valeur nette de l'entreprise et en créant une perception de risque opérationnel accru.",
    recommendation: "Évaluer l'état actuel des systèmes technologiques. Élaborer un plan de modernisation technologique avec des investissements progressifs. Prioriser les systèmes critiques pour l'efficacité opérationnelle, la clarté financière et l'optimisation interne. Considérer des solutions cloud et des technologies modernes pour améliorer la compétitivité.",
    level: null,
  },
  {
    id: "facility-dependency",
    category: "Opérations",
    name: "Localisation et durée du bail",
    description: "Localisation sous-optimale ou bail avec une échéance courte, créant une incertitude sur la continuité opérationnelle",
    impact: "Ce risque expose l'entreprise à une incertitude majeure sur la continuité opérationnelle en raison d'une localisation défavorable ou d'un bail à échéance courte. Une mauvaise localisation compromet l'accessibilité, la visibilité et l'efficacité opérationnelle, tandis qu'un bail à échéance courte crée une incertitude sur la capacité de l'entreprise à maintenir ses opérations à long terme. Un acquéreur considérera une échéance de bail courte comme un facteur de risque significatif, car elle nécessite une renégociation ou un déménagement potentiel, créant une incertitude sur les coûts futurs et la continuité. Plus l'échéance est courte, plus le risque est élevé pour l'acquéreur. Cette situation impacte significativement la valorisation en créant une incertitude sur la pérennité des opérations et en nécessitant potentiellement des investissements importants pour un déménagement ou une renégociation de bail.",
    recommendation: "Négocier des baux à long terme avec des clauses de renouvellement favorables. Évaluer la qualité de la localisation en termes d'accessibilité, visibilité et efficacité opérationnelle. Planifier à l'avance les renégociations de bail. Considérer des alternatives de localisation si la situation actuelle est sous-optimale.",
    level: null,
  },
  {
    id: "regulatory-compliance",
    category: "Autres risques",
    name: "Conformité réglementaire",
    description: "Risques liés à la conformité réglementaire",
    impact: "Ce risque expose l'entreprise à des sanctions, amendes ou perte de permis, compromettant la légalité des opérations et créant un risque réglementaire majeur. Un acquéreur considérera ce risque comme extrêmement pénalisant, car il peut compromettre la viabilité même de l'entreprise et créer une responsabilité légale significative. Ce risque impacte drastiquement la valorisation en réduisant considérablement l'attractivité de l'investissement et en créant une incertitude majeure sur la continuité des opérations.",
    recommendation: "Mettre en place un programme de conformité robuste. Effectuer des audits réguliers. Documenter tous les processus de conformité. Former le personnel.",
    level: null,
  },
  {
    id: "intellectual-property",
    category: "Opérations",
    name: "Protection de la propriété intellectuelle",
    description: "Manque de protection ou risques liés à la propriété intellectuelle",
    impact: "Ce risque expose l'entreprise à une perte potentielle d'avantage concurrentiel, compromettant la différenciation et la valeur unique de l'entreprise sur le marché. Un acquéreur considérera ce manque de protection comme un facteur réduisant la valeur stratégique de l'entreprise et créant une vulnérabilité face à la concurrence. Cette faiblesse impacte la valorisation en réduisant la valeur des actifs intangibles et en limitant la capacité de l'entreprise à maintenir son avantage concurrentiel.",
    recommendation: "Protéger les actifs de propriété intellectuelle (brevets, marques, droits d'auteur). Documenter les développements. Mettre en place des accords de confidentialité.",
    level: null,
  },

  // MARCHE
  {
    id: "market-competition",
    category: "Marché",
    name: "Intensité de la concurrence",
    description: "Concurrence intense sur le marché",
    impact: "Ce risque crée une pression accrue sur les marges et expose l'entreprise à une perte potentielle de parts de marché, compromettant la rentabilité et la position concurrentielle. Un acquéreur percevra cette intensité concurrentielle comme un facteur de risque de marché, réduisant la confiance dans la capacité de l'entreprise à maintenir sa position et sa rentabilité à long terme. Cette pression impacte la valorisation en augmentant l'incertitude sur la stabilité des marges et en réduisant la prévisibilité des résultats.",
    recommendation: "Développer des avantages concurrentiels durables. Différencier l'offre. Investir dans l'innovation et le service client.",
    level: null,
  },
  {
    id: "market-concentration",
    category: "Marché",
    name: "Concentration du marché",
    description: "Marché dominé par quelques acteurs majeurs",
    impact: "Ce risque expose l'entreprise à un pouvoir de marché accru des concurrents dominants, compromettant la capacité de l'entreprise à négocier et à maintenir sa position sur le marché. Un acquéreur considérera cette concentration comme un facteur limitant le potentiel de croissance et créant une dépendance aux dynamiques de marché contrôlées par les acteurs majeurs. Cette situation impacte la valorisation en réduisant le potentiel de développement et en augmentant la vulnérabilité face aux décisions des concurrents dominants.",
    recommendation: "Se positionner dans des niches. Développer des relations clients solides. Investir dans l'innovation pour se différencier.",
    level: null,
  },
  {
    id: "barriers-to-entry",
    category: "Marché",
    name: "Barrières à l'entrée",
    description: "Barrières à l'entrée faibles sur le marché",
    impact: "Ce risque expose l'entreprise à une entrée facilitée de nouveaux concurrents, compromettant la position de marché et créant une pression concurrentielle accrue qui peut éroder les marges et les parts de marché. Un acquéreur percevra ces barrières faibles comme un facteur de risque de marché, réduisant la confiance dans la capacité de l'entreprise à maintenir sa position compétitive à long terme. Cette faiblesse impacte la valorisation en augmentant l'incertitude sur la durabilité de l'avantage concurrentiel et en réduisant la prévisibilité des résultats futurs.",
    recommendation: "Renforcer les barrières à l'entrée (marque, relations clients, technologie, économies d'échelle). Développer des avantages compétitifs durables.",
    level: null,
  },
  {
    id: "product-lifecycle",
    category: "Marché",
    name: "Cycle de vie des produits",
    description: "Produits en fin de cycle de vie ou manque d'innovation",
    impact: "Ce risque expose l'entreprise à un déclin potentiel des revenus en raison de produits en fin de cycle de vie ou d'un manque d'innovation, compromettant la pérennité de l'entreprise et sa capacité à maintenir sa position sur le marché. Un acquéreur considérera ce manque d'innovation comme un facteur de risque majeur, réduisant significativement la confiance dans la capacité de l'entreprise à maintenir sa compétitivité et sa croissance à long terme. Ce risque impacte drastiquement la valorisation en créant une incertitude majeure sur la pérennité des revenus futurs et en réduisant l'attractivité de l'investissement.",
    recommendation: "Investir dans la R&D et l'innovation. Développer de nouveaux produits/services. Planifier le renouvellement de l'offre.",
    level: null,
  },
  {
    id: "revenue-seasonality",
    category: "Marché",
    name: "Saisonnalité des revenus",
    description: "Variations saisonnières importantes des revenus",
    impact: "Ce risque crée des variations importantes de trésorerie et complique la planification financière, compromettant la stabilité opérationnelle et la capacité de l'entreprise à gérer efficacement ses ressources. Un acquéreur percevra cette saisonnalité comme un facteur de complexité dans la gestion et la prévisibilité des revenus, nécessitant une analyse plus approfondie et potentiellement des ajustements dans l'évaluation. Cette saisonnalité impacte la valorisation en augmentant la complexité d'évaluation et en créant une incertitude sur la stabilité des flux de trésorerie.",
    recommendation: "Développer des produits/services complémentaires pour lisser les revenus. Mettre en place une gestion de trésorerie proactive. Négocier des facilités de crédit pour les périodes creuses.",
    level: null,
  },
  {
    id: "economic-cycle-sensitivity",
    category: "Marché",
    name: "Sensibilité aux cycles économiques",
    description: "L'entreprise est fortement affectée par les cycles économiques",
    impact: "Ce risque expose l'entreprise à une vulnérabilité accrue face aux récessions économiques, compromettant la stabilité des revenus et la rentabilité lors des cycles économiques défavorables. Un acquéreur considérera cette sensibilité comme un facteur de risque systémique, réduisant la résilience de l'entreprise et créant une incertitude sur sa capacité à résister aux downturns économiques. Cette sensibilité impacte la valorisation en augmentant la volatilité perçue des revenus et en réduisant la confiance dans la stabilité à long terme de l'entreprise.",
    recommendation: "Diversifier les sources de revenus. Développer des produits/services moins sensibles aux cycles. Maintenir une structure de coûts flexible.",
    level: null,
  },

  // AUTRES RISQUES
  {
    id: "litigation-risks",
    category: "Autres risques",
    name: "Risques de litiges",
    description: "Litiges en cours ou risques de litiges",
    impact: "Ce risque expose l'entreprise à des coûts juridiques significatifs, crée une incertitude majeure et peut impacter négativement la réputation, compromettant la stabilité financière et l'image de l'entreprise. Un acquéreur considérera ces litiges comme un facteur de risque majeur, créant une responsabilité potentielle et réduisant la confiance dans la qualité de la gestion et la conformité de l'entreprise. Ce risque impacte significativement la valorisation en créant une incertitude sur les responsabilités futures et en réduisant l'attractivité de l'investissement.",
    recommendation: "Résoudre les litiges en cours rapidement. Mettre en place des processus pour éviter les futurs litiges. Souscrire des assurances appropriées.",
    level: null,
  },
  {
    id: "environmental-risks",
    category: "Autres risques",
    name: "Risques environnementaux",
    description: "Risques liés à l'environnement ou responsabilité environnementale",
    impact: "Ce risque expose l'entreprise à des coûts potentiels de remédiation environnementale, crée une responsabilité légale significative et peut impacter négativement la réputation, compromettant la viabilité financière et l'image de l'entreprise. Un acquéreur considérera ce risque environnemental comme extrêmement pénalisant, car il peut créer des responsabilités à long terme et des coûts imprévisibles qui affectent directement la valeur de l'entreprise. Ce risque impacte drastiquement la valorisation en créant une incertitude majeure sur les responsabilités futures et en réduisant considérablement l'attractivité de l'investissement.",
    recommendation: "Mettre en place des programmes de conformité environnementale. Effectuer des audits environnementaux. Souscrire des assurances de responsabilité environnementale.",
    level: null,
  },
]
