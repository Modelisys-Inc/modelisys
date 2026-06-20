"use client"

import { useEffect, useRef, useState } from "react"
import { Briefcase, Building2 } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const APPROCHE_PHASES = [
  { title: "Diagnostic", body: "Ancrer le point de départ : analyse, évaluation, risques et KPI" },
  { title: "Planification", body: "Clarifier la vision, modéliser les scénarios et projeter la trajectoire" },
  { title: "Pilotage", body: "Analyser les écarts réel vs prévu vs passé et recalibrer le plan en continu" },
] as const

const TWO_REALITIES = [
  {
    id: "cpa",
    title: "Ce que vivaient les CPA",
    tagline: "Toujours en mode réactif",
    icon: Briefcase,
    bullets: [
      "Pas de chiffres en temps réel.",
      "Pas de budget du client pour ancrer la discussion.",
      "Pas de vision commune.",
      "Incapables de répondre sur le champ aux questions de leurs clients.",
      "La relation conseil restait superficielle, faute d'outils partagés.",
    ],
  },
  {
    id: "dirigeants",
    title: "Ce que vivaient les dirigeants",
    tagline: "Une vision fragmentée de leur propre entreprise",
    icon: Building2,
    bullets: [
      "Difficulté à analyser la rentabilité par produit, par division ou consolidée si plusieurs entités.",
      "Visibilité insuffisante sur le modèle d'affaires et sur les moyens de limiter les risques opérationnels.",
      "Valeur d'entreprise inconnue ou floue.",
      "Aucun lien visible entre leurs décisions opérationnelles et l'impact sur la valeur réelle de ce qu'ils avaient bâti.",
    ],
  },
] as const

const STORY_STEPS = [
  { id: "story-contexte", step: 1, roadmap: "Contexte" },
  { id: "story-constat", step: 2, roadmap: "Constat" },
  { id: "story-terrain", step: 3, roadmap: "Terrain" },
  { id: "story-realites", step: 4, roadmap: "Réalités" },
  { id: "story-blocage", step: 5, roadmap: "Blocage" },
  { id: "story-declic", step: 6, roadmap: "Déclic" },
  { id: "story-verbes", step: 7, roadmap: "Approche" },
  { id: "story-fin", step: 8, roadmap: "Mission" },
] as const

const easeOut = [0.22, 1, 0.36, 1] as const
const contentEase = [0.2, 0.8, 0.2, 1] as const

function StorySectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        <span className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent" aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
        {title}
      </h2>
    </div>
  )
}

function StepRail({ n }: { n: string }) {
  return (
    <div className="flex flex-col gap-1 sm:pt-0.5">
      <span className="font-mono text-4xl font-bold leading-none tabular-nums text-[#E0742D]/25 sm:text-5xl">{n}</span>
    </div>
  )
}

export function AboutOurStorySection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const reduce = useReducedMotion()

  const contentMotion = reduce
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.15 },
        transition: { duration: 0.45, ease: easeOut },
      }

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      ref={sectionRef}
      id="histoire"
      className="scroll-mt-24 relative z-10 border-t border-slate-200/80 bg-transparent py-20 sm:py-28"
    >
      <div className="relative mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <div
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Notre histoire</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
            Né d&apos;un besoin clair :{" "}
            <span className="text-[#5C5F66]">comprendre pour mieux piloter.</span>
          </h2>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
        </div>

        <div
          className={`mb-10 transition-all duration-1000 delay-100 lg:mb-14 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 lg:text-left">
            Parcours du récit
          </p>
          <nav className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-8 sm:gap-x-2" aria-label="Sections du récit">
            {STORY_STEPS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="group flex flex-col items-center gap-2 py-1 text-center text-slate-600 transition hover:text-[#2A2F3A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/40"
              >
                <span className="font-mono text-[11px] font-semibold tabular-nums text-[#E0742D] transition group-hover:text-[#c45f1f] sm:text-xs">
                  {String(item.step).padStart(2, "0")}
                </span>
                <span className="line-clamp-2 text-[9px] font-medium leading-tight text-slate-500 group-hover:text-slate-700 sm:text-[10px] lg:text-[11px]">
                  {item.roadmap}
                </span>
              </a>
            ))}
          </nav>
        </div>

        <ol
          className={`mx-auto max-w-4xl space-y-0 border-t border-slate-200/90 transition-all duration-1000 delay-200 lg:max-w-none ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <li
            id="story-contexte"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="01" />
            <div className="min-w-0">
              <StorySectionHeader eyebrow="Contexte" title="De l'autre côté de la table" />
              <motion.div {...contentMotion} className="space-y-5">
                {[
                  "Modelisys n'a pas été imaginé dans un bureau de startup. Il a été conçu après des années passées assis de l'autre côté de la table — avec des entrepreneurs qui ne savaient pas exactement où en était leur entreprise, et des CPA qui auraient voulu pouvoir mieux les aider.",
                  "Avant de fonder Modelisys, notre cofondateur a passé plusieurs années en cabinet comptable, puis en évaluation d'entreprise. Ce sont des volets complémentaires du même métier au service des PME — et ils ont surtout confirmé un même écart : l'absence d'une base commune entre les professionnels et leurs clients pour travailler sur les mêmes données, au même moment.",
                  "Les associés rencontraient les dirigeants, posaient des questions et sollicitaient des documents, sans toujours pouvoir situer en cours d'année où en était réellement l'entreprise. Les PME, de leur côté, n'avaient souvent aucun outil pour relier leurs décisions à ce qui crée ou détruit de la valeur, ni pour structurer et optimiser leur gestion financière au-delà de rapports éclatés. Les échanges restaient réactifs : pas d'environnement partagé, pas de chiffres alignés en temps réel, pas de lecture commune — seulement des allers-retours alors que tout le monde aurait eu besoin du même socle pour décider.",
                ].map((text, i) => (
                  <p key={i} className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                    {text}
                  </p>
                ))}
              </motion.div>
            </div>
          </li>

          <li
            id="story-constat"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="02" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Constat</p>
              <motion.div
                className="mt-6 border-l-2 border-[#E0742D]/45 pl-6 md:pl-8"
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 10 },
                      whileInView: { opacity: 1, y: 0 },
                      viewport: { once: true, amount: 0.35 },
                      transition: { duration: 0.5, ease: contentEase },
                    })}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E0742D]">Terrain CPA</p>
                <p className="mt-4 text-lg font-medium leading-snug tracking-tight text-[#2A2F3A] sm:text-xl">
                  — Constat récurrent après des années de travail aux côtés d&apos;associés CPA de firmes québécoises et de
                  PME
                </p>
              </motion.div>
            </div>
          </li>

          <li
            id="story-terrain"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="03" />
            <div className="min-w-0">
              <StorySectionHeader eyebrow="Sur le terrain" title="Autour de la même table : deux angles morts" />
              <motion.div {...contentMotion} className="grid gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#2A2F3A]">Dans les cabinets</h3>
                  <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                    Les associés le disaient eux-mêmes : ils n&apos;avaient ni les données du client en temps réel, ni un budget
                    de référence pour suivre l&apos;évolution de l&apos;entreprise en cours d&apos;année — trésorerie, fonds de
                    roulement, investissements (capex) et autres leviers qu&apos;il faut pour cadrer la discussion avec le
                    dirigeant. Sans ce socle commun, impossible d&apos;avoir la même lecture que lui au bon moment. Ajoutez à
                    cela des états financiers de fin d&apos;exercice livrés souvent six mois ou plus après la clôture : lorsqu&apos;on
                    peut enfin expliquer ce qui s&apos;est passé, une bonne moitié du nouvel exercice est déjà entamée — parfois
                    davantage. Le rôle de conseil n&apos;est alors plus optimal : on réagit sur un passé trop lointain pour
                    orienter le présent.
                  </p>
                </div>
                <div className="lg:border-l lg:border-slate-200/70 lg:pl-14">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#2A2F3A]">
                    En évaluation d&apos;entreprise
                  </h3>
                  <p className="mt-4 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                    Dans les mandats d&apos;évaluation, les PME arrivaient souvent sans budget formalisé — et sans avoir
                    vraiment saisi comment la valeur d&apos;entreprise ou la valeur des actions est déterminée. Peu
                    avaient questionné leur modèle d&apos;affaires ni mesuré son impact sur cette valeur ; encore moins
                    comment l&apos;optimiser. Analyser la rentabilité par produit, par projet, par division ou pour
                    l&apos;ensemble du groupe restait difficile, alors même que ces leviers pèsent directement sur ce qu&apos;un
                    évaluateur retient dans son travail.
                  </p>
                </div>
              </motion.div>
            </div>
          </li>

          <li
            id="story-realites"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="04" />
            <div className="min-w-0">
              <StorySectionHeader eyebrow="Le déclencheur" title="Les deux réalités qui ont tout déclenché" />
              <motion.div {...contentMotion} className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                {TWO_REALITIES.map((col, index) => {
                  const Icon = col.icon
                  return (
                    <div
                      key={col.id}
                      className={cn(index === 1 && "lg:border-l lg:border-slate-200/70 lg:pl-16")}
                    >
                      <div className="flex items-baseline gap-3">
                        <Icon className="h-4 w-4 shrink-0 text-[#E0742D]/80" strokeWidth={1.5} aria-hidden />
                        <h3 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">{col.title}</h3>
                      </div>
                      <p className="mt-3 text-sm font-medium text-[#E0742D] sm:text-[15px]">{col.tagline}</p>
                      <ul className="mt-6 space-y-3 border-t border-slate-200/80 pt-6">
                        {col.bullets.map((line) => (
                          <li key={line} className="flex gap-3 text-[14px] leading-relaxed text-[#5C5F66] sm:text-[15px]">
                            <span className="mt-[0.55rem] h-px w-3 shrink-0 bg-slate-300" aria-hidden />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </li>

          <li
            id="story-blocage"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="05" />
            <div className="min-w-0">
              <StorySectionHeader eyebrow="Le blocage" title="Quand la conversation n'avance pas" />
              <motion.div {...contentMotion} className="grid gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Tension</p>
                  <h3 className="mt-4 text-lg font-semibold text-[#2A2F3A]">La conversation impossible</h3>
                  <p className="mt-4 text-lg font-medium leading-snug text-[#E0742D] sm:text-xl">
                    &quot;Et si on fait ça — quel est l&apos;impact ?&quot;
                  </p>
                  <p className="mt-5 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                    Les clients posaient les bonnes questions : embaucher, investir, ouvrir une nouvelle division, vendre une
                    entité. Mais le processus pour y répondre était long — obtenir les documents, tenir les allers-retours,
                    monter un modèle complet dans des fichiers éclatés — avant même d&apos;arriver à une lecture chiffrée. Sans
                    outils de simulation ni données à jour en continu, ce travail livrait surtout des ordres de grandeur, rarement
                    des certitudes.
                  </p>
                </div>
                <div className="lg:border-l lg:border-slate-200/70 lg:pl-14">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Évaluation</p>
                  <h3 className="mt-4 text-lg font-semibold text-[#2A2F3A]">Le moment de l&apos;évaluation</h3>
                  <p className="mt-3 text-sm font-medium text-[#E0742D]">Découvrir sa valeur trop tard</p>
                  <p className="mt-5 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                    En mandat d&apos;évaluation CBV, le constat revenait souvent : les dirigeants découvraient pour la première fois ce
                    qui influençait la valeur de leur entreprise — au moment de vendre ou de financer. Des années d&apos;optimisation
                    possible perdues.
                  </p>
                </div>
              </motion.div>
            </div>
          </li>

          <li
            id="story-declic"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="06" />
            <div className="min-w-0">
              <StorySectionHeader eyebrow="Le déclic" title="Construire ce qui n'existait pas" />
              <motion.div {...contentMotion} className="space-y-8">
                <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                  C&apos;est l&apos;accumulation de ces constats — répétés pendant des années, dans les deux univers — qui a déclenché
                  la décision. Non pas de critiquer les outils existants, mais de construire ce qui n&apos;existait pas : une
                  plateforme qui réunit le dirigeant et son conseiller dans le même environnement financier, avec un parcours
                  structuré en trois phases — comprendre, planifier et piloter.
                </p>
                <div className="h-px w-full max-w-2xl bg-slate-200/90" aria-hidden />
                <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                  Modelisys structure les données, les outils et la méthode pour mesurer, visionner, modéliser, exécuter et
                  ajuster. La plateforme prépare le terrain ; l&apos;accompagnement stratégique — diagnostic, valorisation,
                  projections, analyse des écarts — s&apos;active lorsque le client le choisit. Un CPA qui partage les mêmes
                  chiffres en temps réel peut enfin jouer pleinement son rôle de conseiller.
                </p>
              </motion.div>
            </div>
          </li>

          <li
            id="story-verbes"
            className="grid scroll-mt-32 gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10"
          >
            <StepRail n="07" />
            <div className="min-w-0">
              <StorySectionHeader eyebrow="L'approche Modelisys" title="Trois phases pour piloter la valeur" />
              <motion.div {...contentMotion} className="divide-y divide-slate-200/80 border-t border-slate-200/80">
                {APPROCHE_PHASES.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-10 sm:py-5"
                  >
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[#2A2F3A] sm:w-36">{item.title}</span>
                    <span className="min-w-0 text-[15px] leading-relaxed text-[#5C5F66]">{item.body}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </li>

          <li id="story-fin" className="grid scroll-mt-32 gap-6 py-8 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-10">
            <StepRail n="08" />
            <div className="min-w-0">
              <motion.div
                className="border-t border-slate-200/90 pt-8 sm:pt-10"
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 10 },
                      whileInView: { opacity: 1, y: 0 },
                      viewport: { once: true, amount: 0.35 },
                      transition: { duration: 0.5, ease: contentEase },
                    })}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]">Pourquoi Modelisys existe</p>
                <p className="mt-6 max-w-3xl text-[15px] leading-[1.8] text-[#5C5F66] sm:text-[17px]">
                  C&apos;est pour ça que Modelisys existe. Non pas pour remplacer le conseiller — mais pour lui donner, ainsi qu&apos;au
                  dirigeant, la plateforme et le parcours qu&apos;ils n&apos;avaient jamais eus : ancrer un point de départ, fixer une
                  vision chiffrée, modéliser la trajectoire, suivre les écarts et recalibrer au fil du temps — en partenariat, sur
                  des données communes, adapté à la réalité des PME d&apos;ici.
                </p>
              </motion.div>
            </div>
          </li>
        </ol>
      </div>
    </section>
  )
}
