import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Clause de non-responsabilité | Modelisys",
  description:
    "Clause de non-responsabilité de Modelisys — source des données, limites des analyses, absence de conseils, et limitation de responsabilité (Québec/Canada).",
}

function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-xl sm:text-2xl font-semibold text-[#2A2F3A] tracking-tight">
      {children}
    </h2>
  )
}

function BulletList({ items }: { items: Array<string | JSX.Element> }) {
  return (
    <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[#5C5F66]">
      {items.map((it, idx) => (
        <li key={idx} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
          <div className="min-w-0">{it}</div>
        </li>
      ))}
    </ul>
  )
}

export default function ClauseDeNonResponsabilitePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
      </div>

      <GlassmorphismNav />

      <main className="relative z-10 pt-24 pb-16 sm:pb-24">
        <div className="max-w-[1200px] mx-auto px-8 sm:px-12 lg:px-16">
          <section className="relative py-10 lg:py-14">
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Juridique</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              Clause de non-responsabilité
            </h1>
            <p className="text-lg sm:text-xl text-[#5C5F66] max-w-3xl leading-relaxed">
              Dernière mise à jour : 29 janvier 2026 — Juridiction du Québec (Canada)
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10 pb-10">
            <div className="space-y-10">
              <div className="rounded-[28px] border border-slate-200 bg-white/80 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 p-7 sm:p-9">
                <div className="space-y-8">
                  <div>
                    <SectionTitle id="source">1. Source et intégrité des données</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Toutes les données financières historiques utilisées, traitées ou affichées au sein de
                      Modelisys (incluant, sans s’y limiter, les modules de tableaux de bord, états financiers,
                      projections, analyses, mapping comptable, codes de liaison, balance de vérification, budgets,
                      notes et scénarios) proviennent exclusivement d’informations fournies, téléversées, importées
                      (ex. fichiers Excel) ou validées par l’utilisateur, ou par des tiers agissant pour le compte
                      de l’utilisateur.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Modelisys n’effectue aucune vérification, aucun audit, aucune attestation ni aucune
                      validation indépendante quant à l’exactitude, l’exhaustivité, la cohérence, l’actualité ou la
                      conformité comptable ou réglementaire de ces données.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Certaines données de référence (ex. taux de change, indices, référentiels, multiples ou
                      informations sectorielles) peuvent provenir de fournisseurs tiers ou d’intégrations/API.
                      Modelisys ne contrôle pas, ne vérifie pas et ne garantit pas l’exactitude, l’exhaustivité, la
                      fiabilité, l’actualité ou la disponibilité continue de ces données tierces et n’assume aucune
                      responsabilité pour les erreurs, omissions, retards ou modifications provenant de sources
                      externes.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="hypotheses">2. Dépendance aux hypothèses et à la méthodologie</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Toutes les analyses, projections, prévisions, ratios, graphiques, visualisations et résultats
                      générés par Modelisys dépendent intrinsèquement :
                    </p>
                    <BulletList
                      items={[
                        "des données financières historiques fournies;",
                        "des hypothèses, classifications, estimations et jugements sélectionnés par l’utilisateur (ex. choix de mapping, paramètres, hypothèses de croissance, structure des états); et",
                        "des modèles, méthodologies et paramètres appliqués au sein du Service.",
                      ]}
                    />
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les modèles financiers et les méthodologies sont des représentations simplifiées de la réalité
                      et comportent des limites inhérentes. Des hypothèses, méthodologies ou données alternatives
                      peuvent produire des résultats sensiblement différents. Toute inexactitude, omission,
                      incohérence ou mauvaise interprétation des données ou des hypothèses sous-jacentes peut avoir
                      une incidence significative sur les résultats générés.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="aucun-conseil">3. Aucun conseil, aucune opinion d’évaluation, aucune recommandation</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les informations générées par Modelisys sont fournies uniquement à des fins d’analyse
                      financière, de modélisation et d’aide à la décision. Elles ne constituent pas et ne doivent
                      pas être interprétées comme :
                    </p>
                    <BulletList
                      items={[
                        "des conseils professionnels en matière de comptabilité, de fiscalité, de droit, de réglementation ou de finance;",
                        "une opinion indépendante sur la valeur, une évaluation, une opinion d’équité ou une conclusion d’évaluation;",
                        "une recommandation en matière d’investissement, de financement, de prêt, de restructuration ou de transaction; ou",
                        "une offre, une sollicitation ou une recommandation d’achat, de vente ou de détention de tout titre ou actif.",
                      ]}
                    />
                  </div>

                  <div>
                    <SectionTitle id="fiabilite">4. Aucune garantie de fiabilité</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les analyses et les résultats générés par Modelisys ne doivent pas être considérés comme le
                      seul fondement de toute décision commerciale, d’investissement, de financement, d’évaluation
                      ou transactionnelle. Les utilisateurs et tout tiers doivent exercer un jugement indépendant
                      et, le cas échéant, obtenir les conseils de conseillers professionnels qualifiés.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="responsabilite-utilisateur">5. Responsabilité de l’utilisateur</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      L’utilisateur demeure entièrement et exclusivement responsable :
                    </p>
                    <BulletList
                      items={[
                        "de la qualité, de l’exactitude, de l’exhaustivité et de la pertinence de toutes les données fournies à la plateforme ou utilisées au sein de celle-ci;",
                        "de l’examen, de la validation et de l’interprétation de toutes les analyses et de tous les résultats générés; et",
                        "de l’utilisation de toute analyse, de tout rapport ou de tout résultat dans le cadre de transactions, de financements, de conformité réglementaire, de prises de décisions internes ou de communications avec des tiers.",
                      ]}
                    />
                  </div>

                  <div>
                    <SectionTitle id="prospectif">6. Énoncés prospectifs</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les informations financières historiques, même lorsqu’elles sont complètes et exactes, ne
                      constituent pas une garantie de rendement futur. Les projections, prévisions et résultats de
                      modélisation sont de nature prospective et reposent sur des hypothèses susceptibles d’évoluer
                      dans le temps. Les résultats réels peuvent différer sensiblement en raison de facteurs
                      économiques, opérationnels, réglementaires, de marché ou autres.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="tiers">7. Communications à des tiers</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Dans toute communication ou divulgation à des tiers (y compris les prêteurs, investisseurs,
                      actionnaires, organismes de réglementation, auditeurs ou autres parties prenantes), les
                      utilisateurs sont fortement encouragés à divulguer que les analyses et résultats ont été
                      générés à l’aide d’une plateforme logicielle, qu’ils reposent sur des données et des
                      hypothèses fournies par l’utilisateur et qu’ils n’ont pas été vérifiés, audités ou certifiés
                      de manière indépendante.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="relation">8. Aucune relation fiduciaire ou de conseil</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      L’utilisation de Modelisys ne crée aucune obligation fiduciaire, aucune relation de conseil,
                      aucun mandat professionnel ni aucune relation client entre l’utilisateur et Modelisys, ses
                      développeurs, concédants de licence, fournisseurs de données ou prestataires de services.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="reglementaire">9. Limitations d’utilisation réglementaire et formelle</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Modelisys n’a pas pour objet de produire, et ne remplace pas, une évaluation formelle, une
                      expertise, une opinion d’équité ou toute autre opinion requise aux fins de rapports légaux,
                      de déclarations réglementaires, de litiges, de cotisations fiscales ou de toute autre fin
                      nécessitant la certification d’un professionnel agréé ou accrédité, sauf si la loi applicable
                      l’autorise expressément.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="limitation">10. Limitation de responsabilité</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Dans toute la mesure permise par la loi applicable, Modelisys, ses développeurs, concédants
                      de licence, fournisseurs de données et prestataires de services déclinent expressément toute
                      responsabilité à l’égard des décisions prises, des mesures adoptées ou des pertes subies en
                      raison de l’utilisation des informations générées par la plateforme ou de la confiance
                      accordée à celles-ci. Cela comprend, sans s’y limiter, tout dommage direct, indirect,
                      accessoire, consécutif, spécial ou punitif, même si la possibilité de tels dommages a été
                      signalée.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 h-fit rounded-[28px] border border-slate-200 bg-white/75 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 p-6">
              <p className="text-sm font-semibold tracking-wide text-[#2A2F3A]">Sommaire</p>
              <nav className="mt-4 space-y-2 text-sm">
                {[
                  ["source", "1. Source des données"],
                  ["hypotheses", "2. Hypothèses & méthodologie"],
                  ["aucun-conseil", "3. Aucun conseil"],
                  ["fiabilite", "4. Aucune garantie"],
                  ["responsabilite-utilisateur", "5. Responsabilité utilisateur"],
                  ["prospectif", "6. Prospectif"],
                  ["tiers", "7. Communications à des tiers"],
                  ["relation", "8. Aucune relation de conseil"],
                  ["reglementaire", "9. Limitations formelles"],
                  ["limitation", "10. Limitation de responsabilité"],
                ].map(([id, label]) => (
                  <a key={id} href={`#${id}`} className="block text-[#5C5F66] hover:text-[#E0742D]">
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-6 border-t border-slate-200 pt-5 text-xs text-[#5C5F66]">
                Questions?{" "}
                <Link href="/contact" className="text-[#E0742D] hover:underline">
                  Contactez-nous
                </Link>
                .
              </div>
            </aside>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

