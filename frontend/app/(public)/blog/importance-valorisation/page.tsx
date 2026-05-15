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
  title: "L’importance de la valorisation | Blog Modelisys",
  description:
    "Pourquoi la valorisation est un outil de pilotage : décisions, scénarios, moteurs de valeur, crédibilité externe et intégration dans Modelisys.",
}

function Subh({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-5 text-base font-semibold tracking-tight text-[#2A2F3A] sm:mt-6 sm:text-[17px]">{children}</h3>
  )
}

export default function ArticleImportanceValorisation() {
  return (
    <BlogArticlePageShell>
      <BlogArticleContainer>
        <BlogArticleIntro
          category="Finance · Valorisation"
          title="L’importance de la valorisation"
          date="29 janv. 2026"
          datePublished="2026-01-29"
          slug="importance-valorisation"
          description="Pourquoi la valorisation est un outil de pilotage : décisions, scénarios, moteurs de valeur, crédibilité externe et intégration dans Modelisys."
          readTime="8 min"
          lead={
            <>
              <p className="text-[17px] font-medium leading-[1.45] text-[#2A2F3A] sm:text-lg sm:leading-[1.5]">
                La valorisation n’est pas un exercice réservé aux ventes d’entreprise.
              </p>
              <p className="text-[17px] font-medium leading-[1.45] text-[#2A2F3A] sm:text-lg sm:leading-[1.5]">
                C’est ce qui permet de comprendre si les décisions prises aujourd’hui créent réellement de la richesse.
              </p>
              <p className="!mt-7 font-semibold text-[#2A2F3A] sm:!mt-8">Sans cadre de valorisation :</p>
              <BlogStoryBulletList
                className="!mt-4 border-t-0 pt-0 sm:!mt-5"
                items={[
                  "les décisions sont prises à court terme",
                  "la performance est mal interprétée",
                  "et certaines actions peuvent détruire de la valeur… sans que personne ne s’en rende compte",
                ]}
              />
              <p className="!mt-7 font-semibold text-[#2A2F3A] sm:!mt-8">La valorisation impose une discipline simple :</p>
              <p className="!mt-3 text-[15px] leading-[1.78] text-[#5C5F66] sm:!mt-4 sm:text-base">
                qu’est-ce qui crée de la valeur — et à quel coût (risque, temps, capital) ?
              </p>
            </>
          }
        />

        <BlogArticleStepList>
          <BlogArticleStep id="pilotage" step={1}>
            <BlogStorySectionHeader eyebrow="Pilotage" title="La valorisation comme outil de pilotage" />
            <BlogStoryParagraph className="!mt-0 font-medium text-[#2A2F3A] sm:!mt-0">
              La valorisation transforme la stratégie en quelque chose de mesurable.
            </BlogStoryParagraph>

            <Subh>Comparer des décisions concrètes</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Croître, investir, réduire les coûts, restructurer : toutes les options n’ont pas le même impact sur la
              valeur. La valorisation permet de les comparer sur une base commune.
            </BlogStoryParagraph>

            <Subh>Identifier les vrais moteurs de valeur</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Toutes les entreprises ne créent pas de valeur de la même façon. Marge, croissance, récurrence, structure
              de coûts, risque : la valorisation met en évidence ce qui compte vraiment.
            </BlogStoryParagraph>

            <Subh>Améliorer la qualité des décisions</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Une entreprise peut croître… tout en détruisant de la valeur. À l’inverse, une optimisation ciblée peut
              avoir un impact significatif sur la valeur, sans croissance.
            </BlogStoryParagraph>

            <Subh>Renforcer la crédibilité externe</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Banquiers et investisseurs ne regardent pas seulement les résultats : ils évaluent la qualité du modèle, la
              stabilité et le potentiel.
            </BlogStoryParagraph>
            <p className="!mt-5 font-semibold text-[#2A2F3A] sm:!mt-6">Une valorisation structurée :</p>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={[
                "clarifie le discours",
                "aligne les attentes",
                "facilite les discussions stratégiques",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="scenarios" step={2}>
            <BlogStorySectionHeader eyebrow="Méthode" title="Penser en scénarios, pas en chiffres uniques" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Une valorisation n’est jamais une vérité absolue. C’est une plage de valeur basée sur des hypothèses.
            </BlogStoryParagraph>
            <BlogStoryParagraph className="!mt-4 font-medium text-[#2A2F3A] sm:!mt-5">
              Le vrai levier n’est pas le chiffre final. C’est la compréhension de ce qui le fait varier.
            </BlogStoryParagraph>

            <Subh>Comparer des scénarios cohérents</Subh>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["scénario conservateur", "scénario réaliste", "scénario optimisé"]}
            />
            <p className="!mt-5 border-l-2 border-[#E0742D]/45 pl-5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-6 sm:text-base sm:leading-[1.75]">
              Ce qui compte : quelles hypothèses changent, et pourquoi.
            </p>

            <Subh>Comprendre les impacts réels</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Une variation de 2 % de marge, 10 % de croissance ou du niveau de risque peut transformer significativement
              la valeur.
            </BlogStoryParagraph>
            <p className="!mt-5 text-[15px] italic leading-[1.72] text-[#5C5F66] sm:!mt-6 sm:text-base">
              Sans scénarios, ces impacts restent invisibles.
            </p>
          </BlogArticleStep>

          <BlogArticleStep id="modelisys" step={3}>
            <BlogStorySectionHeader eyebrow="Dans Modelisys" title="Comment Modelisys transforme la valorisation" />
            <BlogStoryParagraph className="!mt-0 sm:!mt-0">
              Dans la majorité des entreprises, la valorisation est :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              className="!mt-3 border-t-0 pt-0 sm:!mt-4"
              items={["ponctuelle", "complexe", "difficile à relier aux opérations"]}
            />
            <BlogStoryParagraph className="!mt-7 sm:!mt-8">
              Résultat : elle est peu utilisée dans la prise de décision.
            </BlogStoryParagraph>
            <BlogStoryParagraph className="!mt-6 font-medium text-[#2A2F3A] sm:!mt-7">
              Modelisys l’intègre directement dans la gestion.
            </BlogStoryParagraph>

            <Subh>Lien direct entre performance et valeur</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Les résultats ne sont plus seulement analysés : ils sont traduits en impact sur la valeur.
            </BlogStoryParagraph>

            <Subh>Simulation de scénarios en continu</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Budgets, projections, hypothèses : chaque décision peut être testée et comparée.
            </BlogStoryParagraph>

            <Subh>Cohérence entre les analyses</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Les scénarios financiers, opérationnels et stratégiques restent alignés.
            </BlogStoryParagraph>

            <Subh>Lecture claire pour tous les intervenants</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              Dirigeants, partenaires, investisseurs : chacun comprend rapidement l’impact des décisions.
            </BlogStoryParagraph>

            <Subh>Passer de la théorie à l’action</Subh>
            <BlogStoryParagraph className="!mt-2.5 sm:!mt-3">
              La valorisation ne reste pas un exercice. Elle devient un outil quotidien de pilotage.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="en-bref" step={4} isLast>
            <BlogStoryClosingBlock kicker="En bref">
              <p className="font-medium text-[#2A2F3A]">
                La valorisation n’est pas une finalité. C’est un outil pour mieux décider.
              </p>
              <p className="!mt-4 font-semibold text-[#2A2F3A] sm:!mt-5">Elle permet de :</p>
              <BlogStoryBulletList
                items={[
                  "relier performance et création de valeur",
                  "comprendre les impacts des décisions",
                  "prioriser ce qui compte réellement",
                ]}
              />
              <div className="!mt-7 space-y-2.5 text-[15px] font-medium leading-[1.72] text-[#2A2F3A] sm:!mt-8 sm:text-base sm:leading-[1.75]">
                <p>Et surtout :</p>
                <p>Elle transforme des hypothèses en trajectoires.</p>
                <p>Et des décisions en valeur concrète.</p>
              </div>
            </BlogStoryClosingBlock>
          </BlogArticleStep>
        </BlogArticleStepList>
      </BlogArticleContainer>
    </BlogArticlePageShell>
  )
}
