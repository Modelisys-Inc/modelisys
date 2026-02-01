"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Filter, AlertTriangle, Info, Target, Shield, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"


interface BusinessRisk {
  id: string
  category: string
  name: string
  description: string
  impact: string
  recommendation: string
  level: "low" | "medium" | "high" | null
  note?: string
}

const evaluationNav = [
  { label: "Modèle d'affaires", href: "/evaluation/business-model" },
  { label: "Multiple du BAIIA", href: "/evaluation/ebitda-multiple" },
]

export default function BusinessModelPage() {
  const { companies: companiesData } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editingNoteRiskId, setEditingNoteRiskId] = useState<string | null>(null)
  const [tempNote, setTempNote] = useState<string>("")
  const pathname = usePathname()

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const [risks, setRisks] = useState<BusinessRisk[]>([
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
  ])

  const updateRiskLevel = (riskId: string, level: "low" | "medium" | "high" | null) => {
    const updatedRisks = risks.map(risk => 
      risk.id === riskId ? { ...risk, level } : risk
    )
    setRisks(updatedRisks)
    // Save to localStorage
    const riskLevels = updatedRisks.reduce((acc, risk) => {
      acc[risk.id] = risk.level
      return acc
    }, {} as Record<string, string | null>)
    localStorage.setItem("businessRiskLevels", JSON.stringify(riskLevels))
  }

  const updateRiskNote = (riskId: string, note: string) => {
    const updatedRisks = risks.map(risk => 
      risk.id === riskId ? { ...risk, note: note.trim() || undefined } : risk
    )
    setRisks(updatedRisks)
    // Save to localStorage (only non-empty notes)
    const riskNotes = updatedRisks.reduce((acc, risk) => {
      if (risk.note && risk.note.trim()) {
        acc[risk.id] = risk.note
      }
      return acc
    }, {} as Record<string, string>)
    localStorage.setItem("businessRiskNotes", JSON.stringify(riskNotes))
  }

  const openNoteModal = (riskId: string) => {
    const risk = risks.find(r => r.id === riskId)
    setTempNote(risk?.note || "")
    setEditingNoteRiskId(riskId)
    setNoteModalOpen(true)
  }

  const saveNote = () => {
    if (editingNoteRiskId) {
      updateRiskNote(editingNoteRiskId, tempNote)
      setNoteModalOpen(false)
      setEditingNoteRiskId(null)
      setTempNote("")
    }
  }

  const closeNoteModal = () => {
    setNoteModalOpen(false)
    setEditingNoteRiskId(null)
    setTempNote("")
  }

  // Load risk notes and levels from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("businessRiskNotes")
    const savedLevels = localStorage.getItem("businessRiskLevels")
    
    if (savedNotes || savedLevels) {
      const notes = savedNotes ? JSON.parse(savedNotes) : {}
      const levels = savedLevels ? JSON.parse(savedLevels) : {}
      
      setRisks(prevRisks => prevRisks.map(risk => ({
        ...risk,
        note: notes[risk.id] !== undefined ? notes[risk.id] : risk.note,
        level: levels[risk.id] !== undefined ? levels[risk.id] : risk.level
      })))
    }
  }, [])

  // Group risks by category
  const risksByCategory = risks.reduce((acc, risk) => {
    if (!acc[risk.category]) {
      acc[risk.category] = []
    }
    acc[risk.category].push(risk)
    return acc
  }, {} as Record<string, BusinessRisk[]>)

  // Get unique categories
  const riskCategories = Object.keys(risksByCategory)
  
  // Add "Sommaire" as the first category
  const categories = ["Sommaire", ...riskCategories]
  
  // Initialize selected category on first render
  useEffect(() => {
    if (selectedCategory === null && categories.length > 0) {
      setSelectedCategory("Sommaire")
    }
  }, [categories.length, selectedCategory])
  
  // Use effective selected category (fallback to "Sommaire" if none selected)
  const effectiveSelectedCategory = selectedCategory || "Sommaire"

  const getRiskColor = (level: string | null) => {
    switch (level) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200"
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-200"
      case "low":
        return "text-emerald-600 bg-emerald-50 border-emerald-200"
      default:
        return "text-slate-600 bg-slate-50 border-slate-200"
    }
  }

  const getRiskIcon = (level: string | null) => {
    switch (level) {
      case "high":
        return <AlertTriangle className="w-5 h-5" />
      case "medium":
        return <AlertCircle className="w-5 h-5" />
      case "low":
        return <CheckCircle2 className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  // Calculate summary statistics
  const highRisks = risks.filter(r => r.level === "high").length
  const mediumRisks = risks.filter(r => r.level === "medium").length
  const lowRisks = risks.filter(r => r.level === "low").length
  const unassessedRisks = risks.filter(r => r.level === null).length

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">Modèle d'affaires</h2>
              <p className="text-base text-slate-300 mb-6">
                Évaluez les risques de votre modèle d'affaires et identifiez les améliorations pour optimiser votre multiple de valorisation
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                Analysez en profondeur votre modèle d'affaires pour identifier les facteurs de risque qui influencent négativement votre valorisation. 
                Évaluez chaque aspect de votre entreprise et obtenez des recommandations stratégiques pour optimiser votre multiple de valorisation 
                et maximiser la création de valeur.
              </p>
              {/* Navigation Menu - Style like income-statement page */}
              <div className="flex items-end gap-8 mb-2">
                {evaluationNav.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative pb-4 border-b border-slate-600/30"
                    >
                      <span
                        className={`text-sm font-normal transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Icon */}
              <div className="flex items-center gap-2 text-slate-300">
                <Filter className="w-4 h-4" />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companiesData}
                  selectedCompanyId={companyId}
                  selectedDivisionId={divisionId}
                  selectedSubDivisionId={subDivisionId}
                  onCompanyChange={setCompanyId}
                  onDivisionChange={setDivisionId}
                  onSubDivisionChange={setSubDivisionId}
                />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Category Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Catégorie de risque:</span>
                <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800/50 p-1">
                  {categories.map((category) => {
                    const isActive = effectiveSelectedCategory === category
                    return (
                      <Button
                        key={category}
                        variant="ghost"
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          "h-8 text-xs px-3 transition-all",
                          isActive
                            ? "bg-emerald-500 text-white font-medium shadow-sm"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                        )}
                      >
                        {category}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">

        {/* Summary Card - Only show when "Sommaire" is selected */}
        {effectiveSelectedCategory === "Sommaire" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-white px-8 py-8 border-b border-slate-200">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
                    Résumé de l'évaluation des risques
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                    Évaluez les risques de votre modèle d'affaires et identifiez les améliorations pour optimiser votre multiple de valorisation
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 bg-gradient-to-b from-slate-50 to-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Risques élevés */}
              <div className="group relative bg-white rounded-xl border-2 border-red-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-bl-full opacity-50"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full">
                      Critique
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-red-600 mb-2">{highRisks}</div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">Risques élevés</div>
                  <div className="text-xs text-slate-500">Action prioritaire requise</div>
                </div>
              </div>

              {/* Risques modérés */}
              <div className="group relative bg-white rounded-xl border-2 border-amber-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100 rounded-bl-full opacity-50"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full">
                      Attention
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-amber-600 mb-2">{mediumRisks}</div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">Risques modérés</div>
                  <div className="text-xs text-slate-500">Surveillance recommandée</div>
                </div>
              </div>

              {/* Risques faibles */}
              <div className="group relative bg-white rounded-xl border-2 border-emerald-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-bl-full opacity-50"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-100 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
                      Acceptable
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-emerald-600 mb-2">{lowRisks}</div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">Risques faibles</div>
                  <div className="text-xs text-slate-500">Situation sous contrôle</div>
                </div>
              </div>

              {/* Non évalués */}
              <div className="group relative bg-white rounded-xl border-2 border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 rounded-bl-full opacity-50"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-slate-100 rounded-lg">
                      <Info className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-full">
                      En attente
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-slate-600 mb-2">{unassessedRisks}</div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">Non évalués</div>
                  <div className="text-xs text-slate-500">Évaluation requise</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {risks.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Progression de l'évaluation</span>
                  <span className="text-sm font-bold text-slate-900">
                    {Math.round(((risks.length - unassessedRisks) / risks.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-slate-400 rounded-full transition-all duration-500"
                    style={{ width: `${((risks.length - unassessedRisks) / risks.length) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>{risks.length - unassessedRisks} risques évalués</span>
                  <span>{unassessedRisks} risques restants</span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Risks by Category - Show only when a risk category (not "Sommaire") is selected */}
        {effectiveSelectedCategory !== "Sommaire" && (
        <div className="space-y-6">
          {effectiveSelectedCategory && risksByCategory[effectiveSelectedCategory] && (() => {
            const category = effectiveSelectedCategory
            const categoryRisks = risksByCategory[category]
            const isExpanded = expandedCategories[category] !== false // Default to true (expanded)
            
            // Calculate category statistics
            const categoryHighRisks = categoryRisks.filter(r => r.level === "high").length
            const categoryMediumRisks = categoryRisks.filter(r => r.level === "medium").length
            const categoryLowRisks = categoryRisks.filter(r => r.level === "low").length
            const categoryUnassessed = categoryRisks.filter(r => r.level === null).length
            
            return (
              <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                {/* Category Header */}
                <div className="bg-white border-b border-slate-200">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-8 py-6 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 text-left">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-1">
                          {category}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="font-medium">{categoryRisks.length} risque{categoryRisks.length > 1 ? 's' : ''}</span>
                          {categoryHighRisks > 0 && (
                            <span className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span className="text-red-600 font-semibold">{categoryHighRisks} élevé{categoryHighRisks > 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {categoryMediumRisks > 0 && (
                            <span className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <span className="text-amber-600 font-semibold">{categoryMediumRisks} modéré{categoryMediumRisks > 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {categoryLowRisks > 0 && (
                            <span className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="text-emerald-600 font-semibold">{categoryLowRisks} faible{categoryLowRisks > 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {categoryUnassessed > 0 && (
                            <span className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                              <span className="text-slate-500">{categoryUnassessed} non évalué{categoryUnassessed > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Risks List */}
                {isExpanded && (
                  <div className="p-8 bg-gradient-to-b from-white to-slate-50">
                    <div className="space-y-6">
                      {categoryRisks.map((risk, idx) => (
                        <div
                          key={risk.id}
                          className={cn(
                            "group relative bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-lg",
                            risk.level === "high" ? "border-red-200 hover:border-red-300" :
                            risk.level === "medium" ? "border-amber-200 hover:border-amber-300" :
                            risk.level === "low" ? "border-emerald-200 hover:border-emerald-300" :
                            "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {/* Decorative corner */}
                          <div className={cn(
                            "absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-20",
                            risk.level === "high" ? "bg-red-100" :
                            risk.level === "medium" ? "bg-amber-100" :
                            risk.level === "low" ? "bg-emerald-100" :
                            "bg-slate-100"
                          )}></div>

                          <div className="relative p-6">
                            {/* Risk Header */}
                            <div className="flex items-start justify-between gap-6 mb-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-4 mb-3">
                                  <div className={cn(
                                    "p-3 rounded-xl shadow-sm",
                                    risk.level === "high" ? "bg-red-100" :
                                    risk.level === "medium" ? "bg-amber-100" :
                                    risk.level === "low" ? "bg-emerald-100" :
                                    "bg-slate-100"
                                  )}>
                                    {getRiskIcon(risk.level)}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{risk.name}</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{risk.description}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Risk Level Selector */}
                              <div className="flex-shrink-0 w-56">
                                <label className="text-xs font-semibold text-slate-700 mb-2 block">
                                  Niveau de risque
                                </label>
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={risk.level || ""}
                                    onValueChange={(value) => updateRiskLevel(risk.id, value as "low" | "medium" | "high" | null)}
                                  >
                                    <SelectTrigger className={cn(
                                      "flex-1 h-11 font-medium",
                                      risk.level === "high" ? "border-red-300 focus:border-red-500" :
                                      risk.level === "medium" ? "border-amber-300 focus:border-amber-500" :
                                      risk.level === "low" ? "border-emerald-300 focus:border-emerald-500" :
                                      ""
                                    )}>
                                      <SelectValue placeholder="Sélectionner un niveau" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="high">Élevé</SelectItem>
                                      <SelectItem value="medium">Modéré</SelectItem>
                                      <SelectItem value="low">Faible</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <button
                                    onClick={() => openNoteModal(risk.id)}
                                    className={cn(
                                      "flex-shrink-0 p-1.5 rounded-md transition-colors",
                                      risk.note
                                        ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    )}
                                    title={risk.note ? "Voir/Modifier la note explicative" : "Ajouter une note explicative"}
                                  >
                                    <StickyNote className={cn("w-4 h-4", risk.note && "fill-current")} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Impact and Recommendation */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Impact Card */}
                              <div className="relative p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 mb-2">Impact sur la valorisation</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{risk.impact}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Recommendation Card */}
                              <div className="relative p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                    <Target className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 mb-2">Recommandation</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{risk.recommendation}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        )}

        {/* Action Plan Summary - Only show when "Sommaire" is selected */}
        {effectiveSelectedCategory === "Sommaire" && highRisks > 0 && (
          <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 shadow-lg mt-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-600">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Plan d'action prioritaire</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Vous avez identifié <strong>{highRisks} risque(s) élevé(s)</strong>. Il est recommandé de prioriser 
                l'action sur ces risques car ils ont le plus grand impact négatif sur votre multiple de valorisation.
              </p>
              <div className="space-y-2">
                {risks
                  .filter(r => r.level === "high")
                  .map((risk, idx) => (
                    <div key={risk.id} className="p-3 bg-white rounded-lg border border-red-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 mb-1">{risk.name}</p>
                          <p className="text-sm text-slate-600">{risk.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note Modal */}
        <Dialog open={noteModalOpen} onOpenChange={(open) => {
          if (!open) {
            closeNoteModal()
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingNoteRiskId && (() => {
                  const risk = risks.find(r => r.id === editingNoteRiskId)
                  return risk ? `Note explicative - ${risk.name}` : "Note explicative"
                })()}
              </DialogTitle>
              <DialogDescription>
                Expliquez pourquoi ce risque est faible, modéré ou élevé. Décrivez les raisons justifiant le niveau de risque sélectionné.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Textarea
                placeholder="Ex: Ce risque est modéré car nous avons plusieurs clients alternatifs, mais la perte du client principal représenterait une baisse significative des revenus..."
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                className="min-h-[200px] text-sm"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={closeNoteModal}
              >
                Annuler
              </Button>
              <Button
                onClick={saveNote}
              >
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  )
}
