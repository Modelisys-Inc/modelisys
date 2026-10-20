/** Ajouter un quiz : un objet dans FINANCE_QUIZZES, puis son slug dans FINANCE_QUIZ_FAMILIES. */

export type FinanceQuizChoice = {
  id: string
  label: string
}

export type FinanceQuizQuestion = {
  id: string
  prompt: string
  choices: readonly FinanceQuizChoice[]
  correctId: string
  explanation: string
}

export type FinanceQuizBand = {
  minScore: number
  title: string
  body: string
}

export type FinanceQuiz = {
  slug: string
  title: string
  description: string
  duration: string
  questions: readonly FinanceQuizQuestion[]
  resultBands: readonly FinanceQuizBand[]
}

export const FINANCE_QUIZZES: readonly FinanceQuiz[] = [
  {
    slug: "lecture-de-la-valeur",
    title: "Lecture de la valeur",
    description:
      "Cinq questions pour voir si vos décisions sont déjà reliées à la valeur de votre entreprise.",
    duration: "3 min",
    questions: [
      {
        id: "quand",
        prompt: "Quand se construit surtout la valeur d’une entreprise ?",
        choices: [
          { id: "vente", label: "Au moment de la vendre" },
          { id: "mois", label: "Dans les décisions prises chaque mois" },
          { id: "croissance", label: "Dès que le chiffre d’affaires augmente" },
        ],
        correctId: "mois",
        explanation:
          "La vente révèle une valeur déjà construite. Embaucher, investir, financer et améliorer la rentabilité la font bouger bien avant.",
      },
      {
        id: "liquidites",
        prompt: "Une entreprise rentable peut-elle manquer de liquidités ?",
        choices: [
          { id: "non", label: "Non : un profit se retrouve en banque" },
          {
            id: "oui",
            label: "Oui : la croissance, le fonds de roulement et les investissements consomment de la trésorerie",
          },
          { id: "marge", label: "Seulement lorsqu’il n’y a plus de marge" },
        ],
        correctId: "oui",
        explanation:
          "Le profit et l’argent disponible ne bougent pas ensemble. Une croissance mal financée peut être rentable et tendue en même temps.",
      },
      {
        id: "fonds",
        prompt: "Qu’est-ce qui alourdit le plus souvent le fonds de roulement ?",
        choices: [
          { id: "clients", label: "Des clients qui paient plus vite" },
          {
            id: "stocks",
            label: "Des stocks et des comptes clients qui grossissent plus vite que le financement des fournisseurs",
          },
          { id: "baiia", label: "Une baisse du BAIIA" },
        ],
        correctId: "stocks",
        explanation:
          "L’argent reste coincé dans les stocks et les comptes à recevoir. Le BAIIA mesure la rentabilité, pas ce décalage de trésorerie.",
      },
      {
        id: "ecart",
        prompt: "Un revenu au-dessus du budget augmente-t-il toujours la valeur ?",
        choices: [
          { id: "oui", label: "Oui : plus de revenus veut dire plus de valeur" },
          {
            id: "non",
            label: "Non : il faut voir la marge, la trésorerie et le risque qui accompagnent cet écart",
          },
          { id: "multiple", label: "Oui, tant que le multiple de valorisation ne change pas" },
        ],
        correctId: "non",
        explanation:
          "Un revenu supplémentaire ne crée de la valeur que s’il laisse de la marge, qu’il se transforme en liquidités et qu’il n’augmente pas le risque.",
      },
      {
        id: "trop-tard",
        prompt: "Pourquoi attendre une vente pour comprendre sa valeur pose-t-il problème ?",
        choices: [
          { id: "acheteur", label: "Parce que l’évaluation n’est fiable qu’avec un acheteur" },
          {
            id: "tard",
            label: "Parce que les leviers se découvrent trop tard pour encore changer la trajectoire",
          },
          { id: "inexistante", label: "Parce que la valeur n’existe pas avant une transaction" },
        ],
        correctId: "tard",
        explanation:
          "La valeur existe avant la transaction. La découvrir seulement au moment de vendre ou de financer laisse passer des années d’ajustement.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous reliez déjà les décisions, la trésorerie et la valeur. L’accompagnement sert alors à tenir ce cap, mois après mois.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "La base est là. Quelques liens — marge, liquidités ou timing — restent encore flous au moment de décider.",
      },
      {
        minScore: 0,
        title: "La valeur reste floue",
        body: "Les chiffres sont là, mais le lien avec la valeur n’est pas encore une lecture de direction. C’est souvent là que l’accompagnement commence.",
      },
    ],
  },
  {
    slug: "revenus",
    title: "Revenus",
    description: "Cinq questions pour lire ce que le chiffre d’affaires dit vraiment — et ce qu’il ne dit pas.",
    duration: "3 min",
    questions: [
      {
        id: "encaisse",
        prompt: "Un revenu comptabilisé est-il déjà de l’argent encaissé ?",
        choices: [
          { id: "oui", label: "Oui : un revenu tombe en banque" },
          { id: "non", label: "Non : il peut être facturé et encore à recevoir" },
          { id: "recurrent", label: "Seulement lorsqu’il est récurrent" },
        ],
        correctId: "non",
        explanation:
          "Le revenu mesure ce qui a été gagné. L’argent n’est là que lorsque le client a payé. L’écart, ce sont les comptes clients.",
      },
      {
        id: "concentration",
        prompt: "Qu’est-ce qui fragilise le plus une hausse de revenus ?",
        choices: [
          { id: "repartie", label: "Une hausse répartie entre plusieurs clients" },
          { id: "concentree", label: "Une forte concentration sur un ou deux clients" },
          { id: "mensuelle", label: "Une facturation au mois plutôt qu’à l’année" },
        ],
        correctId: "concentree",
        explanation:
          "Quelques clients qui pèsent trop lourd exposent l’entreprise : en perdre un efface une grande part du chiffre, et souvent de la marge.",
      },
      {
        id: "ponctuel",
        prompt: "Comment lire un revenu qui ne reviendra pas (vente d’actif, contrat unique) ?",
        choices: [
          { id: "exploitation", label: "Comme un revenu d’exploitation récurrent" },
          { id: "hors", label: "Comme un élément à isoler, qui ne doit pas servir de base aux prévisions" },
          { id: "marge", label: "Comme la preuve que la marge est durable" },
        ],
        correctId: "hors",
        explanation:
          "Un revenu ponctuel gonfle l’exercice en cours. Le projeter comme s’il se répétait donne une trajectoire trop optimiste.",
      },
      {
        id: "ventilation",
        prompt: "Pourquoi ventiler les revenus par produit, division ou client ?",
        choices: [
          { id: "longueur", label: "Pour allonger les états financiers" },
          { id: "leviers", label: "Pour voir ce qui contribue vraiment, et ce qui tire la performance vers le bas" },
          { id: "impot", label: "Parce que le total ne suffit pas à calculer l’impôt" },
        ],
        correctId: "leviers",
        explanation:
          "Le total peut monter pendant qu’une division recule. La ventilation montre où la croissance est saine, et où elle ne l’est pas.",
      },
      {
        id: "hausse",
        prompt: "Une hausse de revenus améliore-t-elle toujours la situation ?",
        choices: [
          { id: "toujours", label: "Oui : plus de revenus est toujours préférable" },
          { id: "contexte", label: "Non : il faut voir la marge, la trésorerie et la dépendance que cette hausse crée" },
          { id: "annee", label: "Oui, dès que le chiffre dépasse celui de l’an dernier" },
        ],
        correctId: "contexte",
        explanation:
          "Un revenu supplémentaire ne vaut que s’il laisse de la marge, qu’il se transforme en argent et qu’il ne concentre pas le risque.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous distinguez le chiffre encaissé, le chiffre récurrent et le chiffre concentré. C’est la base d’une prévision utile.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "Le total est clair. La qualité du revenu — récurrence, concentration, encaissement — mérite encore un arrêt.",
      },
      {
        minScore: 0,
        title: "Le chiffre reste un total",
        body: "Le revenu est encore lu comme un seul montant. Le détailler change déjà la façon de décider.",
      },
    ],
  },
  {
    slug: "contribution-marginale",
    title: "Contribution marginale",
    description: "Cinq questions pour voir ce qu’il reste vraiment de chaque vente, une fois les coûts variables retirés.",
    duration: "3 min",
    questions: [
      {
        id: "definition",
        prompt: "La contribution marginale, c’est…",
        choices: [
          { id: "net", label: "Le profit net après impôts" },
          { id: "reste", label: "Ce qui reste du revenu une fois les coûts variables retirés" },
          { id: "total", label: "Le chiffre d’affaires total" },
        ],
        correctId: "reste",
        explanation:
          "On retire d’abord ce qui varie avec la vente : matières, sous-traitance, commissions. Le reste sert à couvrir les coûts fixes, puis à dégager un résultat.",
      },
      {
        id: "forte",
        prompt: "Un produit à forte contribution marginale…",
        choices: [
          { id: "couvre", label: "Couvre mieux les coûts fixes à chaque vente supplémentaire" },
          { id: "volume", label: "Est toujours celui qui se vend le plus" },
          { id: "aucun", label: "N’a aucun coût variable" },
        ],
        correctId: "couvre",
        explanation:
          "Ce n’est pas le volume qui décide. C’est ce que chaque vente laisse pour absorber les coûts qui ne bougent pas avec l’activité.",
      },
      {
        id: "populaire",
        prompt: "Pourquoi un produit très vendu peut-il quand même peser sur le résultat ?",
        choices: [
          { id: "equipe", label: "Parce qu’il occupe trop l’équipe commerciale" },
          { id: "couvre-pas", label: "Parce que sa contribution ne couvre pas les coûts qu’il entraîne" },
          { id: "clients", label: "Parce que les clients l’apprécient trop" },
        ],
        correctId: "couvre-pas",
        explanation:
          "Un fort volume à faible contribution, ou à contribution négative, remplit l’activité sans laisser de quoi payer les coûts fixes.",
      },
      {
        id: "prix",
        prompt: "Baisser un prix sans baisser les coûts variables…",
        choices: [
          { id: "compense", label: "Est toujours compensé par le volume" },
          { id: "reduit", label: "Réduit la contribution de chaque vente" },
          { id: "aucun-effet", label: "N’a aucun effet si le revenu total augmente" },
        ],
        correctId: "reduit",
        explanation:
          "Le rabais sort de la contribution, pas du coût fixe. Il faut beaucoup plus de volume pour retrouver la même couverture.",
      },
      {
        id: "rabais",
        prompt: "Avant d’accorder un rabais, on regarde d’abord…",
        choices: [
          { id: "vise", label: "Le chiffre d’affaires visé" },
          { id: "reste-apres", label: "La contribution qui reste après le rabais" },
          { id: "concurrents", label: "Le nombre de concurrents" },
        ],
        correctId: "reste-apres",
        explanation:
          "Un prix plus bas n’est utile que si la contribution restante couvre encore les coûts fixes et laisse un résultat. Le volume seul ne le dit pas.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous jugez une vente à ce qu’elle laisse, pas seulement au chiffre qu’elle affiche.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "La marge existe dans votre lecture. Le lien entre prix, coûts variables et couverture des fixes peut encore se préciser.",
      },
      {
        minScore: 0,
        title: "La marge reste un total",
        body: "Le revenu et le résultat se confondent encore. Isoler la contribution change les décisions de prix et de mélange de produits.",
      },
    ],
  },
  {
    slug: "seuil-de-rentabilite",
    title: "Seuil de rentabilité",
    description: "Cinq questions pour situer le niveau d’activité à partir duquel l’entreprise couvre ses coûts fixes.",
    duration: "3 min",
    questions: [
      {
        id: "definition",
        prompt: "Le seuil de rentabilité est le niveau d’activité où…",
        choices: [
          { id: "tresorerie", label: "La trésorerie est à son plus haut" },
          { id: "nul", label: "La contribution couvre exactement les coûts fixes : le résultat est nul" },
          { id: "dividende", label: "L’entreprise peut verser un dividende" },
        ],
        correctId: "nul",
        explanation:
          "En dessous, les coûts fixes ne sont pas couverts. Au seuil, ils le sont tout juste. Au-dessus, chaque vente supplémentaire dégage du résultat.",
      },
      {
        id: "fixes",
        prompt: "Si les coûts fixes montent et que la contribution par vente ne change pas…",
        choices: [
          { id: "baisse", label: "Le seuil baisse" },
          { id: "davantage", label: "Il faut vendre davantage pour l’atteindre" },
          { id: "immobile", label: "Le seuil ne bouge pas" },
        ],
        correctId: "davantage",
        explanation:
          "Le seuil, en unités, c’est les coûts fixes divisés par la contribution de chaque vente. Plus le numérateur est élevé, plus le volume requis augmente.",
      },
      {
        id: "contribution",
        prompt: "Une contribution marginale plus élevée…",
        choices: [
          { id: "eloigne", label: "Éloigne le seuil" },
          { id: "rapproche", label: "Rapproche le seuil : chaque vente couvre plus de coûts fixes" },
          { id: "impot", label: "N’agit que sur l’impôt" },
        ],
        correctId: "rapproche",
        explanation:
          "À coûts fixes égaux, une meilleure contribution unitaire réduit le nombre de ventes nécessaires pour passer le seuil.",
      },
      {
        id: "depasser",
        prompt: "Dépasser le seuil veut dire…",
        choices: [
          { id: "encaisse", label: "Que l’encaisse est positive" },
          { id: "profit", label: "Que les ventes au-delà contribuent au résultat, les coûts fixes étant couverts" },
          { id: "financee", label: "Que la croissance est financée" },
        ],
        correctId: "profit",
        explanation:
          "Le seuil parle de résultat, pas de trésorerie. On peut être au-dessus du seuil et quand même être tendu en liquidités.",
      },
      {
        id: "gamme",
        prompt: "Pourquoi calculer le seuil par gamme ou par division ?",
        choices: [
          { id: "cache", label: "Parce que le total peut cacher une activité déjà sous son seuil" },
          { id: "inexistants", label: "Parce que les coûts fixes n’existent pas au niveau de l’entreprise" },
          { id: "multiple", label: "Pour le comparer au multiple de valorisation" },
        ],
        correctId: "cache",
        explanation:
          "Une division profitable peut porter une autre qui ne couvre pas ses coûts. Le total de l’entreprise ne le montre pas.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous situez le volume qui couvre les fixes, et vous savez qu’il ne dit pas encore si l’argent est en banque.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "L’idée du seuil est là. Le rôle des coûts fixes, de la contribution et du découpage par activité peut encore se préciser.",
      },
      {
        minScore: 0,
        title: "Le seuil reste abstrait",
        body: "Le point où l’activité commence à couvrir les coûts fixes n’est pas encore une lecture de décision.",
      },
    ],
  },
  {
    slug: "flux-de-tresorerie",
    title: "Flux de trésorerie",
    description: "Cinq questions pour distinguer le profit de l’argent qui entre et qui sort.",
    duration: "3 min",
    questions: [
      {
        id: "exploitation",
        prompt: "Le flux de trésorerie d’exploitation mesure…",
        choices: [
          { id: "profit", label: "Le profit comptable de l’exercice" },
          { id: "argent", label: "L’argent généré par l’activité, une fois le fonds de roulement pris en compte" },
          { id: "dividendes", label: "Les dividendes versés aux actionnaires" },
        ],
        correctId: "argent",
        explanation:
          "Le résultat dit ce qui a été gagné. Le flux d’exploitation dit ce que l’activité a réellement dégagé en argent, après stocks, clients et fournisseurs.",
      },
      {
        id: "negatif",
        prompt: "Une entreprise peut être rentable et avoir un flux de trésorerie négatif quand…",
        choices: [
          { id: "comptant", label: "Les clients paient comptant" },
          { id: "croissance", label: "La croissance immobilise de l’argent dans les stocks, les comptes clients ou les investissements" },
          { id: "dettes", label: "Elle n’a plus aucune dette" },
        ],
        correctId: "croissance",
        explanation:
          "Le profit peut être là pendant que l’argent est coincé dans le cycle d’exploitation, ou sorti pour investir.",
      },
      {
        id: "investissement",
        prompt: "L’achat d’équipement se lit dans les flux comme…",
        choices: [
          { id: "revenu", label: "Un revenu" },
          { id: "sortie", label: "Une sortie de trésorerie d’investissement, distincte de l’exploitation" },
          { id: "disparait", label: "Une charge qui disparaît du bilan" },
        ],
        correctId: "sortie",
        explanation:
          "L’équipement reste un actif. L’argent, lui, est sorti. On ne le mélange pas au flux généré par les opérations courantes.",
      },
      {
        id: "emprunt",
        prompt: "Rembourser un emprunt…",
        choices: [
          { id: "augmente", label: "Augmente le flux d’exploitation" },
          { id: "financement", label: "Est un flux de financement : l’argent sort, même si l’exploitation est saine" },
          { id: "rien", label: "Ne change pas la trésorerie" },
        ],
        correctId: "financement",
        explanation:
          "Le remboursement réduit la dette et l’encaisse. Il ne dit pas que l’exploitation va mal : il dit qu’une sortie de financement a eu lieu.",
      },
      {
        id: "decider",
        prompt: "Pourquoi le dirigeant suit le flux de trésorerie en plus du résultat ?",
        choices: [
          { id: "deja", label: "Parce que le résultat net dit déjà quand l’argent sera là" },
          { id: "payer", label: "Parce que c’est lui qui dit si l’entreprise peut payer, investir et absorber le décalage" },
          { id: "remplace", label: "Parce qu’il remplace la valorisation" },
        ],
        correctId: "payer",
        explanation:
          "On décide avec les deux lectures. Le résultat parle de performance. Le flux parle de la capacité à tenir les engagements et à financer la suite.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous séparez exploitation, investissement et financement. Le profit n’est plus confondu avec l’argent disponible.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "L’idée du cash est là. Le classement des flux — et ce qu’ils changent à une décision — peut encore se préciser.",
      },
      {
        minScore: 0,
        title: "Le cash reste flou",
        body: "Le résultat et l’argent se confondent encore. Les suivre séparément évite les surprises de liquidité.",
      },
    ],
  },
  {
    slug: "fonds-de-roulement",
    title: "Fonds de roulement",
    description: "Cinq questions sur l’argent coincé dans les stocks, les comptes clients et les dettes fournisseurs.",
    duration: "3 min",
    questions: [
      {
        id: "definition",
        prompt: "Dans la gestion courante, le fonds de roulement d’exploitation, c’est surtout…",
        choices: [
          { id: "cycle", label: "L’argent immobilisé dans les stocks et les comptes clients, net des dettes fournisseurs" },
          { id: "actions", label: "Le capital-actions" },
          { id: "benefice", label: "Le bénéfice non réparti" },
        ],
        correctId: "cycle",
        explanation:
          "C’est le financement du cycle : on paie souvent les stocks et on attend les clients, pendant que les fournisseurs financent une partie du délai.",
      },
      {
        id: "augmente",
        prompt: "Quand ce fonds de roulement augmente…",
        choices: [
          { id: "libere", label: "De la trésorerie se libère" },
          { id: "absorbe", label: "De la trésorerie est absorbée pour financer l’exploitation" },
          { id: "seuil", label: "Le seuil de rentabilité baisse automatiquement" },
        ],
        correctId: "absorbe",
        explanation:
          "Plus d’argent dans les stocks ou chez les clients, c’est moins d’argent en banque. La hausse du fonds de roulement est un emploi de trésorerie.",
      },
      {
        id: "clients",
        prompt: "Faire payer les clients plus vite…",
        choices: [
          { id: "alourdit", label: "Alourdit le fonds de roulement" },
          { id: "libere", label: "Libère de la trésorerie" },
          { id: "fixes", label: "Augmente les coûts fixes" },
        ],
        correctId: "libere",
        explanation:
          "Un délai clients plus court réduit les comptes à recevoir. L’argent revient plus tôt, sans changer le revenu déjà comptabilisé.",
      },
      {
        id: "fournisseurs",
        prompt: "Allonger le délai fournisseurs, sans abîmer la relation…",
        choices: [
          { id: "finance", label: "Finance une partie du cycle par les fournisseurs" },
          { id: "revenus", label: "Réduit les revenus" },
          { id: "stocks", label: "Augmente mécaniquement les stocks" },
        ],
        correctId: "finance",
        explanation:
          "Payer plus tard laisse l’argent plus longtemps dans l’entreprise. C’est un levier de trésorerie, tant que le coût ou la relation ne se dégrade pas.",
      },
      {
        id: "croissance",
        prompt: "Une croissance rapide du chiffre d’affaires…",
        choices: [
          { id: "reduit", label: "Réduit toujours le besoin de fonds de roulement" },
          { id: "augmente", label: "Augmente souvent le besoin : plus de stocks et de comptes clients à financer" },
          { id: "marge", label: "N’agit que sur la marge" },
        ],
        correctId: "augmente",
        explanation:
          "Vendre plus, c’est souvent produire et facturer plus avant d’encaisser. La croissance se finance aussi par le fonds de roulement, pas seulement par la marge.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous voyez le fonds de roulement comme un emploi ou une source de trésorerie, pas comme un simple solde comptable.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "Le cycle est connu. L’effet d’une hausse de stocks, d’un délai client ou de la croissance sur l’encaisse peut encore se préciser.",
      },
      {
        minScore: 0,
        title: "Le cycle reste flou",
        body: "L’argent immobilisé entre l’achat et l’encaissement n’est pas encore une lecture de décision.",
      },
    ],
  },
  {
    slug: "croissance",
    title: "Croissance",
    description: "Cinq questions pour voir quand grandir crée de la valeur, et quand la croissance la consomme.",
    duration: "3 min",
    questions: [
      {
        id: "valeur",
        prompt: "La croissance crée de la valeur seulement si…",
        choices: [
          { id: "chiffre", label: "Le chiffre d’affaires augmente" },
          { id: "suit", label: "La rentabilité, la trésorerie et le risque suivent" },
          { id: "embauche", label: "L’entreprise embauche" },
        ],
        correctId: "suit",
        explanation:
          "Un chiffre plus haut ne suffit pas. La croissance crée de la valeur lorsqu’elle laisse de la marge, se finance et n’augmente pas le risque outre mesure.",
      },
      {
        id: "vite",
        prompt: "Croître plus vite que ce que la trésorerie peut financer…",
        choices: [
          { id: "toujours", label: "Est toujours le bon choix" },
          { id: "tendue", label: "Peut laisser l’entreprise rentable et tendue en même temps" },
          { id: "fixes", label: "Baisse automatiquement les coûts fixes" },
        ],
        correctId: "tendue",
        explanation:
          "La marge peut être positive pendant que le fonds de roulement et les investissements absorbent l’encaisse. La vitesse a un coût de trésorerie.",
      },
      {
        id: "marge",
        prompt: "Une croissance à marge plus faible que l’activité actuelle…",
        choices: [
          { id: "hausse", label: "Hausse la valeur dès que le volume augmente" },
          { id: "dilue", label: "Peut diluer la rentabilité de l’ensemble" },
          { id: "baiia", label: "N’a pas d’effet sur le BAIIA" },
        ],
        correctId: "dilue",
        explanation:
          "Ajouter du volume moins rentable fait monter le chiffre et peut faire baisser la marge globale. La valeur ne suit pas automatiquement.",
      },
      {
        id: "embaucher",
        prompt: "Avant d’embaucher pour soutenir la croissance, on chiffre…",
        choices: [
          { id: "concurrents", label: "Le nombre de concurrents" },
          { id: "effet", label: "L’effet sur la marge, le fonds de roulement et la trésorerie" },
          { id: "brut", label: "Seulement le salaire brut" },
        ],
        correctId: "effet",
        explanation:
          "Un poste n’est pas qu’un salaire. Il change les coûts fixes, parfois le délai d’encaissement, et il doit être couvert par la contribution additionnelle.",
      },
      {
        id: "client",
        prompt: "Une croissance concentrée sur un seul client…",
        choices: [
          { id: "securise", label: "Sécurise la valeur" },
          { id: "risque", label: "Augmente le risque : perdre ce client efface une grande part des revenus" },
          { id: "reduit", label: "Réduit le besoin de fonds de roulement" },
        ],
        correctId: "risque",
        explanation:
          "Le chiffre peut être beau et fragile. La concentration est un risque de valeur, même lorsque la marge du contrat est bonne.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous ne lisez plus la croissance comme un chiffre isolé. Marge, cash et risque font partie de la décision.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "L’ambition est claire. Le coût de trésorerie et l’effet sur la marge méritent encore d’être chiffrés avant d’accélérer.",
      },
      {
        minScore: 0,
        title: "La croissance reste un volume",
        body: "Grandir est encore lu comme une hausse de revenus. La relier à la marge et à l’encaisse change le rythme qu’on peut tenir.",
      },
    ],
  },
  {
    slug: "excel-101",
    title: "Excel 101",
    description: "Cinq questions pour lire un modèle simple sans se fier à un total tapé à la main.",
    duration: "3 min",
    questions: [
      {
        id: "absolu",
        prompt: "Une référence absolue, comme $B$2, sert à…",
        choices: [
          { id: "recalcule", label: "Recalculer la cellule à chaque ouverture du fichier" },
          { id: "fixe", label: "Garder la même cellule lorsqu’on copie la formule" },
          { id: "colonne", label: "Additionner toute une colonne" },
        ],
        correctId: "fixe",
        explanation:
          "Le signe $ fige la ligne, la colonne, ou les deux. Sans lui, la référence se déplace quand on étire la formule.",
      },
      {
        id: "somme",
        prompt: "Pour additionner une colonne de revenus, on utilise…",
        choices: [
          { id: "moyenne", label: "=MOYENNE" },
          { id: "somme", label: "=SOMME" },
          { id: "si", label: "=SI" },
        ],
        correctId: "somme",
        explanation:
          "SOMME additionne la plage. MOYENNE en fait la moyenne. SI teste une condition : ce n’est pas un total.",
      },
      {
        id: "main",
        prompt: "Pourquoi éviter de taper un total à la main dans un modèle ?",
        choices: [
          { id: "refuse", label: "Parce qu’Excel refuse les nombres saisis" },
          { id: "fige", label: "Parce qu’un total tapé ne se met pas à jour quand une ligne change" },
          { id: "lent", label: "Parce que les formules sont plus lentes" },
        ],
        correctId: "fige",
        explanation:
          "Un nombre saisi reste figé. Une formule se recalcule. C’est ce qui rend le modèle fiable d’un mois à l’autre.",
      },
      {
        id: "ecart",
        prompt: "Un écart réel versus budget se construit en…",
        choices: [
          { id: "constant", label: "Soustrayant les deux montants de la même façon dans tout le fichier" },
          { id: "copie", label: "Copiant le budget dans la colonne du réel" },
          { id: "divise", label: "Divisant le budget annuel par 12" },
        ],
        correctId: "constant",
        explanation:
          "Le signe de l’écart doit être le même partout : réel moins budget, ou l’inverse. Mélanger les deux rend la lecture impossible.",
      },
      {
        id: "fiable",
        prompt: "Avant de se fier à un classeur, on vérifie d’abord…",
        choices: [
          { id: "couleur", label: "La couleur des cellules" },
          { id: "formules", label: "Que les totaux sont des formules, que les signes sont cohérents et que le résultat se réconcilie aux états" },
          { id: "onglets", label: "Le nombre d’onglets" },
        ],
        correctId: "formules",
        explanation:
          "Un modèle n’est utile que s’il se recoupe avec les états financiers. Les formules, les signes et la réconciliation priment sur la mise en forme.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous lisez un classeur par ses formules et sa réconciliation, pas par le chiffre affiché dans une cellule isolée.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "Les bases sont là. Références, écarts et réconciliation méritent encore un réflexe avant de décider sur le fichier.",
      },
      {
        minScore: 0,
        title: "Le fichier reste opaque",
        body: "Le classeur est encore une grille de nombres. Quelques réflexes — formules, signes, totaux — suffisent à le rendre lisible.",
      },
    ],
  },
  {
    slug: "baiia-ajuste",
    title: "BAIIA ajusté",
    description: "Cinq questions pour lire un bénéfice d’exploitation récurrent, sans le confondre avec l’argent en banque.",
    duration: "3 min",
    questions: [
      {
        id: "definition",
        prompt: "Le BAIIA, c’est le résultat avant…",
        choices: [
          { id: "avant", label: "Intérêts, impôts et amortissement" },
          { id: "dividendes", label: "Dividendes et capital-actions" },
          { id: "ventes", label: "Uniquement les ventes" },
        ],
        correctId: "avant",
        explanation:
          "On retire les intérêts, les impôts et l’amortissement pour approcher la performance de l’exploitation, avant la structure de financement et la comptabilisation des actifs.",
      },
      {
        id: "pourquoi",
        prompt: "Pourquoi ajuster le BAIIA ?",
        choices: [
          { id: "recurrent", label: "Pour approcher un résultat récurrent, en isolant ce qui ne se répétera pas ou qui n’est pas lié à l’exploitation" },
          { id: "encaisse", label: "Pour le faire correspondre à l’encaisse" },
          { id: "fixes", label: "Pour annuler les coûts fixes" },
        ],
        correctId: "recurrent",
        explanation:
          "L’ajustement retire, par exemple, une dépense ponctuelle ou une charge qui n’appartient pas à l’exploitation normale. Le but est une base comparable d’une année à l’autre.",
      },
      {
        id: "charge",
        prompt: "Qu’est-ce qu’on retire souvent dans un BAIIA ajusté ?",
        choices: [
          { id: "cmv", label: "Le coût des marchandises vendues" },
          { id: "ponctuelle", label: "Une dépense ponctuelle qui ne reviendra pas" },
          { id: "salaires", label: "Les salaires de l’exploitation courante" },
        ],
        correctId: "ponctuelle",
        explanation:
          "Les coûts courants restent. On isole ce qui déforme l’exercice : gain ou perte unique, frais de litige non récurrents, rémunération du propriétaire très éloignée du marché.",
      },
      {
        id: "cash",
        prompt: "Le BAIIA ajusté est-il de la trésorerie ?",
        choices: [
          { id: "oui", label: "Oui, s’il est positif" },
          { id: "non", label: "Non : il ignore encore le fonds de roulement, les impôts, les intérêts et les investissements" },
          { id: "parfois", label: "Oui, une fois l’amortissement retiré" },
        ],
        correctId: "non",
        explanation:
          "Retirer l’amortissement rapproche d’un résultat, pas d’un flux. L’argent dépend encore des clients, des stocks, de la dette et des achats d’équipement.",
      },
      {
        id: "genereux",
        prompt: "Un ajustement trop généreux…",
        choices: [
          { id: "rien", label: "N’a pas d’effet sur une valorisation" },
          { id: "gonfle", label: "Gonfle une base qui sert souvent de point de départ au multiple" },
          { id: "reduit", label: "Réduit toujours la valeur" },
        ],
        correctId: "gonfle",
        explanation:
          "Si la base est trop haute, le multiple s’applique à un bénéfice qui ne reviendra pas. La valeur affichée est alors trop optimiste.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous lisez le BAIIA ajusté comme une base récurrente, pas comme de l’argent disponible.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "L’idée du BAIIA est là. Le choix des ajustements, et l’écart avec la trésorerie, peuvent encore se préciser.",
      },
      {
        minScore: 0,
        title: "La base reste floue",
        body: "Le BAIIA est encore un total parmi d’autres. Savoir ce qu’on retire, et pourquoi, change la lecture du résultat.",
      },
    ],
  },
  {
    slug: "multiple-de-valorisation",
    title: "Multiple de valorisation",
    description: "Cinq questions pour voir ce qu’un multiple fait — et ce qu’il ne remplace pas.",
    duration: "3 min",
    questions: [
      {
        id: "sert",
        prompt: "Un multiple de valorisation sert à…",
        choices: [
          { id: "dette", label: "Diviser la dette par le revenu" },
          { id: "relier", label: "Relier une base de résultat, souvent le BAIIA, à une valeur d’entreprise" },
          { id: "seuil", label: "Calculer le seuil de rentabilité" },
        ],
        correctId: "relier",
        explanation:
          "On applique un multiple à une base, en général un BAIIA jugé récurrent. Le produit est une indication de valeur d’entreprise, pas un résultat comptable.",
      },
      {
        id: "produit",
        prompt: "BAIIA × multiple donne en général…",
        choices: [
          {
            id: "entreprise",
            label:
              "Une valeur d’entreprise. Pour les actions, on retire la dette nette et on ajoute les actifs excédentaires, non requis pour les opérations",
          },
          { id: "actions", label: "Directement le prix des actions, sans autre ajustement" },
          { id: "net", label: "Le bénéfice net de l’exercice" },
        ],
        correctId: "entreprise",
        explanation:
          "BAIIA × multiple indique la valeur de l’exploitation. Pour arriver aux actions, on retire la dette nette et on ajoute les actifs excédentaires — ceux qui ne servent pas aux opérations, comme un placement ou un immeuble hors exploitation.",
      },
      {
        id: "differents",
        prompt: "Deux entreprises au même BAIIA peuvent avoir des multiples différents parce que…",
        choices: [
          { id: "secteur", label: "Le multiple est le même pour tout un secteur" },
          { id: "qualite", label: "Le multiple reflète la croissance, le risque, la récurrence et la taille" },
          { id: "annee", label: "Le multiple ne dépend que de l’année en cours" },
        ],
        correctId: "qualite",
        explanation:
          "Le même bénéfice ne vaut pas le même prix si l’un est concentré, peu récurrent ou gourmand en trésorerie, et l’autre non.",
      },
      {
        id: "plus-eleve",
        prompt: "Un multiple plus élevé, à BAIIA égal, veut dire…",
        choices: [
          { id: "qualite", label: "Que l’entreprise vaut plus, parce qu’on lui reconnaît une meilleure qualité : croissance, risque ou récurrence" },
          { id: "dettes", label: "Qu’elle a forcément plus de dettes" },
          { id: "baiia", label: "Que son BAIIA est plus haut" },
        ],
        correctId: "qualite",
        explanation:
          "Le BAIIA est le même. C’est le multiple qui change le prix : il traduit ce que cette base mérite, selon la croissance, le risque et la récurrence.",
      },
      {
        id: "remplace",
        prompt: "Le multiple ne remplace pas…",
        choices: [
          { id: "lecture", label: "La lecture de ce qui le justifie : marge, trésorerie, risque et croissance" },
          { id: "chiffre", label: "Le chiffre d’affaires" },
          { id: "etats", label: "Les états financiers" },
        ],
        correctId: "lecture",
        explanation:
          "Un multiple sans explication est un raccourci. Il devient utile lorsqu’on sait quelle qualité de bénéfice, de cash et de risque il suppose.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous voyez le multiple comme un pont entre un résultat récurrent et une valeur, pas comme un prix tout fait.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "Le calcul est connu. La qualité de la base et le passage de la valeur d’entreprise aux actions peuvent encore se préciser.",
      },
      {
        minScore: 0,
        title: "Le multiple reste un chiffre",
        body: "Le multiple est encore appliqué sans regarder ce qu’il multiplie, ni ce qu’il suppose sur le risque.",
      },
    ],
  },
  {
    slug: "valeur-comptable-ajustee",
    title: "Valeur comptable ajustée",
    description: "Cinq questions pour passer des livres comptables à une lecture actuelle des actifs et des dettes.",
    duration: "3 min",
    questions: [
      {
        id: "definition",
        prompt: "La valeur comptable, c’est…",
        choices: [
          { id: "baiia", label: "Le BAIIA de l’exercice" },
          { id: "livres", label: "L’actif moins le passif, soit les capitaux propres aux livres" },
          { id: "prix", label: "Le prix payé par le dernier acheteur" },
        ],
        correctId: "livres",
        explanation:
          "C’est ce que les états inscrits laissent aux actionnaires : les actifs moins les dettes, au coût et selon les règles comptables, pas au prix du marché.",
      },
      {
        id: "ajuster",
        prompt: "Pourquoi l’ajuster ?",
        choices: [
          { id: "historique", label: "Parce que les livres reflètent souvent un coût historique, pas la valeur actuelle des actifs et des dettes" },
          { id: "ventes", label: "Pour la faire égaler le chiffre d’affaires" },
          { id: "future", label: "Parce qu’elle inclut déjà la trésorerie des prochaines années" },
        ],
        correctId: "historique",
        explanation:
          "Un immeuble, un équipement ou une dette peuvent valoir autre chose aujourd’hui que ce que le bilan affiche. L’ajustement rapproche les livres de cette réalité.",
      },
      {
        id: "actif",
        prompt: "Quel élément réévalue-t-on souvent ?",
        choices: [
          { id: "immeuble", label: "Un immeuble inscrit au coût d’achat, alors que sa valeur de marché a changé" },
          { id: "ventes", label: "Les ventes de l’an prochain" },
          { id: "marge", label: "La marge brute" },
        ],
        correctId: "immeuble",
        explanation:
          "L’ajustement porte sur des actifs et des passifs identifiables. Les revenus futurs relèvent d’une autre lecture, celle du résultat et du multiple.",
      },
      {
        id: "convient",
        prompt: "La valeur comptable ajustée éclaire surtout…",
        choices: [
          { id: "actifs", label: "Les entreprises dont la valeur tient beaucoup aux actifs nets : immobilier, équipement, placements" },
          { id: "services", label: "Toutes les entreprises de services sans actif significatif" },
          { id: "impot", label: "Uniquement le calcul de l’impôt de l’exercice" },
        ],
        correctId: "actifs",
        explanation:
          "Quand il y a peu d’actifs et beaucoup de savoir-faire, les livres ajustés disent peu de la valeur. Ils deviennent centraux lorsque les actifs portent l’entreprise.",
      },
      {
        id: "seule",
        prompt: "À elle seule, elle ne dit pas…",
        choices: [
          { id: "futur", label: "Ce que l’exploitation future peut encore créer au-delà des actifs" },
          { id: "capitaux", label: "Le solde des capitaux propres aux livres" },
          { id: "dettes", label: "La liste des dettes inscrites au bilan" },
        ],
        correctId: "futur",
        explanation:
          "Ajuster le bilan donne une photo des actifs et des dettes. La capacité à générer du résultat ensuite est une autre question.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Vous distinguez les livres, leur ajustement au marché, et la valeur que l’exploitation peut encore ajouter.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "Le bilan est connu. L’écart entre coût historique et valeur actuelle, et ce que cette méthode ne couvre pas, peuvent encore se préciser.",
      },
      {
        minScore: 0,
        title: "Les livres restent un solde",
        body: "La valeur comptable est encore lue comme le prix de l’entreprise. L’ajuster, puis la compléter, change cette lecture.",
      },
    ],
  },
  {
    slug: "budget-projections",
    title: "Budget et projections",
    description: "Cinq questions pour poser une trajectoire, puis la confronter au réel.",
    duration: "3 min",
    questions: [
      {
        id: "sert",
        prompt: "Un budget sert à…",
        choices: [
          { id: "archive", label: "Archiver l’exercice précédent" },
          { id: "trajectoire", label: "Fixer une trajectoire — revenus, coûts, trésorerie — puis la comparer au réel" },
          { id: "comptable", label: "Calculer la valeur comptable" },
        ],
        correctId: "trajectoire",
        explanation:
          "Le budget est le plan retenu. Sans comparaison au réel, il reste une intention. C’est l’écart qui guide les décisions en cours d’année.",
      },
      {
        id: "hypotheses",
        prompt: "Une projection n’est utile que si…",
        choices: [
          { id: "copie", label: "Elle reprend le réel de l’an dernier, sans hypothèse" },
          { id: "explicites", label: "Les hypothèses — volume, prix, délais, embauches — sont explicites et modifiables" },
          { id: "total", label: "Elle tient en un seul total annuel" },
        ],
        correctId: "explicites",
        explanation:
          "Changer une hypothèse doit changer le résultat. Si les hypothèses sont cachées, on ne peut ni les discuter ni les corriger.",
      },
      {
        id: "mois",
        prompt: "Pourquoi suivre le réel contre le budget chaque mois ?",
        choices: [
          { id: "corriger", label: "Pour corriger pendant que la trajectoire peut encore changer" },
          { id: "remplacer", label: "Pour remplacer les états financiers" },
          { id: "fin", label: "Parce que l’écart n’existe qu’en fin d’année" },
        ],
        correctId: "corriger",
        explanation:
          "Un écart vu en décembre est une constatation. Vu en cours d’année, il laisse le temps d’ajuster prix, coûts ou investissements.",
      },
      {
        id: "cash",
        prompt: "Une projection de trésorerie ajoute au budget de résultat…",
        choices: [
          { id: "moment", label: "Le moment où l’argent entre et sort : clients, fournisseurs, investissements, dette" },
          { id: "net", label: "Uniquement le bénéfice net" },
          { id: "multiple", label: "Le multiple de valorisation" },
        ],
        correctId: "moment",
        explanation:
          "Un mois rentable peut être tendu si les clients paient plus tard ou si un équipement est payé comptant. Le calendrier de l’argent ne se lit pas dans le seul résultat.",
      },
      {
        id: "hypothese",
        prompt: "Changer une hypothèse — un prix, une embauche — doit montrer…",
        choices: [
          { id: "ventes", label: "Seulement le nouveau chiffre d’affaires" },
          { id: "effet", label: "L’effet sur le résultat, la trésorerie et, lorsqu’on la suit, la valeur" },
          { id: "rien", label: "Rien, tant que l’année n’est pas finie" },
        ],
        correctId: "effet",
        explanation:
          "Une décision se juge à ce qu’elle déplace : la marge, l’encaisse, puis la trajectoire de valeur. Le chiffre d’affaires seul ne suffit pas.",
      },
    ],
    resultBands: [
      {
        minScore: 5,
        title: "Lecture déjà nette",
        body: "Le budget est pour vous une trajectoire à tenir, avec des hypothèses qu’on peut changer et un écart qu’on regarde à temps.",
      },
      {
        minScore: 3,
        title: "Quelques angles morts",
        body: "Le plan existe. Le lien entre hypothèses, trésorerie et suivi mensuel peut encore se préciser.",
      },
      {
        minScore: 0,
        title: "Le budget reste un document",
        body: "La projection n’est pas encore un outil de décision. La rendre explicite, puis la comparer au réel, change son usage.",
      },
    ],
  },
]

export type FinanceQuizFamily = {
  id: string
  title: string
  description: string
  slugs: readonly string[]
}

export const FINANCE_QUIZ_FAMILIES: readonly FinanceQuizFamily[] = [
  {
    id: "performance",
    title: "Performance",
    description: "Ce que l’activité dégage vraiment, une fois le volume, la marge et le résultat récurrent séparés.",
    slugs: ["revenus", "contribution-marginale", "seuil-de-rentabilite", "croissance"],
  },
  {
    id: "tresorerie",
    title: "Trésorerie",
    description: "L’argent qui entre, qui sort, et celui qui reste coincé dans le cycle.",
    slugs: ["flux-de-tresorerie", "fonds-de-roulement"],
  },
  {
    id: "valeur",
    title: "Valeur",
    description: "Relier le résultat et les actifs à ce que l’entreprise vaut.",
    slugs: ["lecture-de-la-valeur", "baiia-ajuste", "multiple-de-valorisation", "valeur-comptable-ajustee"],
  },
  {
    id: "previsions",
    title: "Prévisions",
    description: "Poser une trajectoire, puis la confronter au réel.",
    slugs: ["budget-projections"],
  },
  {
    id: "outils",
    title: "Outils",
    description: "Lire un fichier sans se fier à un total figé.",
    slugs: ["excel-101"],
  },
]

export function getFinanceQuizzesByFamily(): Array<FinanceQuizFamily & { quizzes: FinanceQuiz[] }> {
  const used = new Set<string>()
  const groups = FINANCE_QUIZ_FAMILIES.map((family) => {
    const quizzes = family.slugs.flatMap((slug) => {
      const quiz = FINANCE_QUIZZES.find((item) => item.slug === slug)
      if (!quiz) return []
      used.add(slug)
      return [quiz]
    })
    return { ...family, quizzes }
  })
  const rest = FINANCE_QUIZZES.filter((quiz) => !used.has(quiz.slug))
  if (rest.length > 0) {
    groups.push({
      id: "autres",
      title: "Autres",
      description: "",
      slugs: rest.map((quiz) => quiz.slug),
      quizzes: [...rest],
    })
  }
  return groups
}

export function getFinanceQuiz(slug: string): FinanceQuiz | undefined {
  return FINANCE_QUIZZES.find((quiz) => quiz.slug === slug)
}

export function getFinanceQuizBand(quiz: FinanceQuiz, score: number): FinanceQuizBand {
  const bands = [...quiz.resultBands].sort((a, b) => b.minScore - a.minScore)
  return bands.find((band) => score >= band.minScore) ?? bands[bands.length - 1]
}
