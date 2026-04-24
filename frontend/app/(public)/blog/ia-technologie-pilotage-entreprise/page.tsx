import type { Metadata } from "next"
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
    "IA, automatisation et pilotage : pourquoi les entreprises performantes s’appuient sur des outils intelligents, ce que disent les chiffres, et comment prendre de meilleures décisions.",
}

export default function ArticleIaTechnologiePilotage() {
  return (
    <BlogArticlePageShell>
      <BlogArticleContainer>
        <BlogArticleIntro
          category="Innovation · Pilotage · IA"
          title="La technologie n’est plus un avantage. C’est un standard."
          date="24 avr. 2026"
          readTime="6 min"
          lead="Aujourd’hui, les entreprises qui performent ne travaillent plus comme avant. Elles s’appuient sur des outils intelligents pour automatiser leurs analyses, décider plus vite et comprendre ce qui crée réellement de la valeur. Et le virage est déjà en cours."
        />

        <BlogArticleStepList>
          <BlogArticleStep id="outils" step={1}>
            <BlogStorySectionHeader title="Des outils intelligents au service de la performance" />
            <BlogStoryBulletList
              items={[
                "Automatiser les analyses récurrentes et libérer du temps pour la réflexion.",
                "Prendre des décisions plus rapidement, avec des signaux plus clairs.",
                "Comprendre réellement ce qui crée de la valeur — et où investir l’effort.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="chiffres" step={2}>
            <BlogStorySectionHeader title="Les chiffres parlent d’eux-mêmes" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Plusieurs enquêtes et rapports sectoriels convergent sur une même tendance : l’adoption de l’IA et des
              outils analytiques s’accélère. Voici notamment des indicateurs souvent cités (les pourcentages peuvent
              varier selon les définitions et le périmètre de l’étude) :
            </BlogStoryParagraph>
            <ul className="mt-6 space-y-3 border-t border-slate-200/80 pt-6">
              <li className="flex gap-3 text-[14px] leading-relaxed text-[#5C5F66] sm:text-[15px]">
                <span className="mt-[0.55rem] h-px w-3 shrink-0 bg-slate-300" aria-hidden />
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span>73 % des organisations prévoient investir davantage en IA dans les prochaines années.</span>
                  <StatSourceInfoBubble ariaLabel="Source : article KPMG (2024)">
                    Ce chiffre provient d’un article de{" "}
                    <span className="font-semibold text-[#2A2F3A]">KPMG</span> publié en{" "}
                    <span className="font-semibold text-[#2A2F3A]">2024</span>.
                  </StatSourceInfoBubble>
                </span>
              </li>
              <li className="flex gap-3 text-[14px] leading-relaxed text-[#5C5F66] sm:text-[15px]">
                <span className="mt-[0.55rem] h-px w-3 shrink-0 bg-slate-300" aria-hidden />
                <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span>9 dirigeants sur 10 considèrent l’IA comme essentielle à leur croissance future.</span>
                  <StatSourceInfoBubble ariaLabel="Source : article KPMG (2024)">
                    Ce chiffre provient d’un article de{" "}
                    <span className="font-semibold text-[#2A2F3A]">KPMG</span> publié en{" "}
                    <span className="font-semibold text-[#2A2F3A]">2024</span>.
                  </StatSourceInfoBubble>
                </span>
              </li>
            </ul>
          </BlogArticleStep>

          <BlogArticleStep id="pendant-ce-temps" step={3}>
            <BlogStoryHighlightBlock eyebrow="Réalité régionale" title="Pendant ce temps…" tone="amber">
              <BlogStoryBulletList
                items={[
                  <span key="q" className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
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

          <BlogArticleStep id="concret" step={4}>
            <BlogStorySectionHeader title="Ce que ça veut dire concrètement" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">Deux réalités coexistent.</BlogStoryParagraph>
            <p className="mt-4 text-sm font-semibold text-[#2A2F3A]">Certaines entreprises</p>
            <BlogStoryBulletList items={["Automatisent.", "Analysent en continu.", "Prennent de meilleures décisions."]} />
            <p className="mt-6 text-sm font-semibold text-[#2A2F3A]">D’autres</p>
            <BlogStoryBulletList
              items={[
                "Travaillent encore massivement dans Excel.",
                "Manquent de visibilité sur l’essentiel.",
                "Réagissent au lieu d’anticiper.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="enjeu" step={5}>
            <BlogStorySectionHeader title="Le vrai enjeu n’est pas « la technologie »" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Ce n’est pas « utiliser de l’IA » pour le dire. C’est{" "}
              <strong className="font-semibold text-[#2A2F3A]">
                utiliser la bonne technologie, au bon endroit, pour prendre de meilleures décisions
              </strong>
              .
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="valeur" step={6}>
            <BlogStorySectionHeader title="Là où les entreprises créent réellement de la valeur" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Les organisations les plus performantes ne se contentent pas de produire des rapports ou de suivre des
              résultats. Elles cherchent à comprendre :
            </BlogStoryParagraph>
            <BlogStoryBulletList
              items={[
                "Ce qui améliore leur rentabilité.",
                "Ce qui augmente leur valeur.",
                "Où agir immédiatement — avec des priorités claires.",
              ]}
            />
          </BlogArticleStep>

          <BlogArticleStep id="piloter" step={7}>
            <BlogStorySectionHeader title="Une nouvelle façon de piloter votre entreprise" />
            <BlogStoryParagraph className="mt-0 sm:mt-0">
              Avec les bonnes données et les bons outils, vos chiffres deviennent clairs, vos décisions plus rapides, et
              votre valeur devient plus mesurable — pour vous, vos équipes et vos partenaires.
            </BlogStoryParagraph>
          </BlogArticleStep>

          <BlogArticleStep id="conclusion" step={8} isLast>
            <BlogStoryClosingBlock kicker="Parce qu’au final">
              <p>
                Les entreprises qui adoptent ces technologies ne gagnent pas seulement du temps. Elles prennent de
                meilleures décisions, évitent des erreurs coûteuses et, surtout, créent plus de valeur.
              </p>
              <BlogStoryBulletList
                items={[
                  "De meilleures décisions, plus tôt.",
                  "Moins d’erreurs coûteuses liées au manque de visibilité.",
                  "Une valeur créée et expliquée avec plus de clarté.",
                ]}
              />
            </BlogStoryClosingBlock>
          </BlogArticleStep>
        </BlogArticleStepList>
      </BlogArticleContainer>
    </BlogArticlePageShell>
  )
}
