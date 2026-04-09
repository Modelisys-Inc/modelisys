import type { Metadata } from "next"
import Link from "next/link"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Politique de confidentialité | Modelisys",
  description:
    "Politique de confidentialité de Modelisys — traitements de données, sécurité, conservation et droits (Québec/Canada).",
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

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100/50">
      {/* Fond aligné sur les pages publiques */}
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
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">
              Politique de confidentialité
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-semibold leading-tight tracking-tight text-[#2A2F3A]">
              Politique de confidentialité de Modelisys
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
                    <SectionTitle id="portee">1. Portée</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      La présente Politique de confidentialité décrit la manière dont Modelisys (le « Service »)
                      recueille, utilise, conserve, communique et protège les renseignements personnels et les
                      données d’affaires traités par l’entremise de la plateforme, incluant les environnements
                      d’analyse financière, de projections et de configuration (ex. sociétés, états financiers,
                      mappings, budgets, notes et scénarios).
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="categories">2. Catégories de données traitées</SectionTitle>
                    <BulletList
                      items={[
                        "Données d’identification et de compte (nom, courriel, organisation, rôle et paramètres de compte).",
                        "Données d’authentification et d’accès (jetons de session, témoins nécessaires, journaux d’accès, mesures antifraude).",
                        "Données d’affaires téléversées ou saisies par les utilisateurs : données comptables et financières (ex. balances, états financiers, mappings comptables), hypothèses, budgets, notes, pièces de travail et autres contenus liés à l’analyse.",
                        "Données d’utilisation et diagnostics (métadonnées, journaux techniques, performance, erreurs, statistiques d’usage).",
                        "Données de marché et de référence obtenues via intégrations/API (ex. taux de change, référentiels ou structures), lorsque configurées.",
                      ]}
                    />
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Le Service est destiné à un usage professionnel. Modelisys ne recueille pas intentionnellement
                      de renseignements personnels de consommateurs.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="finalites">3. Finalités du traitement</SectionTitle>
                    <BulletList
                      items={[
                        "Fournir et exploiter le Service (création de comptes, gestion des organisations/sociétés, collaboration et accès aux modules).",
                        "Générer des analyses, projections et résultats (incluant le calcul d’indicateurs, la production de séries et la structuration des états).",
                        "Maintenir la sécurité, la conformité, la traçabilité et la continuité (détection d’incidents, audit, sauvegardes, contrôle d’accès).",
                        "Améliorer la performance, l’ergonomie et la fiabilité du produit (diagnostics, correction d’anomalies, amélioration du service).",
                        "Respecter les obligations légales et réglementaires applicables.",
                      ]}
                    />
                  </div>

                  <div>
                    <SectionTitle id="bases">4. Bases juridiques du traitement</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les renseignements personnels sont traités sur la base d’un ou de plusieurs fondements
                      juridiques reconnus en vertu de la Loi 25 du Québec et de la LPRPDE :
                    </p>
                    <BulletList
                      items={[
                        "Exécution d’un contrat ou de mesures précontractuelles (fournir la plateforme et ses fonctionnalités).",
                        "Intérêts légitimes d’affaires, conformes aux attentes raisonnables des professionnels et des entreprises (sécurité, prévention de la fraude, amélioration du service).",
                        "Consentement explicite ou implicite, lorsque requis (ex. communications, certaines préférences).",
                        "Respect des obligations légales et réglementaires.",
                      ]}
                    />
                  </div>

                  <div>
                    <SectionTitle id="conservation">5. Conservation et destruction des données</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les renseignements personnels ne sont conservés que pour la durée nécessaire à la réalisation
                      des finalités identifiées, au respect des obligations légales et à la satisfaction des exigences
                      professionnelles ou réglementaires en matière de tenue de dossiers.
                    </p>
                    <BulletList
                      items={[
                        "Les durées de conservation sont documentées à l’interne.",
                        "Les renseignements personnels sont détruits ou anonymisés de manière sécuritaire lorsqu’ils ne sont plus nécessaires.",
                        "Les demandes de suppression sont traitées conformément aux procédures documentées de la Société, sous réserve des obligations de conservation légale.",
                      ]}
                    />
                  </div>

                  <div>
                    <SectionTitle id="partage">6. Partage des données</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les données peuvent être partagées avec des fournisseurs agissant pour le compte de Modelisys,
                      uniquement dans la mesure nécessaire à la prestation du Service :
                    </p>
                    <BulletList
                      items={[
                        "Fournisseurs d’infrastructure infonuagique, d’hébergement et de sécurité.",
                        "Fournisseurs de services d’analyse et de surveillance (performance, disponibilité, diagnostic).",
                        "Autorités réglementaires ou juridiques, lorsque requis.",
                      ]}
                    />
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Aucune donnée n’est vendue.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="transfrontalier">7. Traitement transfrontalier et localisation des données</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les renseignements personnels et les données d’affaires peuvent être traités, stockés ou
                      consultés à l’extérieur du Québec ou du Canada, y compris dans les territoires de compétence
                      où Modelisys ou ses fournisseurs de services exercent leurs activités.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Avant de transférer des renseignements personnels à l’extérieur du Québec, Modelisys procède,
                      lorsque requis, à une évaluation des facteurs relatifs à la vie privée et met en place des
                      mesures contractuelles, organisationnelles et techniques appropriées conformément à la Loi 25
                      du Québec.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="securite">8. Mesures de sécurité</SectionTitle>
                    <BulletList
                      items={[
                        "Chiffrement des données au repos et en transit, lorsque applicable.",
                        "Contrôles d’accès basés sur les rôles et principe du moindre privilège (ex. accès par organisation/société).",
                        "Surveillance, journalisation et procédures de réponse aux incidents.",
                        "Pratiques sécurisées de développement, de déploiement et de gestion des changements.",
                      ]}
                    />
                  </div>

                  <div>
                    <SectionTitle id="droits">9. Droits des personnes, plaintes et traitement automatisé</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les personnes dont les renseignements personnels sont traités peuvent exercer, sous réserve du
                      droit applicable, les droits suivants :
                    </p>
                    <BulletList
                      items={[
                        "Retirer son consentement, le cas échéant.",
                        "Droit d’accès et de rectification.",
                        "Droit à la portabilité des données, lorsque requis.",
                        "Droit à la suppression ou à l’anonymisation, sous réserve des exigences légales de conservation.",
                      ]}
                    />
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Pour exercer ces droits, contactez le responsable de la protection des renseignements
                      personnels (voir section 12). Modelisys peut demander des renseignements supplémentaires afin
                      de vérifier l’identité avant de répondre. Les demandes sont traitées dans un délai de trente
                      (30) jours, sauf si un délai supplémentaire est permis par le droit applicable.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Le Service utilise des traitements automatisés pour générer des analyses, projections et
                      résultats liés à l’analyse financière et à l’évaluation. Ce traitement vise à soutenir
                      l’analyse professionnelle et ne constitue pas une prise de décision automatisée produisant des
                      effets juridiques ou des effets significatifs similaires. Lorsque la loi l’exige, une
                      explication sommaire peut être fournie, sous réserve de la protection des secrets commerciaux
                      et de la propriété intellectuelle.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les personnes concernées peuvent soumettre une plainte au responsable de la protection des
                      renseignements personnels. Si les préoccupations demeurent non résolues, elles peuvent
                      communiquer avec la Commission d’accès à l’information du Québec (CAI) ou le Commissaire à la
                      protection de la vie privée du Canada, selon le cas.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="temoins">10. Témoins et technologies de suivi</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Le Service utilise des témoins (cookies) et des technologies similaires nécessaires au
                      fonctionnement de base, à la sécurité, à l’authentification et à la surveillance de la
                      performance. Les témoins peuvent être de session ou persistants.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Les utilisateurs peuvent gérer ou désactiver les témoins via les paramètres de leur
                      navigateur. La désactivation de certains témoins peut affecter la disponibilité ou le
                      fonctionnement de certaines fonctionnalités du Service. Le Service n’utilise pas de témoins à
                      des fins de publicité ciblée ou de profilage comportemental.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="maj">11. Mises à jour et modifications</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Modelisys peut mettre à jour la présente Politique de confidentialité de temps à autre afin
                      de refléter des changements légaux, techniques, opérationnels ou l’évolution du Service.
                      Lorsque les modifications sont substantielles, Modelisys en avisera les utilisateurs par
                      l’entremise du Service ou par tout autre moyen raisonnable.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      L’accès continu au Service ou son utilisation après la date d’entrée en vigueur d’une
                      politique mise à jour constitue une acceptation de la politique révisée.
                    </p>
                  </div>

                  <div>
                    <SectionTitle id="contact">12. Contact et responsable de la protection des renseignements personnels</SectionTitle>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Conformément à la Loi sur la protection des renseignements personnels dans le secteur privé
                      du Québec (Loi 25), Modelisys a désigné un responsable de la protection des renseignements
                      personnels chargé de superviser la protection des renseignements personnels.
                    </p>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-5 text-[15px] leading-relaxed text-[#5C5F66]">
                      <p className="font-semibold text-[#2A2F3A]">
                        Responsable de la protection des renseignements personnels
                      </p>
                      <p>Directeur de la technologie, Modelisys Inc.</p>
                      <p>
                        Courriel :{" "}
                        <a className="text-[#E0742D] hover:underline" href="mailto:contact@modelisys.com">
                          contact@modelisys.com
                        </a>
                      </p>
                    </div>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#5C5F66]">
                      Si une personne n’est pas satisfaite de la réponse de Modelisys, elle peut communiquer avec
                      la CAI ou le Commissaire à la protection de la vie privée du Canada, selon le cas.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 h-fit rounded-[28px] border border-slate-200 bg-white/75 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 p-6">
              <p className="text-sm font-semibold tracking-wide text-[#2A2F3A]">Sommaire</p>
              <nav className="mt-4 space-y-2 text-sm">
                {[
                  ["portee", "1. Portée"],
                  ["categories", "2. Catégories"],
                  ["finalites", "3. Finalités"],
                  ["bases", "4. Bases juridiques"],
                  ["conservation", "5. Conservation"],
                  ["partage", "6. Partage"],
                  ["transfrontalier", "7. Transfrontalier"],
                  ["securite", "8. Sécurité"],
                  ["droits", "9. Droits & automatisation"],
                  ["temoins", "10. Témoins"],
                  ["maj", "11. Mises à jour"],
                  ["contact", "12. Contact"],
                ].map(([id, label]) => (
                  <a key={id} href={`#${id}`} className="block text-[#5C5F66] hover:text-[#E0742D]">
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-6 border-t border-slate-200 pt-5 text-xs text-[#5C5F66]">
                Besoin d’aide?{" "}
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

