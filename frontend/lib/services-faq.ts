import type { ServicesPagePillarId } from "@/lib/services-page-content"

export type ServiceFaqItem = {
  question: string
  answer: string
}

export const SERVICES_FAQ: Record<ServicesPagePillarId, readonly ServiceFaqItem[]> = {
  accompagnement: [
    {
      question: "En quoi l’accompagnement financier est-il innovant ?",
      answer:
        "Il est conçu pour augmenter la valeur de l’entreprise. Chaque lecture financière — performance, trésorerie, projections — est ramenée à ce qu’elle fait à la valeur, pour que les décisions portent sur ce qui la crée vraiment.",
    },
    {
      question: "Faut-il recruter un directeur financier à temps plein ?",
      answer:
        "Pas nécessairement. L’accompagnement n’est pas un directeur financier à temps plein : nous n’assumons pas toute la fonction. Nous intervenons sur les aspects financiers clés — ceux qui éclairent le rendement et la valeur — pendant que la direction garde la décision.",
    },
    {
      question: "Que comprend concrètement l’accompagnement ?",
      answer:
        "Cela dépend des besoins. Pour certaines entreprises, l’accompagnement couvre toute la chaîne. Pour d’autres, la tenue de livres et le contrôle financier sont déjà en place : on intervient alors sur la performance, les projections et la valorisation. Le périmètre se fixe au cadrage.",
    },
    {
      question: "À quel rythme travaillez-vous avec l’entreprise ?",
      answer:
        "Selon les besoins : souvent une rencontre par mois ou par trimestre. Le rythme se calibre avec vous — assez fréquent pour rattacher les écarts à la valeur, sans imposer une cadence unique à toutes les entreprises.",
    },
    {
      question: "Comment l’accompagnement augmente-t-il la valeur ?",
      answer:
        "En faisant comprendre les leviers qui l’augmentent, et en reliant chaque aspect financier à la valeur. Un écart, une projection ou une décision modélisée se lit alors comme une hausse ou une baisse de valeur — pas seulement comme un chiffre de résultat ou de trésorerie.",
    },
    {
      question: "Quels sont les livrables ?",
      answer:
        "Typiquement, une rencontre par mois ou par trimestre, avec des rapports de performance qui couvrent les résultats, le bilan, les flux de trésorerie, les projections et la valorisation. Le format et le rythme s’ajustent au périmètre retenu.",
    },
  ],
  licence: [
    {
      question: "Qu’est-ce que la licence Modelisys ?",
      answer:
        "Un moteur Excel configuré selon la structure financière de votre entreprise. Votre équipe y réalise analyses, projections, valorisation et suivis — dans un fichier structuré, pas dans une collection de classeurs.",
    },
    {
      question: "Faut-il quitter Excel ?",
      answer:
        "Non. Le moteur reste dans Excel. On structure ce que l’équipe utilise déjà, sans changer d’outil ni imposer une nouvelle plateforme.",
    },
    {
      question: "Qui fait vivre le moteur au quotidien ?",
      answer:
        "Votre équipe, après implantation et formation. La licence vise l’autonomie : l’interne alimente le fichier à son rythme de clôture, sans dépendre d’un intervenant externe à chaque mise à jour.",
    },
    {
      question: "Que se passe-t-il à l’implantation ?",
      answer:
        "Configuration selon votre plan comptable et vos processus, puis formation technique. Ensuite, l’équipe intègre le moteur à ses processus financiers.",
    },
    {
      question: "Licence Modelisys ou accompagnement financier ?",
      answer:
        "La licence convient si vous avez les ressources internes pour faire vivre le moteur. L’accompagnement convient si vous voulez un partenaire récurrent tourné vers le rendement et la valeur.",
    },
    {
      question: "La licence évolue-t-elle après la première année ?",
      answer:
        "Elle se renouvelle annuellement. Le moteur peut être ajusté selon l’évolution de l’entreprise — structure, indicateurs, analyses.",
    },
  ],
  developpement: [
    {
      question: "Quand le développement sur mesure s’impose-t-il ?",
      answer:
        "Quand le modèle standard ne couvre pas votre structure, vos données ou l’analyse dont vous avez besoin — fichier critique, processus encore manuel, ou besoin trop spécifique pour un moteur générique.",
    },
    {
      question: "Pouvez-vous développer un tableau de bord ?",
      answer:
        "Oui. Un tableau de bord de gestion branché sur vos données : indicateurs, leviers et lecture que la direction utilise vraiment — dans Excel, mis à jour au rythme de l’entreprise.",
    },
    {
      question: "Développez-vous un processus de coût de revient ?",
      answer:
        "Oui. Un processus de coût de revient (par produit, projet, mandat ou activité) pour que la marge soit calculée, pas estimée — et puisse alimenter le suivi mensuel.",
    },
    {
      question: "Pouvez-vous créer un outil de simulation et de scénarios ?",
      answer:
        "Oui. Un modèle pour comparer des hypothèses (croissance, coûts, investissement, financement) et voir l’impact sur le résultat, la trésorerie et la valeur — avant de s’engager.",
    },
    {
      question: "Le livrable reste-t-il dans Excel ?",
      answer:
        "Oui. Un fichier que l’équipe peut faire vivre, documenté, avec transfert. Le développement n’est pas un classeur que seul l’auteur comprend.",
    },
    {
      question: "Quelle est la différence avec la licence Modelisys ?",
      answer:
        "La licence pose le moteur standard Modelisys, prêt à l’emploi. Le développement part ailleurs : un classeur existant, un besoin que ce moteur ne porte pas, ou une analyse trop spécifique.",
    },
  ],
} as const

export function getServicesFaq(id: ServicesPagePillarId): readonly ServiceFaqItem[] {
  return SERVICES_FAQ[id]
}
