# Modelisys

Financial modeling SaaS platform with multi-tenant organization/company hierarchy.

## Tech Stack

- **Backend:** FastAPI 0.115 / Python 3.12 / SQLAlchemy 2.0 (async) / Alembic / PostgreSQL 16
- **Frontend:** Next.js 16 (App Router) / React 19 / TypeScript 5 / Tailwind CSS 4 / Radix UI (shadcn)
- **Auth:** JWT (python-jose) with access/refresh tokens, bcrypt password hashing
- **Testing:** pytest (backend), Playwright (frontend e2e)
- **Package Manager:** pnpm (frontend), pip (backend)
- **Infra:** Docker Compose (frontend + backend + PostgreSQL)

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app, CORS, router includes
    config.py            # pydantic-settings (env vars)
    database.py          # SQLAlchemy engine + session
    dependencies.py      # Auth dependency injection (get_current_user)
    models/              # SQLAlchemy ORM models (UUID PKs throughout)
    routers/             # API endpoint handlers
    schemas/             # Pydantic request/response models
    services/            # Business logic (financial statement computation)
    utils/security.py    # JWT creation/verification, password hashing
  alembic/               # DB migrations
  tests/                 # pytest test files (test_*.py)

frontend/
  app/                   # Next.js App Router pages
    (public)/            # Login, landing (no auth required)
    financial-statements/  # Income statement, balance sheet, cash flow
    settings/            # Company config, mapping, trial balance
    projections/         # Forecasting
    evaluation/          # Business model, EBITDA, net tangible assets
    analysis/            # Capex
    layout.tsx           # Root layout
    providers.tsx        # Theme + auth providers
  components/            # React components
    ui/                  # shadcn/Radix primitives (auto-generated)
    *-summary.tsx        # Summary view components
    *-detail.tsx         # Detail view components
    *-chart.tsx          # Chart components (Recharts)
  contexts/              # React Context (auth-context, sidebar-context)
  hooks/                 # Custom hooks (use-companies, use-financial-statement, etc.)
  lib/
    api.ts               # API client with auto token refresh
    financial-utils.ts   # Formatting + financial calculations
    utils.ts             # cn() helper (clsx + tailwind-merge)
  e2e/                   # Playwright e2e tests
  middleware.ts          # Route protection (redirect if unauthenticated)
```

## Running the Project

```bash
# Full stack via Docker
docker-compose up

# Backend only (port 8000)
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend only (port 3000)
cd frontend
pnpm install
pnpm dev
```

Backend is exposed on port 8000 (host and container). Frontend on port 3000.

## Running Tests

```bash
# Backend tests (uses SQLite in-memory)
cd backend
python -m pytest

# Frontend e2e (requires running app at localhost:3000)
cd frontend
pnpm test:e2e
pnpm test:e2e:ui   # interactive UI mode
```

## Key Conventions

### Backend

- **All models use UUID primary keys** (PostgreSQL UUID type, `uuid.uuid4` default)
- **Multi-tenancy via org scoping:** queries always filter by the user's organization
- **Auth pattern:** `current_user: User = Depends(get_current_user)` on every router
- **API prefix:** all routes under `/api/` (e.g., `/api/companies/{id}/...`)
- **HTTP status codes:** 201 (create), 204 (delete), 401 (unauthenticated), 403 (unauthorized).
  Missing/malformed bearer credentials **must** be 401: FastAPI's stock `HTTPBearer`
  raises 403 on the pinned 0.115.0 (newer releases raise 401), so `app/dependencies.py`
  wraps it in `BearerAuth` to normalize the status regardless of version. Run backend
  tests against the pinned `requirements.txt` versions — a newer local FastAPI hides
  this divergence and CI catches it instead.
- **Router/Schema/Model separation:** routers handle HTTP, schemas validate I/O, models define DB
- **Cascade deletes** configured at the DB level via `ondelete="CASCADE"`
- **Timestamps:** `created_at` and `updated_at` on all entities
- **Type hints everywhere** (PEP 484)

### Frontend

- **"use client"** directive on all interactive components
- **Custom hooks** for API data fetching (e.g., `useFinancialStatement`, `useCompanies`)
- **`apiFetch()` in lib/api.ts** handles auth token injection and automatic refresh on 401.
  It JSON-stringifies the `body` for you — pass a **raw object** (`body: payload`),
  NOT `body: JSON.stringify(payload)` (that double-encodes → 422).
- **Path alias:** `@/*` maps to project root
- **Styling:** Tailwind utility classes; slate neutrals, emerald accents
- **Components follow naming pattern:** `{Entity}{View}.tsx` (e.g., `BalanceSheetSummary`)
- **Forms:** react-hook-form + zod validation
- **Charts:** Recharts
- **Icons:** lucide-react
- **Dark mode:** next-themes

### Naming

- Python: `snake_case` (functions/variables), `CamelCase` (classes)
- TypeScript: `camelCase` (variables/functions), `PascalCase` (components/types)
- Files: `kebab-case` for all files
- Hooks: `use-{feature}.ts`
- API routes: `/api/{resource}` or `/api/companies/{id}/{resource}`

## Database

- PostgreSQL 16 (Docker)
- Migrations managed by Alembic (`backend/alembic/versions/`)
- Hierarchical model: Organization -> Company -> Division -> SubDivision
- Key entities: User, AccountMapping, TrialBalance, FinancialStatementMapping, ExchangeRate, Budget, Note, Projection, BusinessRisk, ForecastConfig
- Test DB: SQLite in-memory (with UUID type compilation shim in conftest.py)

## Environment Variables

Defined in `.env` at project root, loaded by Docker Compose:

```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
DATABASE_URL=postgresql://{user}:{password}@db:5432/{db}
JWT_SECRET_KEY=<change-in-production>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## CI/CD & Deployment

### Pipeline
- **GitHub Actions** deploys automatically on every push to `main`
- Pipeline: test (pytest + pnpm build) -> build Docker images -> push to ACR -> deploy to Azure Container Apps
- Workflow file: `.github/workflows/deploy.yml`

### Azure Resources
- **Container Apps:** `modelisys-backend` (port 8000) + `modelisys-frontend` (port 3000) in `modelisys-env`
- **Container Registry:** `modelisysacr` (Basic SKU)
- **PostgreSQL:** `modelisys-db` (Flexible Server, Burstable B1ms, PostgreSQL 16)
- **Resource Group:** `modelisys-rg` (East US)
- **Domains:** `app.modelisys.com` (frontend), `api.modelisys.com` (backend)

### Infrastructure Scripts
```bash
# First-time setup (requires az login)
./infra/setup.sh

# Destroy all resources
./infra/teardown.sh
```

### Rollback
```bash
# List revisions
az containerapp revision list --name modelisys-backend --resource-group modelisys-rg -o table

# Activate a previous revision
az containerapp revision activate --name modelisys-backend --resource-group modelisys-rg --revision <revision-name>
```

## Git Workflow

- **Main branch:** `main`
- **Feature branches:** `feature/phase-{N}-{description}`
- **PRs:** feature branches merged to main via pull requests
- **Phases:** phase-1 (backend foundation), phase-2 (companies/auth), phase-3a (statement structures)

## Architecture Notes

- Financial statements are **computed server-side** from trial balance data, account mappings, and statement structures
- The computation service lives in `backend/app/services/financial_statements.py`
- Statement structures define the rows/sections of income statement, balance sheet, etc.
- Account mappings link GL accounts to statement rows via `link_codes`
- **BAIIA** (résultats, poste `isEBITA` / libellé « BAIIA ») : calculé serveur
  comme `|REV| − |coûts variables| − |coûts fixes|` (flags `variable_costs` /
  `fixed_costs` du mapping), aligné Pilotage / pont Dépenses — pas via la
  formule Liaison des Paramètres (écrasée sur état mono-période et séries).
  Revenus = comptes GL **uniques** de la famille REV (ancre `REV` après parent
  rollup — jamais la somme de tous les codes REV*/parents, qui recompterait
  les mêmes GL). Horizon : mensuel = activité du mois ; YTD / trimestre /
  annuel = somme des BAIIA mensuels de la fenêtre. En Paramètres Sommaire,
  Code / Liaison / Annexe sont retirés au chargement/sauvegarde
  (`normalizeBaiiaStructureRow`) ; Liaison affiche « REV − CV − CF » en
  lecture seule.
- **Aperçu de l'entreprise** (`/evaluation/company-overview`) : rapport continu
  style Multiplicateur / Modèle d'affaires (`components/company-overview/*`) —
  hero valuation + feuille blanche ; sections Méthode · Générales (+ activités) ·
  Historique · Actionnariat · Direction ; bandeau profil + nav d’ancres ;
  persisté localStorage via `lib/diagnostic-company-overview.ts` (même clé que
  le diagnostic). La coquille diagnostic (`diagnostic-company-overview-section`)
  reste pour le module Diagnostic.
- **Modèle d'affaires** (`/evaluation/business-model`) : rapport continu style
  Multiplicateur / VCA (`components/business-model/*`) — hero valuation + feuille
  blanche ; sections Méthode · Sommaire (KPI strip + plan d’action) · catégories
  de risques (nav d’ancres) ; niveau + note inline autosave (`business_risks`).
  Défauts dans `lib/business-model-default-risks.ts`.
- **Flux monétaires** (`/evaluation/adjusted-ebitda`, étape plan « Flux monétaires »,
  juste avant Multiplicateur) : rapport continu style VCA
  (`components/capitalisation/adjusted-ebitda-report.tsx`) — sommaire BAIIA bas/
  médian/haut + Flux bas/médian/haut ; sections 1 Méthode ·
  2 BAIIA (colonnes selon date de référence + fin d’exercice : si réf. ≠ clôture
  → **PEC** + **TTM** + 5 exercices complets ; si réf. = clôture → 5 exercices ;
  colonnes sans chiffre masquées ; ajustements ciblables **Revenus** (à
  l’ajout ; report 1:1 sur BAIIA + ligne Revenus ajustés, trait fort au-dessus)
  ou **BAIIA** ; sous BAIIA ajusté (trait fort au-dessus) : **% des revenus**
  ou **% des revenus ajustés** (italique ; dénominateur aligné) ; notes / sources sous
  Pondération (pas dans les cellules ; pondérations en orange gras) ; Synthèse (revenus +
  BAIIA + BAIIA/Revenus) dans §3 Fourchette ;
  fourchette = Hypothèses ParamRow (Revenus bas/haut + BAIIA bas/haut) +
  Fourchette retenue (revenus + BAIIA, vs médian, BAIIA / revenus
  représentatifs) ; moyennes 5/4/3/2 ans + dernier exercice masquées si pas
  assez d’exercices peuplés, + moyenne pondérée ;
  `baiia-section.tsx` / `fourchette-section.tsx`, série CDR
  `ebitda-capitalisation`) · 3 Fourchette · 4 Flux caractéristiques
  (`flux-monetaires-section.tsx` : BAIIA ajusté bas/haut − impôt (taux %) −
  ajustement FDR [FDR% VCA × Revenus × croissance] −
  Capex de maintien bas/haut → flux monétaires caractéristiques ; FDR % lu depuis
  VCA `net-tangible-fdr-adjustment.pctOfRevenue` ; persisté
  `cashFlowTaxRate` / `cashFlowEconomicGrowth` /
  `cashFlowMaintenanceCapexLow` / `cashFlowMaintenanceCapexHigh` +
  notes `cash-flow`) ;
  même ForecastConfig `ebitda-multiple-config` + notes que Capitalisation ;
  disclaimer localStorage partagé.
- **Multiplicateur** (`/evaluation/capitalisation`, étape plan « Multiplicateur ») :
  rapport **CMPC** (WACC société privée) sous l’en-tête valuation (Retour aux
  étapes / Multiplicateur / Entité / Date de référence). UI `components/cmpc/*`
  + moteur `lib/cmpc-wacc.ts` (CAPM + primes taille/spécifique, coût de la dette
  net d’impôt, pondération fonds propres / dette, fourchette ±0,5 % arrondie
  0,25 %). §3 Structure de capital : pondérations CMPC (E / D). La **capacité de
  remboursement** (VA, Dette / BAIIA, multiple retenu vs capacité max) vit dans
  l’étape **Capitalisation** (`/evaluation/ebitda-multiple`, §3
  `repayment-capacity-section.tsx`, persisté dans `ebitda-multiple-config`).
  ForecastConfig `cmpc-multiplicateur` (`inputs` + `meta` + sources). La structure
  `statement_type="capitalisation"` / studio Paramètres n’est plus l’UX principale
  de cette étape.
- **Capitalisation** (`/evaluation/ebitda-multiple`, étape plan « Capitalisation ») :
  rapport continu style VCA (`components/capitalisation/*`) — hero valuation +
  feuille blanche ; sections 1 Multiples · 2 Valeur d’entreprise (+ graphique) ·
  3 Capacité de remboursement (VA, Dette / BAIIA, retenu vs capacité max) ·
  4 Restrictions ; BAIIA représentatif issu de l’étape Flux monétaires (même
  `ebitda-multiple-config`) ; bandeau KPI ; nav d’ancres ; moteur
  `lib/ebitda-capitalisation.ts` + hook `use-ebitda-capitalisation` ; disclaimer
  localStorage partagé.
- **VCA / FDR représentatif** (`/evaluation/net-tangible-assets`) : rapport
  continu style Multiplicateur (`components/net-tangible/*`) — sections
  1 Méthode · 2 Bilan ajusté (section rapport style FDR + tableau buildup
  slate/mono VC→ACN, moteur d’hypothèse cellule : modes Montant $ /
  % VC / Juste valeur, buildup live, JVM Capex / surplus annexe,
  autosave) · 3 FDR représentatif (Hypothèses | Calcul, autosave) ·
  4 Sources (Ajustements / Dettes / Excédent, montant ≠ 0 ; Capex ALT =
  Parent - poste d’annexe, ex. Immobilisations corporelles - Terrains) ·
  5 Restrictions ;
  bandeau conclusion KPI ; nav d’ancres (plus d’onglets exclusifs). Revenus
  (12 derniers mois) = TTM du CDR (série `income-statement` +
  `sumTTMEndingAtCalendarMonth`), même moteur que Sommaire/Détail Annuel
  Courant ; poste Revenus / ancre `REV` — pas la BV brute (clés de mois
  françaises, double comptage des parents). Bandeau : FDR = FDR représentatif
  **ajusté** ; ACN += écart FDR ; Actifs (passifs) excédentaires −= écart FDR
  (`applyNetTangibleFdrOverviewAdjustment`).
- **Capex auto** (analyse Capex) : postes **BAIIA** et **Flux de trésorerie -
  Exploitation** (montants TTM) et ratios **Capex / BAIIA**, **Capex / Flux…**
  (`normalizeCapexAutoRatioRow`, liaison verrouillée). Même principe que
  **Capex / Revenus** (Capex / Chiffre d’affaires) sur tous les horizons :
  ratio = **Capex affiché ÷ dénominateur affiché**. Numérateur = poste
  « Capex » ou lignes ALT en **Variation** (jamais le stock Réel des
  immobilisations) aux mêmes colonnes (`pickCapexDisplayIndices` : mois réf.
  année courante, clôture les années antérieures). Dénominateur = montant
  TTM affiché (BAIIA `REV − CV − CF` ; exploitation = codes TEX Sommaire).
  Paramètres : picker de codes **Bilan + Compte de résultat** (feuilles
  incluses, ex. CMV.1 — `capexLinkCodeOptions`) ; « REV − CV − CF » /
  « Exploitation » (montants) et « Capex / (REV − CV − CF) » /
  « Capex / Exploitation » (ratios). Colonne **Moyenne** = moyenne des
  colonnes affichées (`averageDisplayedHorizonValues`), pas des années
  vides masquées (Annuel 5 ans).
- **Ratios financiers** (`/analysis/ratios`) : même coquille que Capex / FDR
  (hero, Tableau de bord / Sommaire, date de référence, horizons, cartes
  `dashboardCard*`). Sommaire = liquidité / rentabilité / levier + colonne
  **Moyenne** ; Annuel 5 ans = `table-fixed` + entêtes mois+année
  (`pickCapexDisplayIndices`, années vides masquées). **Paramètres** comme FDR
  (structure `statement_type="ratios"`, studio Code / Liaison / Format,
  `allowProductQuotient`). Picker = **tous les codes actifs** Bilan + CDR +
  Trésorerie, parents et feuilles (CMV.1, ALT-B, TEX-A, ancres REV/TEX, overlay
  `company_link_codes`) via `allAnalysisLinkCodeOptions`. Calcul liaison =
  `resolveWorkingCapitalStructureAmount` (BS snapshot, IS/CF TTM) ; les 7
  ratios historiques restent en repli libellé si `liaisonMode: "na"`.
  Couverture des intérêts = BAIIA / charges financières, distinct du diagnostic.
- **Annuel 5 ans / Trimestriel 2 ans** (Sommaire + Détail, Résultats + Bilan +
  Trésorerie) : sélecteur **Courant** | **Exercice** (comme Mois dernier /
  Mois passé sur Mois actuel). Mêmes dates de colonnes partout
  (`income-statement-period-basis.ts`). Courant annuel = même mois chaque année
  (Aoû 2026, Aoû 2025…) ; Exercice annuel = date de référence puis fins
  d’exercice (Aoû 2026, Déc 2025…, selon `fiscal_year_end`). Courant
  trimestriel = tous les 3 mois (Aoû, Mai, Fév…) ; Exercice trimestriel =
  QTD fiscal puis fins de trimestres. **Valeurs :** Résultats / Trésorerie Réel
  = TTM / T3M (Courant) ou YTD / QTD fiscal (Exercice) ; Bilan et Trésorerie
  Variation = snapshot à la date de la colonne.
- **Détail annexes (IS)** : `renumberAnnexesByAppearance` ne rompt pas le bloc
  sur une sous-ligne `detailOnly` masquée (ex. Stocks CMV.1) et **efface** la
  lettre des postes sommaire masqués (EXP/VNT auto-hide). Sinon Achats /
  Main-d’œuvre perdent `annexLetter`, ou ADM/AUT héritent de la lettre d’un
  EXP/VNT masqué, et la sync recollait les feuilles sous le mauvais owner →
  doublons toutes annexes. La sync itère chaque **owner visible** et ne
  remplace que son span `detailOnly` contigu (jamais un strip global par
  lettre). Visibilité / Paramètres : owner contigu, pas le premier row de
  la lettre. Dédup affichage : `uniqueStatementRowsByStructureIndex`.
  **Hypothèses Dépenses** : mêmes postes Détail que l’annexe (`detailOnly`
  via lettre du sommaire contigu — ex. Achats CMV.2 sous Annexe B même sans
  `annexLetter` stocké). Codes calculés ailleurs (CMV.11, EXP.20, IMP, FIN.2…)
  et famille **AUT** (cession d’immos AUT.3, change, placements…) exclus ;
  titre d’annexe sans poste masqué. Tableau Dépenses et Revenus : une colonne
  **% CA** à droite de chaque année (dépenses : réel N-1 puis CA projeté des
  hypothèses Revenus ; revenus : part du CA total de la colonne), avec un
  trait vertical entre chaque couple année / % CA ; pas de
  bouton « % des revenus ». Panneau hypothèse Revenus : onglets Croissance /
  Saisonnalité (plus de Sommaire ni d’Encaissement) ; Saisonnalité = courbe %
  + ligne **Revenus** (montants mensuels). Dépenses : Ajustement / Saisonnalité
  (plus de Sommaire ni Décaissement) ; Saisonnalité = courbe % + ligne **Dépenses**
  (montants mensuels). Dépenses fixes : courbes des 2 exercices réels + presets
  (année / moyenne), comme les revenus.
  Tableau Revenus : montant + % CA + croissance ; pas de ligne de délai de collection.
  Dépense variable : % des revenus totaux projetés (Hypothèse revenus), sans picker de
  poste ni option « avant la réalisation des revenus ». Saisonnalité par défaut =
  mix pondéré des postes Revenus (CA_i × saisonnalité_i) pour l’année projetée ;
  overlay / appliquer = même référence. **Ajustements** (plusieurs à la fois) :
  Montant $ = toujours non récurrent + répartition mensuelle (somme 100 %, éditeur
  compact type Saisonnalité avec « Tout à 0 % » pour placer 100 % sur un mois) ;
  % des revenus + non récurrent = mois cochés de l’année ; % + récurrent = mois de
  début puis années suivantes. Calcul = taux mensuel × CA mensuel, puis + montants $.
  Onglet Saisonnalité : courbe éditable = fond (sans ajustement) ; courbe « Avec
  ajustement » = mix Dépenses + effets des % (mois ciblés / début) et montants $ ;
  tableau = Dépenses / Ajustement / Dépenses avec ajustement.
  **Dépenses fixes** : Montant $ = Non récurrent (répartition mensuelle somme 100 %)
  ou Récurrent (mois de début, puis années suivantes avec inflation) ; Inflation (%)
  = Non récurrent (mois cochés) ou Récurrent (mois de début) — le taux remplace le
  Type/Taux sur ces mois. Saisonnalité 2024/2025/moyenne = historique **du poste** ;
  avec ajustement = courbes + tableau Dépenses / Ajustement / Dépenses avec
  ajustement.
  **Hypothèses Capex** : onglets Sommaire / Taux / Ajustement (plus d’onglet
  Décaissement séparé). Sommaire mensuel : Capex / Décaissements sur le graphique ;
  sous le graphique, tableau Coût / Valeur comptable / Amortissement (dotation) —
  `inChart: false` (pas de ligne Financement / créditeurs ici). Colonnes comme
  Revenus / Bilan :
  **Code** | **Taux** | **N-1** | **YTD** (si mois de réf. ≠ clôture) | années projetées
  (`nMinusOne-and-ytd` — ex. réf. mars 2026 → `Code` | `Taux` | `2025` | `YTD 2026` |
  `2026` | `2027`…). **En-tête (Code + Taux + années) et colonne Compte figés** au
  défilement vertical/horizontal de la carte (`max-h` + `sticky`, comme Hypothèses
  Bilan). Affichage projeté = **valeur comptable** (Coût − Amortissement cumulé) :
  Coût et Amort. cumulé issus du mapping (`alt_asset_cost` /
  `alt_accumulated_amortization`) ; **ouverture de la 1re année projetée** =
  soldes de **clôture N-1** (exercice complet — `forecastProjectionOpeningFromActuals`),
  jamais le YTD partiel ; N-1 / YTD restent des colonnes série. Sans ajustement,
  la VNC se projette quand même via la dotation. **Dotation / VNC projetées** =
  simulation mensuelle (`simulateCapexAssetYearMonths` : après chaque mois d’ajout,
  dégressif = taux/12 × VNC, linéaire = taux/12 × Coût ; saisonnalité des ajouts
  Capex) — l’annuel (détail poste + colonnes) = somme des mois / clôture décembre,
  aligné sur le Sommaire Hypothèse Capex (prise en compte acquisition mi-année).
  Panneau Ajustement : tableau Coût / Amort. cumulé / VNC ; le montant d’ajustement
  **augmente le Coût**, puis la dotation augmente l’amortissement cumulé.
  Cellules projetées **avec ajustement** : point bleu et infobulle
  (montant ajouté au coût) — distinctes de la VNC après amortissement seul.
  Sélecteur d’affichage à droite du titre : **Valeur comptable** | **Ajustements**
  | **Amortissement** (dotation de période par poste / année). Totaux de catégorie
  via les lignes **Sous-total — Annexe X** (somme des feuilles ; libellé masqué,
  montants visibles) — pas sur les titres parents ALT-B / ALT-C / ALT-D
  (Immobilisations corporelles, etc.). Colonnes N-1 / YTD : « - » en modes
  Ajustements / Amortissement.
  Chaque ajustement porte son propre financement
  (`capexFinancing` : comptant / financement / mixte) et calendrier de
  décaissement mensuel (`seasonalityMonthPercents`, « Tout à 0 % » pour un
  décaissement ponctuel) ; plusieurs ajustements par année sont additionnés.
  Dette : Intérêts seulement (option paiement résiduel) ou Capital et intérêt ;
  date de 1er paiement ≥ première année projetée ; moratoire (mois) — intérêts
  seulement pour IO, portée intérêts / capital / les deux pour C&I.
  Capex financé → `debt-forecast` avec `sourceLinkCode` : ALT-B / ALT-D
  (immos corporelles / incorporels) → **PLT-C** ; ALT-C (biens loués) → **PLT-D**
  (`debtLinkCodeFromCapexAssetLinkCode`, résolution via `linkCode` structure même si
  `rowId` est un UUID) — mêmes sections Hypothèses Financement et montants Bilan
  (PCT-H/I, PLT-C/D) que les emprunts mapping. Pas de section « Autres emprunts »
  (prêts sans code PLT exclus de l’affichage Financement).
  **Pro Forma Résultats** (Sommaire + Détail) : `title="États des résultats pro forma"` ;
  montants projetés = moteurs Hypothèses Revenus + Dépenses (`income-statement-detail`)
  sur les postes annexes / codes hyp. ; formules de liaison au Sommaire.
  **Dotation Capex → CDR** : dans Hypothèses Capex, colonne **Code** (à gauche de
  Taux) — sélection du code amortissement CDR par poste (`amortizationLinkCodes` :
  CMV.11 / EXP.20 / ADM.20 pour ALT-B/C ; EXP.21 / ADM.21 pour ALT-D). La dotation
  de période (`depreciationExpense`) est injectée au Détail + Sommaire Pro Forma
  sur le code choisi (somme des postes Capex feuilles mappés vers ce code). En
  vue **Mensuel**, la série = dotation mois par mois du Sommaire Capex
  (`resolveCapexDrivenDepreciationExpenseMonthly`), pas annuel ÷ 12. Sans
  code sélectionné = 0 $ sur les lignes amort. Inclus dans le rollup annexe
  Sommaire ; exclus des Hypothèses Dépenses. BAIIA reste REV − hyp. Dépenses.
  **Intérêts Financement → CDR** : somme des `interestPayment` (portion intérêts
  uniquement) des emprunts Hypothèses Financement — PLT-C → **FIN.3** (Intérêts
  sur la dette à long terme) ; PLT-D → **FIN.4** (Intérêts sur les contrats de
  location-acquisition). Injecté au Détail + Sommaire Pro Forma ; inclus au
  rollup annexe Frais financiers ; exclus des Hypothèses Dépenses. En vue
  **Mensuel**, la série = intérêts mois par mois du calendrier d’amortissement
  (`resolveDebtDrivenInterestExpenseMonthly` / `buildLoanMonthlyPaymentSchedule`)
  — pas une répartition saisonnière de l’annuel. Panneau emprunt : **Tableau des
  versements mensuels** (Mois / Intérêts / Capital / Solde résiduel).
  **Détail Pro Forma** = même structure d’annexes que États des résultats → Détail
  (Annexe A/B…, sous-lignes `detailOnly`, sous-totaux + ligne vide) ; pas le flat
  Hypothèses Revenus/Dépenses ; **sans Annexe Impôts** (famille IMP / Exigibles —
  le montant impôts n’apparaît qu’au Sommaire).
  **Sommaire Pro Forma** : poste propriétaire d’annexe (CMV, Frais d’administration,
  Frais financiers…) = somme des sous-lignes `detailOnly` de l’annexe (même montant
  que Sous-total — Annexe X au Détail). Cascade résultat projetée (comme N-1 / YTD) :
  **Bénéfice brut** = Revenus − CMV ; **Total des charges** = postes de la section
  Charges ; **Bénéfice avant impôts** = brut − total charges ; **Impôts** = taux
  Hypothèses Impôts (`tax-forecast`) × max(0, BAI) (infobulle à côté du libellé) ;
  **Bénéfice net** = BAI − Impôts ; **BAIIA** projeté = REV − total des postes
  Hypothèses Dépenses (somme des sous-totaux d’annexes de cette section). Sous
  **Bénéfice brut**, **Bénéfice net** et **BAIIA** (ex. BAIIA opérationnel) :
  ligne indentée **% des revenus** = montant ÷ Revenus (colonne par colonne).
  **Hypothèses Financement** : même carte / tableau que Capex (Emprunt | Taux | années).
  Clic sur un emprunt → panneau inline (nom, montant, `DebtParamsFields`) ; les
  autres lignes sont masquées. Emprunts issus du Capex financé : badge Capex +
  mention « Hypothèse Capex », panneau **lecture seule** (calendrier des versements
  visible, paramètres non modifiables — gérés dans Capex). Mapping PLT (PLT-B/C/D — pas PLT-G « Dues ») alimente le tableau
  (solde d’ouverture) ; taux / durée / remboursement se définissent dans le
  panneau, plus dans le mapping comptable. Emprunts mapping sans hypothèse
  flaggés « À définir » jusqu’à Enregistrer. Calendrier : Mois (janv. 2026…) /
  Versement / Intérêts / Capital / Solde résiduel.
  **Nouveau scénario de projection** (`/projections` + modal Pro Forma) : pas de
  picker entité / division / sous-division (société = `companyId` d’URL ou première
  de l’org ; `division_id` / `sub_division_id` nuls). Horizon toujours **annuel**
  (`projection_horizon: "annual"`), avec vue mensuelle possible ensuite. Date de
  référence = **mois + année** (`start_month` 1–12 + `start_year`).
  **Impact financier** (Hypothèses) : panneau sticky à droite
  (`ProFormaFinancialImpactPanel`) — Revenus, Bénéfice brut (+ % des revenus indenté),
  Bénéfice net (+ %), BAIIA opérationnel (+ %), trésorerie Exploitation / Investissement /
  Financement / à la fin — **sélecteur d’année projetée** ; variation vs année précédente
  ($ et % sous les montants ; pour « % des revenus », uniquement l’écart en points
  affiché en %, ex. +0,5 %) — 1re année projetée vs **N-1** (exercice complet, jamais
  le YTD) ; années suivantes vs l’année projetée précédente ; bouton masquer / rouvrir
  (`localStorage`) ; rafraîchi après `upsertForecastConfig`.
  **Pro Forma Résultats** (Sommaire + Détail) : colonnes réelles = **N-1** (exercice
  fiscal complet clos avant la date de référence) puis **YTD** (cumul d’exercice
  jusqu’au mois de référence), puis les années projetées. Ex. réf. mars 2026,
  clôture 31 déc. → `2025` | `YTD 2026` | `2026` | `2027`… Bascule **Annuel | Mensuel**
  à côté de Sommaire/Détail (`forecastColumnHorizon`) : en **Mensuel**, seules les
  années projetées sont dépliées en mois (ex. 5 ans → 60 colonnes `janv. 2026`…
  `déc. 2030`, sans N-1/YTD). **Détail** : postes Hyp. Revenus = annuel × saisonnalité
  poste ; postes Hyp. Dépenses = même moteur que l’onglet Saisonnalité
  (`avecAjustement` : variable = CA mensuel × taux mois + $ ; fixe = N−1 mensuel ×
  inflation mois + $) — pas une simple répartition de l’annuel. Sous-totaux d’annexe
  = somme des postes. Cascade Sommaire via `expandProjectedAnnualTrendToMonthly` +
  `recomputeProFormaMonthlyIsCascade`. **Amortissement Capex** (CMV.11 / EXP.20 /
  ADM.20 / EXP.21 / ADM.21) : en Mensuel, dotation mois par mois du moteur Hypothèses
  Capex Sommaire (`resolveCapexDrivenDepreciationExpenseMonthly` /
  `simulateCapexAssetYearMonths`) — pas une répartition plate de l’annuel.
  **Intérêts Financement** (FIN.3 / FIN.4) : en Mensuel, intérêts mois par mois du
  calendrier d’emprunt (`resolveDebtDrivenInterestExpenseMonthly`). La
  **fréquence de paiement** Hypothèses Impôts
  (`taxPaymentFrequency`) pilote les acomptes trésorerie/bilan, pas la charge IS
  mensuelle. **Hypothèses Revenus,
  Dépenses et Capex** reprennent les mêmes colonnes. Les configs gardent
  l’index 0 = réel / 1+ = projeté ; N-1 est une colonne d’affichage supplémentaire
  (clic d’hypothèse seulement sur les années projetées). **Croissance % / $** de
  la 1re année projetée (ex. 2026) s’applique sur le **dernier exercice complet
  (N-1)**, pas sur le YTD (période partielle) ; les années suivantes croissent
  sur l’année projetée précédente. Même règle pour les **dépenses fixes**
  (inflation Type/Taux : composé depuis N-1, pas le YTD).
  **Pro Forma Bilan** (Sommaire + Détail) : même idée, mais en **soldes** (snapshot),
  pas des cumuls. N-1 = solde à la dernière clôture d’exercice ; **YTD seulement si**
  le mois de référence ≠ mois de clôture (sinon pas de colonne intermédiaire).
  Ex. réf. mars 2026, clôture 31 déc. → `2025` (31 déc. 2025) | `YTD 2026` (31 mars 2026)
  | `2026` | `2027`… ; réf. décembre 2026 → `2025` puis années projetées.
  **Sommaire Pro Forma Bilan** = mêmes montants projetés qu’**Estimation du Bilan
  annuel** (moteur d’hypothèses + config `balance-sheet-forecast`), en lecture
  seule (`forceBilanHypothesisAmounts`, pas de panneau d’ajustement ni pastilles
  « Hypothèse Capex / Impôts / … »). Pas de vue **Détail** pour le Bilan pro forma
  (bascule Sommaire/Détail masquée).
  **Pro Forma Trésorerie** (Sommaire + Détail) : mêmes colonnes que le Bilan
  Pro forma (N-1 + YTD si le mois de référence ≠ clôture, puis années projetées).
  Réel = cumul d’exercice (N-1 = exercice clos, YTD = jusqu’au mois de référence) ;
  Variation = soldes à ces dates. Hypothèses trésorerie : une seule colonne réelle.
  **Pro Forma Trésorerie — montants projetés** : Bénéfice net = BN Résultats pro forma ;
  postes Réel IS (amort. corporelles/incorporelles → intérêts / AUT jusqu’aux pertes
  (gain) litige) = mêmes montants que le Détail Résultats pro forma (via codes
  attachés TEX→IS + Capex/Financement) ; **colonnes réelles (N-1 / YTD)** = montants
  déjà calculés du **Cashflow Détail** (`preserveForecastActualColumnsFromBase`) —
  l’injection pro forma ne touche que les années projetées ;
  **Variation du FDR / investissement /
  financement** = `variation_nn1` / `variation_n1n` sur soldes **Bilan pro forma** :
  1re année projetée vs **N-1** (jamais le YTD) ; années suivantes vs l’année
  projetée précédente. Sans driver d’hypothèse bilan, le solde projeté **reporte**
  l’ouverture (N-1 puis année précédente) pour une variation 0 $ (ex. capital-actions) ;
  N-1/YTD série CF ne comble que les soldes encore vides (n’écrase pas un stock BS).
  **Trésorerie au début** projetée = **Trésorerie à la fin** de N-1 (exercice complet,
  jamais le YTD) ; années suivantes = fin de l’année précédente
  (`chainProFormaBeginningCashTrend`). **Dispositions (acquisitions)** ALT-B / ALT-C /
  ALT-D = ± somme des **ajustements Hypothèses Capex** de la famille (pas le Δ VNC) ;
  **Variation des impôts exigibles** = Δ(Passif PCT-FF − Actif ACT-H) via le moteur
  Impôts. Pas d’ouverture de lignes (GL) sur le CF pro forma (`disableRowInteractions`).
  Détail Pro Forma : pas d’ouverture de lignes (GL / annexes) ; postes à 0 $ masqués
  (même filtre d’horizon que le Détail historique). Sommaire Pro Forma : pas d’ouverture
  de lignes non plus.
  Hypothèses Bilan : N-1 + YTD (même date de référence que Revenus / Bilan pro forma).
  **Hypothèses Impôts** : taux unique (`tax-forecast`, défaut 26 %) applicable aux
  années projetées (poste IMP) + **Paiement des impôts** (`taxPaymentFrequency` :
  Mensuel / Trimestriel / Semestriel / Annuel, défaut Annuel). **Actif d'impôts
  exigibles** (ACT-H) et **Passif d'impôts exigibles** (PCT-FF) : mention
  « Hypothèse Impôts », non ajustables au bilan ; soldes projetés liés =
  Impôts pro forma de l’année + Passif ouverture − Actif ouverture
  − Impôts de la période précédente payés (1re année = charge N-1 réelle ;
  ensuite = impôts projetés de l’année précédente). Horizon annuel = 100 %
  versé quelle que soit la fréquence (acomptes utiles en mensuel). Ouverture
  1re année = N-1 / exercice complet, puis soldes projetés précédents ; si
  net > 0 → Passif, si net < 0 → Actif = |net|.
  **Hypothèses Bilan** : même tableau que le **Sommaire** du bilan (`Estimation du Bilan annuel`),
  sans les sous-lignes Détail / annexes ; **ligne Validation** au-dessus de la section Actif
  (écart = Total actif − Total passifs et capitaux propres, comme le Bilan Sommaire ;
  bandeau ambre si déséquilibré) ; colonnes = **même date de référence** que
  Hypothèses Revenus (`nMinusOne-and-ytd` : N-1 + YTD puis années projetées — ex. réf.
  mars 2026 → `2025` | `YTD 2026` | `2026` | …). Ajustements live
  (`bilanAdjustmentsOverride` → `useProFormaCashFlowProjected`) : Encaisse / Découvert
  se recalculent immédiatement (WC + Trésorerie à la fin). **Dividendes** (CAP-C) →
  CF pro forma « Versement de dividendes » (CAP-C.2 / libellé) = −|dividendes| sur les
  années projetées (`isCashFlowDividendPaymentRow` / `buildProFormaDividendPaymentTrend`).
  Sous-totaux (Total ACT, Total de
  l'actif, Total du passif, etc.) = **même logique que le Bilan Sommaire** :
  `formula` (± refs) ou `liaisonMode: "sum"` + `liaisonSumCodes` (ex. ACT-* + ALT-*
  pour Total de l'actif), sinon repli positionnel ; N-1 / YTD / années projetées ;
  non cliquables. Titres de section (Actif, Passif…) : pas de clic ; montants à 0 $
  invisibles. Clic sur une année projetée (postes) → panneau
  d’ajustement (Montant $ ; comptes clients et stocks : drivers ; créditeurs :
  délai de paiement / CMV ou % des revenus ; **Bénéfices non répartis** (CAP-C) :
  panneau **Bénéfice de la période** (lecture seule = BN projeté aligné Résultats
  pro forma : REV − hyp. Dépenses − dotation Capex − intérêts Financement − impôts) +
  **Dividendes** (modifiable) ; solde projeté =
  ouverture du **dernier exercice complet** pour la 1re année projetée
  (N-1 si YTD partiel ; sinon la seule colonne réelle = exercice complet),
  puis ouverture = BNR projeté de l’année précédente ; + BN − dividendes ;
  autres postes ACT : Montant $ ou
  **% des revenus** ; **Produits reportés** (PCT-PD) : Montant $ ou **% des revenus** ;
  récurrent, note). Encaisse (ACT-A / ACT-A.1) et **Découvert
  bancaire** (PCT-A) ne sont pas ajustables : mention « Trésorerie à la fin » ;
  montants projetés = split de la **Trésorerie à la fin** du CF pro forma
  (`buildProFormaCashFlowYearRows` / `computeProFormaEndingCashTrend` — **même builder**
  que CashFlowDetail pro forma années : TIN Coût, TTM fiscal, reconcile GL, inject
  WC/IS/Capex, formules, trésorerie fixe) : fin > 0 → Encaisse = fin et Découvert = 0 $ ;
  fin < 0 → Encaisse = 0 $ et Découvert = |fin| ; fin = 0 → les deux à 0 $.
  **Portion court
  terme - Dette long terme** (PCT-H), **Portion court terme - Location-acquisition**
  (PCT-I), **Dette à long terme** (PLT-C) et **Obligations de location-acquisition**
  (PLT-D) : mention « Hypothèse Financement » ; emprunts mappés sur PLT-C/D.
  **PCT-H / PCT-I** = capital + intérêts des **12 prochains mois** (amortYear + 1) ;
  **PLT-C / PLT-D** = `endingBalance` − capital des 12 prochains mois (jamais négatif ;
  0 $ sans hyp. définie). Comptes clients (ACT-C) : **Délai de collection des clients**
  ou **% des revenus**, avec les 2 derniers exercices réels sous chaque option
  (soldes de **clôture d’exercice** N-2 / N-1 — mêmes montants que la colonne N-1
  du tableau, pas le mois de référence YTD) ;
  le montant projeté = CA × jours/365 ou CA × % (CA = revenus projetés Hypothèses
  Revenus, via `forecastDisplayToConfigYearIndex` — feuilles d’annexe, jamais le
  total parent ; sans hypothèse revenus l’année vaut 0 $, pas de croissance
  implicite).   Stocks (ACT-F) : **Délai de rotation des stocks** (base **CMV projeté** des
  Hypothèses Dépenses — 0 $ si aucune dépense CMV projetée, jamais inventé depuis N-1 / CA)
  ou **Stocks en % des revenus** (même CA projeté que comptes clients) ; historique N-2 / N-1
  avec CMV + REV (clôtures d’exercice).   Créditeurs (PCT-C) et **Créditeurs - Apparentés** (PCT-D) : **Délai de paiement des créditeurs**
  (Créditeurs = **CMV projeté** × jours / 365 ; 0 $ sans hyp. dépenses CMV)
  ou **% des revenus** (même CA) ;
  historique N-2 / N-1 avec AP + CMV + REV aux mêmes clôtures. **Immobilisations
  corporelles / Biens loués / Actifs incorporels** (ALT-B / ALT-C / ALT-D) : non
  ajustables — mention « Hypothèse Capex » ; montants projetés = **valeur comptable**
  Hypothèses Capex (`capex-forecast`, même moteur que Estimation des Capex —
  amortissement + ajouts au coût).   Parent en `liaisonMode: "sum"` (ex. Immobilisations corporelles) : Capex prioritaire sur la
  somme liaison (feuilles souvent `detailOnly` absentes du Sommaire) ; rollup =
  somme des VNC Capex de **toutes** les feuilles descendantes (avec ou sans
  ajustement — même total qu’Hypothèses Capex après rollup parent) via `linkCode`
  stocké sur l’ajustement / peers Capex. Autres ACT (ex. ACT-B Placements temporaires, ACT-D, ACT-J…) :
  **Montant $** ou **% des revenus** (même CA) ; le % remplace le solde, le
  montant s’ajoute à la base.
  « Appliquer aux années suivantes »
  reporte le délai ou le %, pas le montant ; chaque année suivante applique
  la même formule (CA de l’année pour le % ; CMV projeté de l’année pour le délai). Première
  année projetée = année civile courante (comme Revenus) ; les 2 exercices
  réels affichés sont N-2 et N-1.
- Cash flow is derived from income statement + balance sheet deltas
- **Sommaire** trésorerie : lignes cochées « Annexe » (`showInSummary`) dans
  Détail → Paramètres ; même moteur de calcul que le Détail (`variant="summary"`).
  Paramètres Sommaire : espace / gras / séparation via overlay
  (`summaryOnly` spacers, `summaryIsBold` / `summaryIndent` / `summarySeparatorAbove`)
  — n’affecte pas l’affichage Détail.
- CF codes (TEX/TIN/TFI) with `attached_link_codes` including `CAP-C.1` reuse the
  bilan CAP-C.1 formula (REV CT×−1 − charges) over the **selected horizon months**
  (mois courant = that month only; YTD = Jan→mois; not always YTD like BS CAP-C.1)
- See `docs/plans/` for detailed design documents

### Diagnostic (rapport VC)

- `GET /api/companies/{id}/diagnostic` (read gate `verify_company_access`, viewers OK)
  accepts optional `fiscal_year` + `month` query params (calendar dates, same as
  financial statements) to anchor the report; without them, the latest trial-balance
  period is used. Returns a single aggregate payload (`app/schemas/company_diagnostic.py`):
  `reference_period`, 5-year trends (YTD window aligned on the reference month),
  trends, seasonality, per-division profitability, product/service margins, 5-year
  ratios, capex, and an indicative EBITDA-multiple valuation. Computed in
  `app/services/company_diagnostic.py` on top of the statement engine using
  link-code **family** sums (REV/CMV/… — never label matching); EBITDA = EBIT +
  amortissement; equity = assets − liabilities; capex = ΔALT net + amortissement.
  Product scoping uses `_product_filter_ctx` (ContextVar in
  `financial_statements.py`); multiples come from `ForecastConfig`
  `config_type="ebitda_multiple"` else default 3–5× (rationale notes the default).
- Frontend: `/modules/diagnostic?companyId=…` (static route beats the `[moduleId]` placeholder;
  reached via the module nav when a company is selected — same pattern as Projections).
  **Portail** : liste / création des diagnostics (registre `localStorage` via
  `lib/diagnostic-registry.ts`, incl. `referenceYear` / `referenceMonth` per entry);
  rapport à `/modules/diagnostic/[diagnosticId]?companyId=…`. Redesigned (2026-07) as a
  light-theme report aligned with financial-statement pages: components in `frontend/components/diagnostic/v2/`
  (hero with 0-100 health index, KPI strip, hand-written SVG charts — **no
  Recharts** — drill-down drawer, sticky nav rail). Client-side derivations
  (health index, typed signals, ratio definitions) in `lib/diagnostic-derive.ts`;
  design tokens in `lib/diagnostic-theme.ts`; sector medians **hardcoded** in
  `lib/diagnostic-benchmarks.ts` (should move to the backend eventually —
  original handoff's `api-gaps.md` lists Phase-2 payload fields: EBITDA bridge,
  per-year seasonality, cash flow, debt, headcount, multi-method valuation).
  `diagnostic-format.ts` + `diagnostic-skeleton.tsx` (kept from v1) still used;
  hook `use-company-diagnostic.ts` (passes reference date to the API). E2e (fully mocked) in
  `frontend/e2e/diagnostic.spec.ts` + `diagnostic-visual.spec.ts`; testids:
  `kpi-cards`, `lifecycle-badge`, `division-row-{id}`, `valuation-notes`,
  `diagnostic-error`, `diagnostic-signal`, `products-empty-state`.
  **Rapport (nav rail):** vues Performance / Revenus / Marge par Revenus / Dépenses /
  **Divisions** — la vue Divisions (sous Dépenses) réutilise la config chart
  `diagnostic-expenses`, charge une série ER par division (`division_id` sur
  l'API series) et construit un pont REV → CV → marge contributive → CF → bénéfice
  d'exploitation par division via `lib/division-profitability.ts` (mapping `divisions`
  CSV) ; tableau `DivisionProfitabilityTable`, lecture CPA
  `division-profitability-narrative`, tableaux indicateurs extensibles (REV / CV / CF).
  **Situation financière** (`diagnostic-financial-position`) : bilan ACT/ALT/PCT/PLT/CAP,
  libs `financial-position*.ts`, graphiques dual-panel `financial-position-chart.tsx`.
  **Fonds de roulement** (`diagnostic-working-capital`, indenté sous Situation financière) :
  réutilise la structure `working-capital` (même moteur que `/analysis/working-capital`,
  `working-capital-structure-utils.ts`) + séries bilan + CDR (TTM) ; graphiques FDR/FdRHC
  et cycle DSO/DIO/DPO/CCC (`working-capital-diagnostic-chart.tsx`) ; lecture +
  tableaux indicateurs dans `working-capital-diagnostic-{narrative,breakdown}.ts`.
- Known deltas vs analysis pages (deliberate, flagged for product review): capex
  differs from `/analysis/capex` (ΔALT vs Δ of first BS total row);
  `interest_coverage` = EBIT/FIN here vs EBITDA/FIN on `/analysis/ratios`.

### Authorization (RBAC)

Roles (see `app/dependencies.py`):
- **superadmin** — `User.is_superadmin` (platform staff): full access to every org,
  and the only role allowed to manage the global chart of accounts. Granted
  out-of-band (not via the UI): `python -m app.scripts.set_superadmin <email>`
  (add `--revoke` to remove).
- **admin** — `UserOrganization.role = admin`: full read+write on all companies in
  their org; manages company entities (create/update/delete + divisions) and
  (later) grants access to others.
- **user** — `role = member`: read+write only on companies granted via
  `user_company_access`, or all org companies if `UserOrganization.all_companies`.
- **viewer** — `role = viewer`: read-only on granted companies (writes → 403).

Enforcement is centralized:
- `verify_company_access(db, user, company_id, require_write=False)` is the single
  gate — returns 404 for no-access (never leaks existence), 403 for a viewer write.
  Every company-scoped read endpoint calls it.
- `enforce_company_write` is a router-level dependency attached in `main.py` to the
  company-scoped data routers: it rejects any non-safe HTTP method (write) by
  viewers / ungranted users, covering all current and future mutations. (QBO is
  gated explicitly instead, because it has an unauthenticated OAuth callback.)
- `require_org_admin` / `require_superadmin` gate org-admin and platform actions.
- `list_companies` is role-scoped; `create_company` + division CRUD are admin-only.

Client (organization) management + feature flags are **superadmin-only**
(`app/routers/admin.py`, prefix `/api/admin`): list clients, create a client
(org + first admin user by email — they set their password via "forgot password"),
and toggle per-client feature flags. Flags are a fixed registry
(`app/services/feature_flags.py`); `Organization.feature_flags` stores overrides,
and the effective flags (defaults merged with overrides) are returned on each org
in `/api/auth/me`. Frontend: `/settings/clients` (superadmin-only). Read flags in
the UI via `usePermissions`/auth-context org `feature_flags` to gate features.

Grant management (admin-only) lives on the org members API
(`/api/organizations/{org_id}/members`): list/invite/update-role/remove plus
`PATCH .../{user_id}` for the `all_companies` toggle and
`PUT .../{user_id}/companies` to set per-company grants. Frontend:
`/settings/users` (the "Accès" dialog per member).

Superadmin global-code CRUD (the only writes to the shared chart): `POST/PATCH/DELETE
/api/standard-link-codes` gated by `require_superadmin` (`app/services/coa_admin.py`)
— create is additive + versioned, delete tombstones (never hard-deletes), edits are
in-place metadata. `is_superadmin` is exposed on `/api/auth/me`. Frontend:
`/settings/standard-codes` (superadmin-only). This retires the MO.xlsx seed for
ongoing changes.

Frontend role-awareness: the `usePermissions()` hook (`hooks/use-permissions.ts`)
exposes `canEdit` (false for viewers); edit controls are hidden for viewers on
mapping, trial balance, custom link codes, notes (note-modal), and the company
settings page (name/fiscal/currency/cumulative-TB + division & sub-division
CRUD + delete-company). The backend is the source of truth (viewer writes → 403);
the hook is UX only.

### Trial balance storage

- `trial_balance_entries` is **RANGE-partitioned by `fiscal_year`** in PostgreSQL
  (migration 015): composite PK `(id, fiscal_year)`, a `DEFAULT` partition so
  inserts for any year never fail, plus explicit yearly partitions (2015–2035).
  Add future-year partitions with
  `CREATE TABLE trial_balance_entries_y<YYYY> PARTITION OF trial_balance_entries FOR VALUES FROM (<YYYY>) TO (<YYYY+1>)`.
  On SQLite (tests) it's a plain composite-PK table.
- **Rollup:** `account_annual_balances` (model `AccountAnnualBalance`) caches the
  annual total per GL account. `app/services/tb_rollup.refresh_annual_balances`
  rebuilds a (company, fiscal_year) slice from the entries; it's called after
  every TB write (trial-balance upsert/upload/delete + QBO commit). Read via
  `GET /api/companies/{id}/trial-balance/annual-summary?fiscal_year=`. Derived
  cache — never the source of truth; the compute service still reads raw entries.

### Link codes (chart of accounts)

- **Global registry:** `standard_link_codes` (model `StandardLinkCode`) is the
  shared, org-agnostic standardized chart, seeded from `data/MO.xlsx` via
  `python -m app.scripts.seed_standard_link_codes` (idempotent upsert by `code`).
  Read-only API at `/api/standard-link-codes`. Hierarchy via `parent_code`/`is_leaf`;
  only leaf codes are assignable.
- **Tenant-local overlay:** `company_link_codes` (model `CompanyLinkCode`) holds
  per-company custom codes for accounting-complex clients. They stay private to
  the company (never auto-shared). Codes are auto-generated in a reserved
  namespace (`{FAMILY}-Z{n}`) and validated never to collide with a global code.
  CRUD at `/api/companies/{id}/custom-link-codes`; creation also appends an
  assignable leaf to the company's `CompanyStatementStructure` so it renders.
  Frontend: `CompanyCustomLinkCodes` panel on the "Code de liaison" page.
- **Resolution is unified:** `app/services/link_code_resolver.py` is the single
  source of truth — a code is assignable if it's a global leaf OR a leaf in the
  company's overlay. Both validation gates (manual `account-mappings` upsert and
  QBO `commit_trial_balance`) and both pickers use it.
- **Curated promotion (Phase 4):** each `CompanyLinkCode` has a `promotion_status`
  ("pending" | "promoted" | "rejected"). A curator works a queue at
  `/api/coa/promotion-candidates` (org-scoped): each candidate shows a
  duplicate-suggestion by **rollup signature** (family + ft_category + account_type,
  not label). `POST .../{id}/promote` either links the candidate to an existing
  global code (`link_to_existing_code`) or publishes a NEW global code additively
  as a fresh `CoaVersion` (`app/services/coa_promotion.py`); `POST .../{id}/reject`
  drops it from the queue. Promotion sets `promoted_to_standard_code`. Never
  auto-shares. **Superadmin-only** (it writes the shared global chart) — the queue
  lists pending candidates across all orgs. Frontend: `CoaPromotionQueue` at
  `/settings/coa-promotion` (superadmin-gated; e2e `frontend/e2e/coa-promotion.spec.ts`).
- **Versioning (lightweight):** `coa_versions` (model `CoaVersion`) is an audit
  history — one row per seed/publish run; current version = `max(version)`.
  `Company.coa_version` stamps the chart cohort a company was created under.
  `StandardLinkCode` has `is_active` + `deprecated_at` + `coa_version`: the seed
  (`apply_records` in `seed_standard_link_codes.py`) is now additive — it bumps
  the version, upserts/reactivates present codes, and **tombstones** codes absent
  from the new MO.xlsx (never hard-deletes), so historical references stay
  resolvable. NOTE: existing companies are already insulated from chart changes
  because their `CompanyStatementStructure` is a per-company snapshot taken at
  creation (compute reads that snapshot, never live `standard_link_codes`).

## QuickBooks Online integration

Per-company connector in `backend/app/integrations/quickbooks/`:

- **OAuth2 flow** with Intuit (sandbox by default). Tokens stored in
  `quickbooks_connections` table, encrypted at rest via Fernet
  (`QBO_TOKEN_ENCRYPTION_KEY`). State CSRF JWT signed with `JWT_SECRET_KEY`,
  audience `qbo-oauth`.
- **Two-step preview/commit:** `POST /api/quickbooks/companies/{id}/trial-balance/preview`
  pulls TB + returns rows with `existing_link_code` (no DB writes). `POST .../commit`
  upserts `ChartOfAccount`, `AccountMapping`, and `TrialBalanceEntry` in one
  transaction.
- **TB schema fit:** preview/commit take `fiscal_year` + `month` (matching
  `TrialBalanceEntry`), not `as_of_date`. QBO pulls are always cumulative
  (YTD: fiscal-year-start through end-of-target-month). On commit, the
  company is forced to `is_cumulative_tb=True` so the FS service interprets
  the stored YTD entries correctly.
- **Strict link-code picker:** the QBO review screen reads valid link codes from
  the **global** `standard_link_codes` registry (leaf codes only) unioned with the
  company's tenant-local overlay (see "Link codes" above). `commit_trial_balance`
  rejects any non-skipped row whose `link_code` is not assignable for that company
  (422), via `link_code_resolver`.
- **Class/Location tagging:** preview/commit also pull a GeneralLedger report to
  discover which QBO Classes (→ `AccountMapping.divisions`) and Locations/Lieux
  (→ `AccountMapping.sub_divisions`) each account appears under. The preview
  merges discovered values with existing tags (union) and shows them as editable
  chips (`QuickBooksTagCell`); commit writes the CSV and additively upserts
  `Division`/`SubDivision` rows for observed (class, location) pairs. Discovery
  is best-effort — GL/prefs failures degrade to empty tags and never block the
  TB import. Tracking-on flags are derived from discovered data, not Preferences.
- **Frontend:** `/settings/companies/[id]/quickbooks` with three states
  (not_connected / connected / revoked) and a `QuickBooksReviewTable` for
  per-row mapping review.
- **Tests:** `backend/tests/integrations/quickbooks/` mocks Intuit via `respx`.
  Frontend e2e in `frontend/e2e/quickbooks.spec.ts` mocks all backend endpoints.
- **Sandbox setup + smoke checklist:** `docs/quickbooks-release-checklist.md`.

ALWAYS USE TEAMS WHEN DEEMED NECESSARY
TEAMS SHOULD BE COMPOSED OF 
- BACKEND DEVELOPER
- FRONTEND DEVELOPER
- PROJECT MANAGER
- QA ENGINEER
- SYSTEM ARCHITECT

ALWAYS TEST IN PLAYWRIGHT

UPDATE YOUR CLAUDE.MD FILE WHEN NEEDED TO KEEP IMPORTANT INFORMATION