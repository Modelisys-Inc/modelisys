"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  Layers,
  Store,
  Wallet,
} from "lucide-react"
import {
  APPROCHE_PHASE_IDS,
  navigateToApprochePhase,
  type ApprochePhaseId,
} from "@/lib/approche-navigation"

const PHASE_FULL_LABELS: Record<ApprochePhaseId, string> = {
  diagnostic: "Phase 1 — Diagnostic",
  planification: "Phase 2 — Planification",
  pilotage: "Phase 3 — Pilotage",
}

type CaseStudy = {
  client: string
  tagline: string
  context: string
  keyFigures: readonly { label: string; value: string }[]
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  journey: Record<ApprochePhaseId, string>
}

const CASE_STUDIES: CaseStudy[] = [
  {
    client: "Entreprise de services",
    tagline: "Rentabilité par division enfin lisible",
    context:
      "PME de services à 8,5 M$ de revenus et deux divisions. Les résultats consolidés semblaient sains — jusqu'à ce que Modelisys révèle ce qui se cachait derrière les totaux.",
    keyFigures: [
      { label: "Valeur initiale", value: "4,2 M$" },
      { label: "Objectif visé", value: "5,8 M$" },
      { label: "Horizon", value: "3 ans" },
    ],
    icon: BarChart3,
    journey: {
      diagnostic:
        "Modelisys évalue la société à 4,2 M$ (multiple de 4,5× sur un BAIIA normalisé de 935 000 $). La marge consolidée affiche 12 % — mais la division conseil tourne à 18 % tandis que la division technique affiche −4 %. Problème identifié : 320 000 $ de frais partagés mal alloués masquent une division déficitaire. Le diagnostic rend enfin visible ce que les totaux cachaient.",
      planification:
        "Objectif fixé : porter la division technique à 8 % de marge et la marge consolidée à 15 %, pour atteindre une valeur de 5,8 M$ en 3 ans. Deux scénarios modélisés dans Modelisys : statu quo (valeur stagnante à 4,4 M$) et plan d'action (réallocation de 180 000 $ de frais, réduction de 90 000 $ de coûts variables). Le scénario retenu projette une trajectoire vers 5,8 M$ avec des budgets mensuels par division alignés sur le plan.",
      pilotage:
        "Au sixième mois, la division technique progresse mais reste à −1 % de marge — en dessous des 8 % visés. Modelisys traduit l'écart en impact concret : −45 000 $ sur la trajectoire de valeur projetée. Hypothèses recalibrées : pricing ajusté sur trois contrats clés, plafond de dépenses variables réduit de 60 000 $/an, allocation des frais partagés revue. Modelisys recalcule la trajectoire : valeur projetée remontée à 5,4 M$ à l'horizon 18 mois — le cap de 5,8 M$ reste maintenu avec des actions correctives identifiées.",
    },
  },
  {
    client: "Entreprise manufacturière",
    tagline: "De 4,2 M$ à 7 M$ — acquisition et restructuration",
    context:
      "Dirigeant d'une PME manufacturière qui souhaite acquérir une cible et fermer une division non rentable — sans outil pour chiffrer l'impact sur la valeur.",
    keyFigures: [
      { label: "Valeur actuelle", value: "4,2 M$" },
      { label: "Objectif visé", value: "7 M$" },
      { label: "Financement anticipé", value: "850 k$" },
    ],
    icon: Briefcase,
    journey: {
      diagnostic:
        "L'analyse révèle une marge brute stable à 32 %, mais 45 % des revenus proviennent de trois clients. Valeur actuelle : 4,2 M$. Risques identifiés : dépendance client élevée, fonds de roulement sous tension (ratio de liquidité à 1,1, délai de recouvrement de 68 jours). Leviers : diversifier la clientèle, réduire le BFR de 15 % et gagner 2 points de marge opérationnelle.",
      planification:
        "Le dirigeant fixe un cap clair : atteindre 7 M$ de valeur en 3 ans par une acquisition à 24 mois et la fermeture d'une division non rentable. Modelisys modélise l'acquisition et la fermeture de division : impact sur revenus, dépenses fixes et variables, fonds de roulement. Les flux de trésorerie révèlent un besoin de financement de 850 000 $ au moment de l'acquisition. La fermeture de division libère +180 000 $ de trésorerie et +0,6 M$ de valeur projetée à terme.",
      pilotage:
        "À mi-parcours, les ventes dépassent le modèle grâce à l'embauche d'un vendeur — mais les dépenses variables grimpent plus vite que prévu (matériaux en hausse, salaire non budgétisé). Modelisys traduit l'écart : −80 000 $ sur la trajectoire de valeur vers les 7 M$. Scénario recalibré : dépenses variables resserrées, embauche reportée de six mois, besoin de financement réévalué à 780 000 $. Le cap de 7 M$ est maintenu, avec un plan vivant mis à jour chaque mois.",
    },
  },
  {
    client: "Entreprise cyclique",
    tagline: "Fonds de roulement, capex et cash sous contrôle",
    context:
      "Manufacturier au cycle de conversion long : stocks élevés, délais clients tendus et investissements à planifier sans visibilité sur les creux de trésorerie.",
    keyFigures: [
      { label: "Valeur actuelle", value: "3,5 M$" },
      { label: "BFR initial", value: "2,1 M$" },
      { label: "Trésorerie minimale visée", value: "600 k$" },
    ],
    icon: Wallet,
    journey: {
      diagnostic:
        "Modelisys situe la valeur à 3,5 M$ et le BFR à 2,1 M$ — dont 980 000 $ immobilisés en stocks et un délai de recouvrement de 72 jours. La trésorerie disponible : 420 000 $, jugée insuffisante pour absorber le prochain creux de cycle. Le diagnostic met en lumière le risque avant qu'il ne devienne une crise.",
      planification:
        "Objectif : maintenir la valeur à 3,5 M$ minimum tout en finançant 1,2 M$ de capex sur deux ans pour moderniser la production. Scénarios de capex modélisés : phase 1 (600 000 $) et phase 2 (600 000 $). Les projections de flux révèlent un besoin de marge de crédit de 350 000 $ au creux du cycle, à négocier avant la tension.",
      pilotage:
        "Au quatrième mois, le prix des matières premières grimpe de 12 % par rapport au scénario. La trésorerie descend à 380 000 $ — sous le seuil de 600 000 $ visé. Modelisys quantifie l'écart : 220 000 $ de tension non anticipée. Phase 2 des capex reportée de neuf mois, délai de recouvrement cible ramené de 72 à 58 jours, renégociation fournisseurs (−15 jours). Le plan de cash devient un outil de pilotage mensuel.",
    },
  },
  {
    client: "Groupe de 4 sociétés",
    tagline: "Vision consolidée multi-sociétés",
    context:
      "Groupe familial de quatre sociétés : consolidation manuelle, 1,8 M$ d'intercos et une filiale qui tire la performance vers le bas.",
    keyFigures: [
      { label: "Valeur groupe", value: "12 M$" },
      { label: "Objectif visé", value: "16 M$" },
      { label: "Perte filiale C", value: "−200 k$/an" },
    ],
    icon: Layers,
    journey: {
      diagnostic:
        "Modelisys consolide le groupe à 12 M$ de valeur. Société A (4,8 M$) et B (4,2 M$) performent — société C affiche −200 000 $ de perte annuelle et tire le groupe vers le bas. Les intercos (1,8 M$) sont mal documentées : écarts de consolidation récurrents et clôtures retardées. Le problème n'est plus abstrait — il est chiffré par entité.",
      planification:
        "Objectif groupe : 16 M$ en 4 ans. Deux options structurées : intégrer et redresser la société C, ou céder cette filiale. Scénario intégration : économies de 150 000 $/an, valeur groupe projetée à 14,5 M$ en 3 ans. Scénario cession : valeur immédiate +2,2 M$, mais perte de revenus croisés de 400 000 $. Modelisys modélise les deux trajectoires avec trésorerie groupe et besoins de financement.",
      pilotage:
        "Reporting uniformisé chaque mois : mêmes KPI, mêmes périodes. Au troisième mois, Modelisys détecte un écart intercos de 90 000 $ non éliminé — corrigé avant la clôture trimestrielle. Plan hybride retenu : cession partielle de la société C (60 %) et plan de redressement sur le reste. Valeur groupe suivie en continu : 13,2 M$ à mi-parcours, trajectoire révisée vers 15,4 M$ à 4 ans.",
    },
  },
  {
    client: "Cabinet comptable",
    tagline: "Accompagner un client PME sur tout le parcours",
    context:
      "Un cabinet accompagne une PME cliente de 5,2 M$ de revenus — du diagnostic initial au suivi mensuel, avec un langage commun autour de la valeur.",
    keyFigures: [
      { label: "Valeur client (départ)", value: "2,8 M$" },
      { label: "Objectif client", value: "4,5 M$" },
      { label: "BFR à optimiser", value: "200 k$" },
    ],
    icon: FileText,
    journey: {
      diagnostic:
        "Le cabinet structure le diagnostic dans Modelisys : valeur du client à 2,8 M$, ratio de liquidité à 1,1, marge opérationnelle de 9 % (sous la médiane sectorielle de 14 %). Concentration : 52 % des revenus chez deux clients. Le dirigeant et le conseiller partagent la même lecture — fini les fichiers Excel contradictoires.",
      planification:
        "Ambition du dirigeant : atteindre 4,5 M$ de valeur en 3 ans en diversifiant la clientèle et en portant la marge à 15 %. Scénario modélisé : acquisition de deux clients cibles (+800 000 $ de revenus), optimisation du BFR (−200 000 $ immobilisés), marge progressive de 9 % à 15 %. Besoin de financement ponctuel de 120 000 $ pour le fonds de roulement identifié avant la croissance.",
      pilotage:
        "Revues mensuelles dans Modelisys : réel vs scénario. Au quatrième mois, un dépassement de 60 000 $ sur les coûts variables est détecté — le cabinet alerte le dirigeant avant la clôture. Plan recalibré : embauche reportée, plafond de dépenses resserré, nouveau client signé (+12 % de revenus). Valeur projetée remontée de 3,1 M$ à 3,6 M$ à 12 mois.",
    },
  },
  {
    client: "Franchise",
    tagline: "Pilotage multi-sites simple et comparable",
    context:
      "Réseau de 12 franchises, 14 M$ de revenus consolidés — mais trois sites tirent la marge réseau vers le bas.",
    keyFigures: [
      { label: "Valeur réseau", value: "6,1 M$" },
      { label: "Objectif visé", value: "7,5 M$" },
      { label: "Sites sous-performants", value: "3 / 12" },
    ],
    icon: Store,
    journey: {
      diagnostic:
        "Modelisys évalue le réseau à 6,1 M$ de valeur. Marge moyenne : 14 % — mais trois sites affichent moins de 8 % (dont un à 4,1 %). Écart de performance : le meilleur site tourne à 19 % de marge, le pire à 4,1 %. Coûts de main-d'œuvre mal calibrés sur les sites faibles et promotions non rentables identifiées comme causes racines.",
      planification:
        "Objectif : porter tous les sites à 12 %+ de marge et atteindre 7,5 M$ de valeur réseau en 3 ans. Scénarios par site modélisés : optimisation main-d'œuvre (−8 % de coûts sur sites faibles), promotions ciblées (+5 % de trafic sur sites moyens), consolidation des achats (−3 % sur le coût des marchandises). Trajectoire réseau projetée : 7,5 M$ si le plan est exécuté.",
      pilotage:
        "Suivi mensuel par site vs scénario. Au troisième mois, le site #7 voit sa marge passer de 6,2 % à 4,1 % — Modelisys alerte dès la semaine 3. Coaching ciblé sur les trois sites faibles, partage des pratiques du site à 19 % de marge, promotions révisées. Marge réseau remontée à 13,1 % à 12 mois, valeur projetée à 7,1 M$ — en ligne vers l'objectif de 7,5 M$.",
    },
  },
]

function KeyFiguresBar({ figures }: { figures: readonly { label: string; value: string }[] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {figures.map((fig) => (
        <div
          key={fig.label}
          className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{fig.label}</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
            {fig.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function PhaseJourneyList({ journey }: { journey: Record<ApprochePhaseId, string> }) {
  return (
    <div className="mt-10 border-t border-slate-200/90 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Le parcours en trois phases
      </p>
      <ul className="mt-6 space-y-6">
        {APPROCHE_PHASE_IDS.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => navigateToApprochePhase(id)}
              className="group w-full text-left"
            >
              <div className="flex gap-3 sm:gap-4">
                <span className="relative mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center">
                  <span className="absolute h-2 w-2 rounded-full bg-[#E0742D]/80 transition group-hover:bg-[#E0742D]" />
                  <span className="absolute h-5 w-5 rounded-full border border-slate-200/90 bg-white transition group-hover:border-[#E0742D]/35" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#2A2F3A] transition group-hover:text-[#E0742D] sm:text-[15px]">
                    {PHASE_FULL_LABELS[id]}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">{journey[id]}</p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CaseStudiesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  const commonQuote =
    "« Chaque chiffre raconte une histoire — et Modelisys la rend lisible, du diagnostic initial au pilotage qui rapproche de l'objectif de valeur. »"

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  const total = CASE_STUDIES.length
  const active = CASE_STUDIES[activeIndex] ?? CASE_STUDIES[0]
  const ActiveIcon = active.icon

  const contentMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -12, filter: "blur(6px)" },
        transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
      }

  return (
    <section
      id="etudes-de-cas"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/70 pt-16 sm:pt-24 pb-12 sm:pb-16 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <div
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-14 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Études de cas
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            L&apos;approche Modelisys,{" "}
            <span className="text-[#5C5F66]">dans des contextes réels</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#5C5F66] sm:text-lg">
            Chaque étude de cas suit les trois phases du parcours — du diagnostic au pilotage — pour montrer
            comment Modelisys s&apos;applique concrètement à des situations variées.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
        </div>

        <div
          className={`relative transition-all duration-1000 delay-150 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-14">
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                    <Building2 className="h-4 w-4 text-[#E0742D]" strokeWidth={2} aria-hidden />
                    Études de cas
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide text-slate-500">
                    {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                    <div
                      className="h-full rounded-full bg-[#E0742D] transition-[width] duration-300"
                      style={{ width: `${((activeIndex + 1) / total) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {CASE_STUDIES.map((cs, i) => {
                    const isActive = i === activeIndex
                    return (
                      <button
                        key={cs.client}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                          isActive
                            ? "bg-[#E0742D]/10 ring-1 ring-[#E0742D]/35"
                            : "hover:bg-slate-50 ring-1 ring-transparent"
                        }`}
                        aria-current={isActive ? "true" : undefined}
                      >
                        <span
                          className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                            isActive ? "bg-[#E0742D]" : "bg-slate-300 group-hover:bg-slate-400"
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[#2A2F3A]">{cs.client}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{cs.tagline}</span>
                          <span className="mt-1.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            3 phases
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-6 text-xs leading-relaxed text-slate-500">
                  Exemples inspirés de situations fréquentes — chaque étude détaille les trois phases du parcours
                  Modelisys.
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 right-0 hidden select-none text-[120px] font-semibold leading-none tracking-tight text-[#2A2F3A]/[0.035] lg:block xl:text-[150px]"
              >
                étude<span className="text-[#E0742D]/20">.</span>
              </div>

              <div className="lg:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-4 py-2 text-xs font-semibold text-[#2A2F3A] shadow-sm">
                    <Building2 className="h-4 w-4 text-[#E0742D]" strokeWidth={2} aria-hidden />
                    Études de cas
                  </div>
                  <div className="flex items-center gap-2">
                    {CASE_STUDIES.map((cs, i) => (
                      <button
                        key={cs.client}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        aria-label={`Voir ${cs.client}`}
                        className={`h-2.5 w-2.5 rounded-full ring-1 transition ${
                          i === activeIndex
                            ? "bg-[#E0742D] ring-[#E0742D]/40"
                            : "bg-white ring-slate-300 hover:ring-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 lg:mt-0">
                <AnimatePresence mode="wait">
                  <motion.div key={active.client} {...contentMotion} className="relative">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Situation
                        </p>
                        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl">
                          {active.client}
                        </h3>
                        <p className="mt-3 max-w-3xl text-base font-semibold text-[#E0742D] sm:text-lg">
                          {active.tagline}
                        </p>
                        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5C5F66] sm:text-lg">
                          {active.context}
                        </p>
                        <KeyFiguresBar figures={active.keyFigures} />
                      </div>
                      <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm">
                        <ActiveIcon className="h-7 w-7 text-[#2A2F3A]" strokeWidth={1.75} aria-hidden />
                      </div>
                    </div>

                    <PhaseJourneyList journey={active.journey} />

                    <div className="mt-10">
                      <p className="text-sm italic leading-relaxed text-[#E0742D]">{commonQuote}</p>
                      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200/80 pt-4">
                        <button
                          type="button"
                          onClick={() => navigateToApprochePhase("diagnostic")}
                          className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#5C5F66] transition hover:text-[#2A2F3A]"
                        >
                          Explorer le parcours
                          <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                        </button>
                        <a
                          href="#demo"
                          className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 transition hover:text-[#E0742D]"
                        >
                          Réserver une démo
                          <span className="inline-block h-px w-8 bg-[#E0742D]/70" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
