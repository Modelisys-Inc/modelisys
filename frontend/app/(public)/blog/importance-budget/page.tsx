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
  BlogStoryParagraph,
  BlogStorySectionHeader,
} from "@/components/blog-article-story-layout"

export const metadata: Metadata = {
  title: "L’importance d’un budget | Blog Modelisys",
  description:
    "Budget et suivi : fondations, discipline, lien avec la valorisation, scénarios et comment Modelisys unifie le pilotage et la création de valeur.",
}

function Subh({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-5 text-base font-semibold tracking-tight text-[#2A2F3A] sm:mt-6 sm:text-[17px]">{children}</h3>
  )
}

export default function ArticleImportanceBudget() {
  return (
    <BlogArticlePageShell>
      <BlogArticleContainer>
        <BlogArticleIntro
          category="Finance · Budget"
          title="L’importance d’un budget (et de son suivi)"
          date="29 janv. 2026"
          datePublished="2026-01-29"
          slug="importance-budget"
          description="Budget et suivi : fondations, discipline, lien avec la valorisation, scénarios et comment Modelisys unifie le pilotage et la création de valeur."
          readTime="10 min"
          lead={
            <>
              <p className="text-[17px] font-medium leading-[1.45] text-[#2A2F3A] sm:text-lg sm:leading-[1.5]">
                Un budget n’est pas un document annuel qu’on prépare en janvier pour l’oublier en février.
              </p>
              <p className="text-[17px] font-medium leading-[1.45] text-[#2A2F3A] sm:text-lg sm:leading-[1.5]">
                C’est ce qui permet de savoir si l’entreprise avance dans la bonne direction… ou dérive progressivement.
              </p>
              <p className="!mt-7 font-semibold text-[#2A2F3A] sm:!mt-8">Sans budget structuré :</p>
              <BlogStoryBulletList
                className="!mt-4 border-t-0 pt-0 sm:!mt-5"
                items={[
                  "les décisions sont réactives",
                  "les ressources sont mal allouées",
                  "les priorités restent floues",
                ]}
              />
              <p className="!mt-7 font-semibold text-[#2A2F3A] sm:!mt-8">Sans suivi :</p>
              <BlogStoryBulletList
                className="!mt-4 border-t-0 pt-0 sm:!mt-5"
                items={[
                  "les écarts ne sont pas compris",
                  "les erreurs se répètent",
                  "et le budget devient inutile",
                ]}
              />
              <p className="!mt-7 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-8 sm:text-base sm:leading-[1.75]">
                Un budget utile n’est pas celui qui est fait. C’est celui qui est utilisé pour décider.
              </p>
            </>
          }
        />

        <BlogArticleStepList>
          <BlogArticleStep id="pourquoi" step={1}>
            <BlogStorySectionHeader eyebrow="Fondations" title="À quoi sert un budget, concrètement ?" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Un budget ne sert pas à prédire l’avenir avec précision. Il sert à structurer les décisions.
            </BlogStoryParagraph>

            <Subh>Traduire la stratégie en chiffres</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Une stratégie sans budget reste une intention. Le budget la transforme en objectifs mesurables et suivis.
            </BlogStoryParagraph>

            <Subh>Arbitrer les ressources</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Capex, embauches, dépenses : tout ne peut pas être prioritaire. Le budget impose des choix clairs et
              assumés.
            </BlogStoryParagraph>

            <Subh>Responsabiliser les équipes</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">Chaque responsable comprend :</BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["ses objectifs", "ses moyens", "ses limites"]}
            />
            <p className="!mt-5 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-6 sm:text-base sm:leading-[1.75]">
              On passe de « on verra » à « on sait ce qu’on vise ».
            </p>

            <Subh>Réduire l’incertitude</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Tester des hypothèses permet d’anticiper plutôt que subir.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="suivi" step={2}>
            <BlogStorySectionHeader eyebrow="Discipline" title="Le suivi : là où la valeur se crée" />
            <BlogStoryParagraph className="!mt-0 font-medium text-[#2A2F3A] sm:!mt-0">
              Un budget sans suivi est un exercice. Un budget suivi est un système de pilotage.
            </BlogStoryParagraph>

            <Subh>Comprendre les écarts</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Un écart n’est pas un problème. Un écart non expliqué, oui.
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-4 border-t-0 pt-0 sm:!mt-5"
              items={["marge en baisse", "coûts en hausse", "revenus sous pression"]}
            />
            <p className="!mt-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-6 sm:text-base">
              Ce sont des signaux, pas des surprises.
            </p>

            <Subh>Décider rapidement</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Un suivi mensuel permet d’ajuster :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["les dépenses", "les priorités", "les actions"]}
            />
            <p className="!mt-5 text-[15px] italic leading-[1.72] text-[#5C5F66] sm:!mt-6 sm:text-base">
              Avant que l’écart devienne critique.
            </p>

            <Subh>Éviter la répétition des erreurs</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Sans suivi, les mêmes dérives reviennent. Avec suivi, elles sont identifiées et corrigées.
            </BlogStoryParagraph>

            <Subh>Passer d’une gestion passive à active</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              L’entreprise ne subit plus ses résultats. Elle les pilote.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="lien-valorisation" step={3}>
            <BlogStorySectionHeader
              eyebrow="Lien avec la valorisation"
              title="Quand le budget devient un outil de création de valeur"
            />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Un budget ne sert pas seulement à planifier l’année. Il permet de comprendre où l’entreprise s’en va… et ce
              qu’elle vaudra.
            </BlogStoryParagraph>
            <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">Chaque hypothèse budgétaire a un impact direct sur la valeur :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "une amélioration de la marge augmente le BAIIA",
                "une croissance des revenus accélère la création de valeur",
                "une meilleure stabilité réduit le risque et peut améliorer le multiple",
              ]}
            />
            <div className="!mt-6 space-y-2 text-[15px] leading-[1.72] text-[#5C5F66] sm:!mt-7 sm:text-base">
              <p>Sans ce lien, un budget reste opérationnel.</p>
              <p className="font-medium text-[#2A2F3A]">Avec ce lien, il devient stratégique.</p>
            </div>

            <Subh>Penser en scénarios, pas en chiffres fixes</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Un seul budget donne une illusion de précision. Plusieurs scénarios donnent une vision.
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-4 border-t-0 pt-0 sm:!mt-5"
              items={["scénario prudent", "scénario réaliste", "scénario optimisé"]}
            />
            <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">Chacun implique :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["des décisions différentes", "des risques différents", "une valeur différente"]}
            />

            <Subh>Ce que cela change concrètement</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Au lieu de dire : « On vise 10 % de croissance », tu peux dire : « À 10 % de croissance, la valeur estimée
              augmente de 800 k$ ».
            </BlogStoryParagraph>
            <div className="!mt-5 space-y-2 text-[15px] leading-[1.72] text-[#5C5F66] sm:!mt-6 sm:text-base">
              <p>La discussion change complètement.</p>
              <p>Les décisions deviennent plus concrètes.</p>
              <p className="font-medium text-[#2A2F3A]">Les priorités deviennent évidentes.</p>
            </div>
          </BlogArticleStep>

          <BlogArticleStep id="modelisys" step={4}>
            <BlogStorySectionHeader eyebrow="Dans Modelisys" title="Comment Modelisys transforme le budget" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">Dans beaucoup d’entreprises, le budget est :</BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["dans Excel", "fragmenté", "difficile à suivre"]}
            />
            <p className="!mt-6 font-semibold text-[#2A2F3A] sm:!mt-7">Résultat :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["perte de temps", "incohérences", "faible utilisation"]}
            />
            <BlogStoryParagraph className="!mt-7 font-medium text-[#2A2F3A] sm:!mt-8">
              Modelisys transforme cette dynamique.
            </BlogStoryParagraph>

            <Subh>Une base unique et fiable</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Un seul budget, connecté aux données réelles, sans versions concurrentes.
            </BlogStoryParagraph>

            <Subh>Suivi clair des écarts</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Chaque variation est visible, mesurée et expliquée.
            </BlogStoryParagraph>

            <Subh>Comparaison dans le temps</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Mensuel, YTD, annuel : les écarts sont suivis de façon cohérente.
            </BlogStoryParagraph>

            <Subh>Scénarios dynamiques</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Prudent, réaliste, optimisé : les décisions peuvent être testées avant d’être prises.
            </BlogStoryParagraph>

            <Subh>Lien direct avec la valorisation</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Chaque hypothèse budgétaire est traduite en :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "impact sur le BAIIA",
                "impact sur la valeur d’entreprise",
                "impact sur la valeur des actions",
              ]}
            />
            <p className="!mt-5 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-6 sm:text-base">
              Le budget devient une simulation de création de valeur.
            </p>
          </BlogArticleStep>

          <BlogArticleStep id="en-bref" step={5} isLast>
            <BlogStoryClosingBlock kicker="En bref">
              <p className="font-medium text-[#2A2F3A]">
                Un budget n’est pas une contrainte. C’est un cadre pour mieux décider.
              </p>
              <div className="!mt-6 space-y-3 text-[15px] leading-[1.72] sm:!mt-7 sm:text-base">
                <p>
                  <span className="font-semibold text-[#2A2F3A]">Sans suivi :</span> c’est une intention.
                </p>
                <p>
                  <span className="font-semibold text-[#2A2F3A]">Avec suivi :</span> c’est un système de pilotage.
                </p>
                <p>
                  <span className="font-semibold text-[#2A2F3A]">Avec un lien à la valorisation :</span> c’est un levier de
                  création de richesse.
                </p>
              </div>
              <p className="!mt-10 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D] sm:!mt-12">
                Conclusion
              </p>
              <div className="!mt-4 space-y-2.5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-5 sm:text-base sm:leading-[1.75]">
                <p>Un budget sans suivi planifie des dépenses.</p>
                <p>Un budget suivi pilote la performance.</p>
                <p>Un budget lié à la valorisation pilote la valeur.</p>
              </div>
            </BlogStoryClosingBlock>
          </BlogArticleStep>
        </BlogArticleStepList>
      </BlogArticleContainer>
    </BlogArticlePageShell>
  )
}
