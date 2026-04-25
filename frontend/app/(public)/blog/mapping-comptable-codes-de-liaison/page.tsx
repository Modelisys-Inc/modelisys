import type { Metadata } from "next"
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
  title: "Budget, suivi & valorisation | Blog Modelisys",
  description:
    "Pourquoi structurer un mapping comptable (codes de liaison) pour fiabiliser budget & suivi, comparabilité des états et valorisation dans Modelisys.",
}

export default function ArticleMappingCodes() {
  return (
    <BlogArticlePageShell>
      <BlogArticleContainer>
        <BlogArticleIntro
          category="États financiers · Mapping"
          title="Budget & suivi, puis valorisation: pourquoi le mapping (codes de liaison) est votre point d’ancrage"
          date="29 janv. 2026"
          readTime="8 min"
          lead="Un budget n’est utile que si les écarts sont lisibles (réel vs budget, période vs période). Et une valorisation n’est crédible que si les postes (revenus, marges, dépenses, éléments non récurrents) sont cohérents d’une période à l’autre. Le problème est souvent le même: votre plan comptable ne “parle” pas la langue des états financiers et des KPI. Un mapping comptable bien pensé, via des codes de liaison, transforme la comptabilité en structure stable pour le suivi budgétaire, le reporting et l’évaluation."
        />

        <BlogArticleStepList>
          <BlogArticleStep id="pourquoi" step={1}>
            <BlogStorySectionHeader eyebrow="Comparabilité" title="Pourquoi le mapping est la clé de la comparabilité" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Les états financiers “de gestion” ont besoin de cohérence: mêmes définitions de postes, mêmes règles de
              classement, même logique multi-périodes. Sinon, les ratios (marge, EBITDA, BFR, levier) deviennent des
              artefacts de classification plutôt que des signaux économiques.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="codes" step={2}>
            <BlogStorySectionHeader eyebrow="Convention" title="Les codes de liaison: une convention simple, un impact massif" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Dans Modelisys, les codes de liaison servent de pont entre les comptes (TB) et la structure d’états
              financiers. L’objectif est de:
            </BlogStoryParagraph>
            <BlogStoryBulletList
              items={[
                "réduire la variance de classement d’un dossier à l’autre;",
                "accélérer l’actualisation mensuelle (moins de recodage);",
                "maintenir une traçabilité: on sait “pourquoi” un compte se retrouve dans un poste.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="workflow" step={3}>
            <BlogStorySectionHeader eyebrow="Mise en œuvre" title="Workflow recommandé dans Modelisys" />
            <BlogStoryBulletList
              items={[
                "Importer la balance de vérification de la société.",
                "Compléter le mapping comptable (compte → code de liaison → poste d’état).",
                "Valider les postes agrégés et les ratios de base sur quelques périodes.",
                "Stabiliser les exceptions (comptes ambigus, reclassements récurrents) et documenter la logique.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="anti-patterns" step={4}>
            <BlogStorySectionHeader eyebrow="Pièges" title="Les erreurs classiques (et comment les éviter)" />
            <BlogStoryBulletList
              items={[
                "Mapper “trop vite”: un poste mal défini se réplique partout.",
                "Mélanger des natures économiques différentes (ex. charges récurrentes vs non récurrentes) sans règle explicite.",
                "Changer les définitions en cours de route sans rétrospective: on casse les comparatifs.",
                "Ne pas traiter les comptes “fourre-tout”: ils masquent l’histoire réelle des marges.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="en-bref" step={5} isLast>
            <BlogStoryClosingBlock kicker="En bref">
              <p>
                Le mapping n’est pas un “détail technique”: c’est le dictionnaire qui rend vos états lisibles. Dans
                Modelisys, le couple mapping + codes de liaison transforme une TB hétérogène en structure stable pour
                l’analyse, la projection et la discussion avec des tiers.
              </p>
            </BlogStoryClosingBlock>
          </BlogArticleStep>
        </BlogArticleStepList>
      </BlogArticleContainer>
    </BlogArticlePageShell>
  )
}
