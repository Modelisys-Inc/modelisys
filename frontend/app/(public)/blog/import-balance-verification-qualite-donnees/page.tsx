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
  title: "Reporting financier depuis la balance | Blog Modelisys",
  description:
    "Bonnes pratiques pour partir d’une balance de vérification et fiabiliser le reporting dans Modelisys (import, contrôles, cohérence et traçabilité).",
}

export default function ArticleImportBalance() {
  return (
    <BlogArticlePageShell>
      <BlogArticleContainer>
        <BlogArticleIntro
          category="Comptabilité · Qualité des données"
          title="Reporting financier: partir de la balance de vérification pour produire des états fiables (et actionnables)"
          date="29 janv. 2026"
          datePublished="2026-01-29"
          slug="import-balance-verification-qualite-donnees"
          description="Bonnes pratiques pour partir d’une balance de vérification et fiabiliser le reporting dans Modelisys (import, contrôles, cohérence et traçabilité)."
          readTime="7 min"
          lead="Un reporting financier utile commence avant les graphiques: il commence à la source. Une balance de vérification (TB) “à peu près correcte” entraîne vite des états non comparables, des écarts mal expliqués et des cycles de clôture plus lents. L’objectif n’est pas d’avoir un fichier parfait; c’est d’avoir un flux d’import qui rend les anomalies visibles, maintient une traçabilité, et vous permet de produire des états fiables pour piloter (et communiquer) plus rapidement."
        />

        <BlogArticleStepList>
          <BlogArticleStep id="ce-que-modelisys-fait" step={1}>
            <BlogStorySectionHeader eyebrow="Cadrage" title="Ce que Modelisys fait (et ne fait pas)" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Modelisys est une plateforme d’analyse et de modélisation. Elle vous aide à structurer et exploiter des
              données importées (ex. fichiers Excel) pour alimenter des états, des analyses, des ratios et des
              projections. Elle ne remplace pas un audit, une mission d’examen ou une validation indépendante.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="preparer" step={2}>
            <BlogStorySectionHeader eyebrow="Préparation" title="Préparer l’import: standardiser le minimum utile" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Avant même de parler d’outil, une TB exploitable respecte quelques invariants. Dans Modelisys, tu gagnes
              du temps si tu standardises:
            </BlogStoryParagraph>
            <BlogStoryBulletList
              items={[
                "Un identifiant de compte stable (numéro de compte) et une description lisible.",
                "Des conventions de signe (débit/crédit) cohérentes selon le format utilisé.",
                "Une granularité claire (mensuelle vs annuelle) et une période de référence explicite.",
                "L’unicité des comptes: éviter les doublons “même compte / libellés différents”.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="charger" step={3}>
            <BlogStorySectionHeader eyebrow="Contrôle" title="Charger la TB et détecter les anomalies tôt" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Le bon workflow consiste à importer, puis valider les points qui font dérailler l’analyse: comptes
              manquants, descriptions vides, incohérences de classification, variations extrêmes ou postes non mappés.
            </BlogStoryParagraph>
            <BlogStoryBulletList
              items={[
                "Importer la TB (Excel) dans la société concernée.",
                "Comparer rapidement “nombre de comptes”, “comptes nouveaux” et “comptes non classés”.",
                "Identifier les postes atypiques: mouvements importants, comptes inhabituels, libellés ambigus.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="mapping" step={4}>
            <BlogStorySectionHeader eyebrow="Structure" title="Relier la TB aux analyses: mapping comptable et codes de liaison" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Une TB brute est rarement comparable d’une période à l’autre (ou d’une société à l’autre). Dans Modelisys,
              l’étape clé est de relier tes comptes à une structure d’états financiers via le mapping comptable et les
              codes de liaison. C’est ce qui rend les ratios, les graphiques et les analyses fiables.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="bonnes-pratiques" step={5}>
            <BlogStorySectionHeader eyebrow="Qualité" title="Bonnes pratiques de contrôle pour rester “audit-ready”" />
            <BlogStoryBulletList
              items={[
                "Réconcilier les totaux (si applicable) et documenter les écarts dès qu’ils apparaissent.",
                "Conserver une trace de la source et de la date d’import (version du fichier, période).",
                "Éviter les corrections silencieuses: corriger à la source ou documenter l’ajustement.",
                "Valider la cohérence multi-périodes avant de tirer des conclusions (effets saisonniers, reclassements).",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="en-bref" step={6} isLast>
            <BlogStoryClosingBlock kicker="En bref">
              <p>
                Le meilleur import n’est pas celui qui “passe”, c’est celui qui rend visibles les zones à risque.
                Modelisys vous aide à passer rapidement de l’Excel à une base structurée, puis à verrouiller la
                comparabilité via le mapping.
              </p>
            </BlogStoryClosingBlock>
          </BlogArticleStep>
        </BlogArticleStepList>
      </BlogArticleContainer>
    </BlogArticlePageShell>
  )
}
