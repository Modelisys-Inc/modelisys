import type { Metadata } from "next"
import type { ReactNode } from "react"
import {
  BlogArticleContainer,
  BlogArticleIntro,
  BlogArticlePageShell,
  BlogArticleStep,
  BlogArticleStepList,
  BlogStoryBulletList,
  BlogStoryClosingBlock,
  BlogStoryHighlightBlock,
  BlogStoryParagraph,
  BlogStorySectionHeader,
  StatSourceInfoBubble,
} from "@/components/blog-article-story-layout"

export const metadata: Metadata = {
  title: "La technologie n’est plus un avantage, c’est un standard | Blog Modelisys",
  description:
    "Données, décisions et valeur : pourquoi la technologie financière ne suffit pas sans changement de pilotage, ce que disent les tendances du marché, et comment Modelisys relie performance et valorisation.",
}

function Subh({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-7 text-base font-semibold tracking-tight text-[#2A2F3A] sm:mt-9 sm:text-[17px]">{children}</h3>
  )
}

/** Encadré léger pour casser le « mur de texte » dans la section Modelisys. */
function MsAside({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-7 mb-9 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/95 to-white px-4 py-3.5 shadow-sm shadow-slate-900/[0.02] sm:mt-8 sm:mb-10 sm:px-5 sm:py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0742D]">{label}</p>
      <div className="mt-2.5 text-[14px] leading-relaxed text-[#5C5F66] sm:text-[15px] sm:leading-[1.68]">{children}</div>
    </div>
  )
}

export default function ArticleIaTechnologiePilotage() {
  return (
    <BlogArticlePageShell>
      <BlogArticleContainer>
        <BlogArticleIntro
          category="Innovation · Pilotage · IA"
          title="La technologie n’est plus un avantage. C’est un standard."
          date="24 avr. 2026"
          datePublished="2026-04-24"
          slug="ia-technologie-pilotage-entreprise"
          description="Données, décisions et valeur : pourquoi la technologie financière ne suffit pas sans changement de pilotage, ce que disent les tendances du marché, et comment Modelisys relie performance et valorisation."
          readTime="14 min"
          lead={
            <>
              <p>
                Aujourd’hui, la majorité des entreprises ont accès à des données financières abondantes. Le problème
                n’est plus l’accès à l’information. C’est la capacité à l’utiliser correctement pour prendre de
                meilleures décisions.
              </p>
              <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">Dans plusieurs organisations, les chiffres existent… mais :</p>
              <BlogStoryBulletList
                className="!mt-4 border-t-0 pt-0 sm:!mt-5"
                items={[
                  "ils sont dispersés entre systèmes",
                  "ils ne sont pas toujours alignés",
                  "et ils arrivent trop tard pour être réellement utiles",
                ]}
              />
              <p className="!mt-6 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-7 sm:text-base sm:leading-[1.75]">
                Résultat : les décisions sont prises avec une vision partielle de la réalité.
              </p>
            </>
          }
        />

        <BlogArticleStepList>
          <BlogArticleStep id="role-technologie" step={1}>
            <BlogStorySectionHeader eyebrow="Fondations" title="Le vrai rôle de la technologie" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              La technologie financière n’a pas de valeur en soi. Elle n’en a que si elle améliore la qualité des
              décisions.
            </BlogStoryParagraph>

            <Subh>Transformer la donnée en action</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Les entreprises performantes ne passent plus leur temps à produire des rapports. Elles utilisent des
              systèmes qui leur permettent de comprendre rapidement :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "ce qui influence leur rentabilité",
                "ce qui crée de la valeur",
                "et ce qui nécessite une intervention immédiate",
              ]}
            />

            <Subh>Accélérer la prise de décision</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Quand les chiffres sont cohérents et centralisés, les décisions ne dépendent plus :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "de multiples versions d’Excel",
                "d’interprétations différentes",
                "ou de consolidations manuelles longues et incertaines",
              ]}
            />

            <Subh>Passer de la performance à la valeur</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              La vraie question n’est pas seulement « combien on gagne ». C’est : est-ce que les décisions prises
              aujourd’hui augmentent ou réduisent la valeur de l’entreprise ?
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="transformation" step={2}>
            <BlogStorySectionHeader eyebrow="Tendances" title="Une transformation déjà en cours" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Les entreprises accélèrent leur adoption des outils analytiques et de l’intelligence artificielle.
            </BlogStoryParagraph>
            <ul className="mt-6 space-y-3 border-t border-slate-200/80 pt-6">
              <li className="flex gap-3 text-[14px] leading-[1.68] text-[#5C5F66] sm:text-[15px] sm:leading-[1.72]">
                <span className="mt-[0.5rem] h-px w-3 shrink-0 bg-slate-300" aria-hidden />
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span>
                    73 % des organisations prévoient augmenter leurs investissements en technologies avancées (dont l’IA
                    et l’analytique).
                  </span>
                  <StatSourceInfoBubble ariaLabel="Source : article KPMG (2024)">
                    Ce chiffre provient d’un article de{" "}
                    <span className="font-semibold text-[#2A2F3A]">KPMG</span> publié en{" "}
                    <span className="font-semibold text-[#2A2F3A]">2024</span>.
                  </StatSourceInfoBubble>
                </span>
              </li>
              <li className="flex gap-3 text-[14px] leading-[1.68] text-[#5C5F66] sm:text-[15px] sm:leading-[1.72]">
                <span className="mt-[0.5rem] h-px w-3 shrink-0 bg-slate-300" aria-hidden />
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span>9 dirigeants sur 10 considèrent ces outils comme essentiels à leur croissance future.</span>
                  <StatSourceInfoBubble ariaLabel="Source : article KPMG (2024)">
                    Ce chiffre provient d’un article de{" "}
                    <span className="font-semibold text-[#2A2F3A]">KPMG</span> publié en{" "}
                    <span className="font-semibold text-[#2A2F3A]">2024</span>.
                  </StatSourceInfoBubble>
                </span>
              </li>
            </ul>
            <p className="!mt-6 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-7 sm:text-base sm:leading-[1.75]">
              La direction est claire : les méthodes traditionnelles atteignent leurs limites.
            </p>
          </BlogArticleStep>

          <BlogArticleStep id="realite-fragmentee" step={3}>
            <BlogStorySectionHeader eyebrow="Terrain" title="Une réalité encore fragmentée" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Malgré cette évolution, beaucoup d’entreprises fonctionnent encore avec des systèmes déconnectés :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "comptabilité dans un outil",
                "budgets dans Excel",
                "analyses dans différents fichiers",
              ]}
            />
            <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">Cela crée :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "perte de temps dans la consolidation",
                "manque de cohérence dans les chiffres",
                "décisions prises sur une vision partielle",
              ]}
            />
            <BlogStoryParagraph className="!mt-6 sm:!mt-7">
              Dans ce contexte, la performance est souvent observée… mais rarement maîtrisée.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="pendant-ce-temps" step={4}>
            <BlogStoryHighlightBlock eyebrow="Réalité régionale" title="Pendant ce temps…" tone="amber">
              <BlogStoryBulletList
                items={[
                  <span key="statqc" className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span>Seulement 12,7 % des entreprises au Québec utilisent activement l’IA aujourd’hui.</span>
                    <StatSourceInfoBubble ariaLabel="Source : Statistique Québec, article publié en 2025">
                      Ce chiffre provient d’un article de{" "}
                      <span className="font-semibold text-[#2A2F3A]">Statistique Québec</span> publié en{" "}
                      <span className="font-semibold text-[#2A2F3A]">2025</span>.
                    </StatSourceInfoBubble>
                  </span>,
                  "La plupart des entreprises ne savent pas par où commencer.",
                ]}
              />
            </BlogStoryHighlightBlock>
          </BlogArticleStep>

          <BlogArticleStep id="vrai-enjeu" step={5}>
            <BlogStorySectionHeader eyebrow="Lecture" title="Le vrai enjeu" />
            <BlogStoryParagraph className="!mt-0 font-medium text-[#2A2F3A] sm:!mt-0">
              Le problème n’est pas le manque de technologie.
            </BlogStoryParagraph>
            <BlogStoryParagraph className="!mt-4 sm:!mt-5">
              Le problème est simple : les outils actuels ne transforment pas réellement la façon de décider.
            </BlogStoryParagraph>
            <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">La technologie n’a de valeur que si elle permet :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "de mieux comprendre la performance",
                "de réduire l’incertitude",
                "et de relier les décisions à leurs impacts économiques",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="point-critique" step={6}>
            <BlogStorySectionHeader eyebrow="Profondeur" title="Le point critique souvent ignoré" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Deux entreprises peuvent avoir les mêmes résultats financiers… mais des trajectoires complètement
              différentes.
            </BlogStoryParagraph>
            <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">Pourquoi ?</p>
            <BlogStoryParagraph className="!mt-2 sm:!mt-3">Parce que :</BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "les décisions ne sont pas prises au bon moment",
                "les écarts ne sont pas interprétés rapidement",
                "et les impacts sur la valeur ne sont pas visibles",
              ]}
            />
            <div className="!mt-6 space-y-2 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-7 sm:text-base sm:leading-[1.75]">
              <p>Le problème n’est pas les chiffres.</p>
              <p>C’est la vitesse et la qualité des décisions basées sur ces chiffres.</p>
            </div>
          </BlogArticleStep>

          <BlogArticleStep id="modelisys" step={7}>
            <BlogStorySectionHeader eyebrow="Modelisys" title="Comment Modelisys change cette réalité" />
            <div className="!mt-0 space-y-4 sm:!mt-0">
              <p className="text-[15px] font-medium leading-snug text-[#2A2F3A] sm:text-base">
                Pas un reporting de plus : une plateforme de pilotage financier intégrée.
              </p>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">En un coup d’œil</p>
                <ul className="mt-2.5 space-y-2 border-l-2 border-[#E0742D]/35 pl-4 text-[14px] leading-snug text-[#5C5F66] sm:text-[15px] sm:leading-snug">
                  <li>Vérité financière unique — multi-entités, devises, divisions.</li>
                  <li>De la synthèse au grand livre, sans changer de fichier.</li>
                  <li>Comparaisons dans le temps prêtes à l’emploi.</li>
                  <li>Scénarios branchés sur le réel.</li>
                  <li>Traduction explicite en impact sur la valeur.</li>
                </ul>
              </div>
            </div>

            <Subh>Une vision unifiée de l’entreprise</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Une seule base pour consolider, comparer et expliquer — sans versions concurrentes.
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "Moins d’erreurs de consolidation et de décisions prises sur des chiffres divergents.",
                "Clôtures et analyses plus rapides : souvent des dizaines d’heures par mois récupérées dans les PME.",
              ]}
            />
            <MsAside label="À retenir">
              <p>
                Le gain n’est pas seulement du <span className="font-medium text-[#2A2F3A]">temps</span> : ce sont des
                décisions prises <span className="font-medium text-[#2A2F3A]">plus tôt</span>, mieux calées sur le cycle
                d’affaires.
              </p>
            </MsAside>

            <Subh>Une lecture complète de la performance</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Une lecture unifiée sur les revenus, les coûts fixes et variables, la masse salariale, le BAIIA et les flux
              de trésorerie — avec possibilité de descendre jusqu’au grand livre comptable.
            </BlogStoryParagraph>
            <MsAside label="Ordre de grandeur (exemple)">
              <ul className="list-none space-y-2">
                <li className="flex gap-2">
                  <span className="text-slate-400" aria-hidden>
                    ·
                  </span>
                  <span>
                    Visibilité sur les marges : souvent <strong className="font-semibold text-[#2A2F3A]">1 à 3 %</strong>{" "}
                    de dérives non vues auparavant.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400" aria-hidden>
                    ·
                  </span>
                  <span>
                    À <strong className="font-semibold text-[#2A2F3A]">5 M$</strong> de revenus,{" "}
                    <strong className="font-semibold text-[#2A2F3A]">+1 %</strong> de marge BAIIA ≈{" "}
                    <strong className="font-semibold text-[#2A2F3A]">50 000 $</strong> de BAIIA annuel — puis effet de
                    levier sur la valorisation selon le multiple.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-slate-400" aria-hidden>
                    ·
                  </span>
                  <span>Plusieurs leviers combinés multiplient l’effet.</span>
                </li>
              </ul>
            </MsAside>

            <Subh>Une analyse dynamique dans le temps</Subh>
            <BlogStoryBulletList
              className="!mt-2.5 border-t-0 pt-0 sm:!mt-3"
              items={[
                "Mois courant vs mois précédent",
                "YTD, DDM, trimestriel",
                "Historique sur plusieurs années",
              ]}
            />
            <BlogStoryParagraph className="!mt-3 sm:!mt-4">
              Le levier principal : <span className="font-medium text-[#2A2F3A]">réduire le délai</span> entre un signal
              et une correction — de mois à semaines quand c’est possible.
            </BlogStoryParagraph>
            <MsAside label="Pour une PME typique">
              <p>
                Repérer tôt une dérive de <strong className="font-semibold text-[#2A2F3A]">2 à 5 %</strong> sur certaines
                lignes de coûts peut se traduire par des impacts à{" "}
                <strong className="font-semibold text-[#2A2F3A]">six chiffres</strong>, avant même d’agir sur la marge
                globale.
              </p>
            </MsAside>

            <Subh>Des scénarios intégrés</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Budgets et projections (prudent, réaliste, optimisé) reliés aux résultats réels — pas des îlots Excel.
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "Leviers fréquents : marge brute +3 %, revenus +10 %, risque opérationnel perçu en baisse.",
                "L’enjeu n’est pas la précision absolue : c’est l’impact directionnel avant de décider.",
              ]}
            />
            <MsAside label="Pourquoi ça compte">
              <p>
                Tester un scénario avant d’engager des fonds ou des équipes évite les « surprises » six mois plus tard —
                et clarifie ce qui bouge vraiment la valeur.
              </p>
            </MsAside>

            <Subh>Un lien direct avec la valorisation</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Chaque scénario peut être lu en impact sur le BAIIA, la valeur d’entreprise et la valeur des actions.
            </BlogStoryParagraph>
            <MsAside label="Changement de conversation">
              <ul className="space-y-3">
                <li>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Avant</span>
                  <p className="mt-1 font-medium text-[#2A2F3A]">« Nos revenus ont augmenté de 8 %. »</p>
                </li>
                <li>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Après</span>
                  <p className="mt-1 font-medium text-[#2A2F3A]">
                    « Cette croissance représente +X $ de valeur selon le scénario retenu. »
                  </p>
                </li>
              </ul>
              <p className="!mt-3 border-t border-slate-200/80 pt-3 text-[14px] text-[#5C5F66]">
                La discussion quitte l’opérationnel pour s’ancrer dans la création de valeur.
              </p>
            </MsAside>
          </BlogArticleStep>

          <BlogArticleStep id="nouvelle-facon-piloter" step={8}>
            <BlogStorySectionHeader eyebrow="Pilotage" title="Une nouvelle façon de piloter une entreprise" />
            <p className="!mt-0 font-semibold text-[#2A2F3A] sm:!mt-0">Avec une plateforme comme Modelisys :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "les chiffres deviennent cohérents",
                "les écarts deviennent compréhensibles",
                "les décisions deviennent plus rapides et plus structurées",
              ]}
            />
            <p className="!mt-5 font-medium text-[#2A2F3A] sm:!mt-6">Et surtout :</p>
            <BlogStoryParagraph className="!mt-2 sm:!mt-3">
              la performance financière est directement reliée à la création de valeur.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="en-bref" step={9} isLast>
            <BlogStoryClosingBlock kicker="En bref">
              <p className="font-medium text-[#2A2F3A]">
                La technologie n’est pas une transformation en soi. C’est un amplificateur.
              </p>
              <p className="!mt-4 font-semibold text-[#2A2F3A] sm:!mt-5">Elle peut :</p>
              <BlogStoryBulletList
                items={[
                  "accélérer les décisions",
                  "clarifier la performance",
                  "et améliorer la création de valeur",
                ]}
              />
              <BlogStoryParagraph className="!mt-6 sm:!mt-7">
                Modelisys s’inscrit précisément là : entre les données financières et les décisions qui influencent la
                valeur de l’entreprise.
              </BlogStoryParagraph>
              <p className="!mt-6 text-center text-[15px] font-semibold tracking-wide text-[#2A2F3A] sm:!mt-8 sm:text-base">
                Analysez. Projetez. Valorisez. Documentez. Collaborez.
              </p>
            </BlogStoryClosingBlock>
          </BlogArticleStep>
        </BlogArticleStepList>
      </BlogArticleContainer>
    </BlogArticlePageShell>
  )
}
