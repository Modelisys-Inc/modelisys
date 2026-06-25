"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  Settings,
  DollarSign,
  CheckCircle2,
  Calculator,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Send,
  CalendarClock,
  User,
  Mail,
  AlertCircle,
  Compass,
  ClipboardList,
  Route,
  Gauge,
  type LucideIcon,
} from "lucide-react"
import { PricingQuickEstimatePanel } from "@/components/pricing-quick-estimate-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  buildQuickCalculatorModuleIds,
  computePricingEstimate,
  formatCad,
  getComplexityMultiplier,
  type PricingComplexityLevel,
} from "@/lib/pricing-estimate"
const FORMSPREE_PRICING = "https://formspree.io/f/xzdapzyv"

const IMPLEMENTATION_FULL_INCLUDES = [
  "Structuration complète de vos données et de votre périmètre financier",
  "Configuration de chacune des fonctionnalitées et contrôle qualité",
  "Mise en place des règles, modules et logiques adaptées à votre réalité",
  "Prise en charge des éléments complexes (mapping, consolidation, intercos)",
  "Formation des équipes et transfert d'une méthodologie claire et durable",
] as const

const IMPLEMENTATION_PARTIAL_INCLUDES = [
  "Accès à un cadre structuré pour configurer votre modèle financier",
  "Configuration réalisée par vos équipes, selon vos besoins et votre rythme",
  "Formation initiale pour maîtriser la logique de structuration et de paramétrage",
  "Support ciblé pour valider les étapes clés et sécuriser vos décisions",
  "Accompagnement ponctuel en cas de blocage ou de situation complexe",
] as const

const SUBSCRIPTION_INCLUDES = [
  "Accès à l'ensemble des fonctionnalités de pilotage et de valorisation",
  "Mises à jour et évolutions produit incluses",
  "Support technique et assistance à l'usage de la plateforme",
] as const

const ACCOMPANIMENT_INCLUDES = [
  "Diagnostic — phase 1, forfait ponctuel",
  "Planification — phases 1 à 2, forfait ponctuel",
  "Pilotage — phases 1 à 3 avec suivi, abonnement",
  "Réalisable avec l'équipe Modelisys ou vos professionnels de confiance",
] as const

const ACCOMPANIMENT_PATHS: {
  step: number
  title: string
  duration: string
  durationNote: string
  durationSubnote?: string
}[] = [
  {
    step: 1,
    title: "Directement par l'équipe Modelisys",
    duration: "Forfait ou abonnement",
    durationNote: "Diagnostic, Planification ou Pilotage — selon vos objectifs et votre niveau d'autonomie.",
  },
  {
    step: 2,
    title: "Par les professionnels de confiance de votre organisation",
    duration: "Selon votre mandat",
    durationNote: "Vos professionnels s'appuient sur la plateforme et la méthodologie Modelisys.",
    durationSubnote: "Vous conservez la relation conseil avec votre CPA ou votre équipe.",
  },
]

const MODELISYS_ACCOMPANIMENT_OFFERS: {
  icon: LucideIcon
  title: string
  phases: string
  billing: "forfait" | "abonnement"
  description: string
  highlights: readonly string[]
}[] = [
  {
    icon: ClipboardList,
    title: "Diagnostic",
    phases: "Phase 1 — Diagnostic",
    billing: "forfait",
    description:
      "Principalement pour les entreprises qui souhaitent connaître leur situation actuelle, puis poursuivre en autonomie sur la plateforme.",
    highlights: [
      "Lecture structurée de votre situation financière et de votre valeur",
      "Identification des risques et des leviers prioritaires",
      "Acte ponctuel — vous pilotez ensuite seuls dans Modelisys",
    ],
  },
  {
    icon: Route,
    title: "Planification",
    phases: "Phases 1 à 2 — Diagnostic et Planification",
    billing: "forfait",
    description:
      "Pour les entreprises qui veulent établir leur situation, définir leurs objectifs et élaborer différents scénarios de croissance.",
    highlights: [
      "Diagnostic et valorisation comme point de départ",
      "Vision et objectifs chiffrés",
      "Modélisation de scénarios et projections de trajectoire",
    ],
  },
  {
    icon: Gauge,
    title: "Pilotage",
    phases: "Phases 1 à 3 — parcours complet",
    billing: "abonnement",
    description:
      "Accompagnement sur l'ensemble de la trajectoire de valeur, avec un suivi mensuel ou trimestriel selon vos besoins.",
    highlights: [
      "Diagnostic, planification et pilotage",
      "Analyse des écarts réel vs passé vs prévu et recalibrage continu",
      "Suivi récurrent mensuel ou trimestriel avec notre équipe",
    ],
  },
]

const estimateFieldClass =
  "h-12 border-slate-200 bg-white/80 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"

function DetailList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((line) => (
        <li key={line} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#5C5F66]">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E0742D]" strokeWidth={2} />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  )
}

export function PricingProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showAccompanimentView, setShowAccompanimentView] = useState(false)
  const [revenueM, setRevenueM] = useState(10)
  const [entityBand, setEntityBand] = useState<"1" | "2-4" | "5-9" | "10+">("1")
  const [complexityLevel, setComplexityLevel] = useState<PricingComplexityLevel>("standard")
  const [implementationOption, setImplementationOption] = useState<"full" | "partial">("full")
  const [estimateEmail, setEstimateEmail] = useState("")
  const [estimateName, setEstimateName] = useState("")
  const [estimateSubmitting, setEstimateSubmitting] = useState(false)
  const [estimateSent, setEstimateSent] = useState(false)

  const companies = useMemo(() => {
    if (entityBand === "1") return 1
    if (entityBand === "2-4") return 3
    if (entityBand === "5-9") return 7
    return 10
  }, [entityBand])

  const isContactBand = entityBand === "10+"
  const isAutonomousOption = implementationOption === "partial"
  const revenueBrackets = Math.max(0, Math.ceil(revenueM / 5) - 1)
  const revenueIntegrationMultiplier = 1 + revenueBrackets * 0.05

  const estimate = useMemo(() => {
    if (isContactBand) {
      return { monthlyMin: 0, monthlyMax: 0, integrationMin: 0, integrationMax: 0 }
    }
    const base = computePricingEstimate({
      revenueM,
      companies,
      selectedModuleIds: buildQuickCalculatorModuleIds(),
      includeConsolidationModule: true,
    })
    const cx = getComplexityMultiplier(complexityLevel)
    const scale = (n: number) => Math.round(n * cx)

    if (entityBand === "1") {
      return {
        monthlyMin: scale(base.monthlyMin),
        monthlyMax: scale(base.monthlyMax),
        integrationMin: scale(Math.round(3000 * revenueIntegrationMultiplier)),
        integrationMax: scale(Math.round(4320 * revenueIntegrationMultiplier)),
      }
    }
    if (entityBand === "2-4") {
      return {
        monthlyMin: scale(base.monthlyMin),
        monthlyMax: scale(base.monthlyMax),
        integrationMin: scale(Math.round(6000 * revenueIntegrationMultiplier)),
        integrationMax: scale(Math.round(12000 * revenueIntegrationMultiplier)),
      }
    }
    if (entityBand === "5-9") {
      return {
        monthlyMin: scale(base.monthlyMin),
        monthlyMax: scale(base.monthlyMax),
        integrationMin: scale(Math.round(15000 * revenueIntegrationMultiplier)),
        integrationMax: scale(Math.round(27000 * revenueIntegrationMultiplier)),
      }
    }
    return {
      monthlyMin: scale(base.monthlyMin),
      monthlyMax: scale(base.monthlyMax),
      integrationMin: scale(base.integrationMin),
      integrationMax: scale(base.integrationMax),
    }
  }, [isContactBand, companies, entityBand, revenueM, revenueIntegrationMultiplier, complexityLevel])

  const integrationMinDisplay = isAutonomousOption
    ? Math.round(estimate.integrationMin * 0.75)
    : estimate.integrationMin
  const integrationMaxDisplay = isAutonomousOption
    ? Math.round(estimate.integrationMax * 0.75)
    : estimate.integrationMax

  const integrationPriceLabel = isContactBand
    ? "Nous contacter"
    : showCalculator
      ? `${formatCad(integrationMinDisplay)} $ – ${formatCad(integrationMaxDisplay)} $`
      : "Via calculateur"

  const subscriptionPriceLabel = isContactBand
    ? "Nous contacter"
    : showCalculator
      ? `${formatCad(estimate.monthlyMin)} $ – ${formatCad(estimate.monthlyMax)} $ / mois`
      : "Via calculateur"

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

  const handleSendEstimate = async (e: FormEvent) => {
    e.preventDefault()
    if (!estimateName.trim() || !estimateEmail.trim()) return
    setEstimateSubmitting(true)
    try {
      const response = await fetch(FORMSPREE_PRICING, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "pricing_estimate",
          _subject: "Estimation tarifaire — Modelisys",
          name: estimateName.trim(),
          email: estimateEmail.trim(),
          revenus_consolides_M$: revenueM,
          societes_divisions: entityBand,
          niveau_complexite: complexityLevel,
          frais_implantation_fourchette$: isContactBand
            ? "Nous contacter"
            : `${formatCad(integrationMinDisplay)} – ${formatCad(integrationMaxDisplay)}`,
          abonnement_fourchette_mensuelle$: isContactBand
            ? "Nous contacter"
            : `${formatCad(estimate.monthlyMin)} – ${formatCad(estimate.monthlyMax)}`,
          accompagnement_strategique: "Non inclus — sur devis (volet optionnel)",
          message:
            "Le client souhaite être recontacté suite à son estimation en ligne (paramètres ci-dessus). L'estimation couvre la configuration et l'abonnement uniquement. Engagement : prise de contact sous 24 h.",
        }),
      })
      if (response.ok) {
        setEstimateSent(true)
        setEstimateEmail("")
        setEstimateName("")
        window.setTimeout(() => setEstimateSent(false), 8000)
      }
    } finally {
      setEstimateSubmitting(false)
    }
  }

  const openCalculator = () => {
    setShowAccompanimentView(false)
    setShowCalculator(true)
    requestAnimationFrame(() => {
      document.getElementById("pricing-calculator")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const openAccompanimentView = () => {
    setShowCalculator(false)
    setShowAccompanimentView(true)
    requestAnimationFrame(() => {
      document.getElementById("accompagnement-partenaires")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  const closeAccompanimentView = () => {
    setShowAccompanimentView(false)
    requestAnimationFrame(() => {
      document.getElementById("pricing-volets")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <section
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-slate-200/90 bg-gradient-to-b from-white via-slate-50/95 to-slate-100/50 pt-28 sm:pt-32 md:pt-36 pb-20 sm:pb-28 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 20%, rgb(224 116 45 / 0.06) 0%, transparent 45%),
              radial-gradient(circle at 88% 75%, rgb(148 163 184 / 0.12) 0%, transparent 48%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-8 right-8 hidden select-none text-[120px] font-semibold leading-none tracking-tight text-[#2A2F3A]/[0.035] lg:block xl:text-[150px]"
        >
          prix<span className="text-[#E0742D]/20">.</span>
        </div>

        <div
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-14 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Tarification
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Trois volets,{" "}
            <span className="text-[#5C5F66]">une proposition claire</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#5C5F66] sm:text-lg">
            Configuration, abonnement et accompagnement stratégique — chaque volet est distinct. Le calculateur estime les
            deux premiers selon votre structure.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
        </div>

        {!showAccompanimentView ? (
        <div
          id="pricing-volets"
          className={`grid scroll-mt-28 gap-5 transition-all duration-1000 delay-75 lg:grid-cols-3 lg:gap-6 lg:items-stretch ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Volet 01 — Configuration */}
          <article
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm",
              showCalculator && !isContactBand ? "ring-1 ring-[#E0742D]/15" : "border-slate-200/90",
            )}
          >
            <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="font-mono text-xl font-bold tabular-nums text-[#E0742D]/25">01</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Ponctuel
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50">
                  <Settings className="h-5 w-5 text-[#2A2F3A]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#2A2F3A]">Configuration</h3>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-[#E0742D]">{integrationPriceLabel}</p>
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              <p className="text-[13px] leading-relaxed text-[#5C5F66]">
                Intégration des données comptables, paramétrage de la plateforme et formation technique — sans diagnostic
                financier ni évaluation de valeur.
              </p>

              <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/60 p-1">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setImplementationOption("full")}
                    className={cn(
                      "rounded-lg px-2.5 py-2 text-left transition",
                      implementationOption === "full"
                        ? "bg-white ring-1 ring-[#E0742D]/35 shadow-sm"
                        : "hover:bg-white/70",
                    )}
                  >
                    <p className="text-xs font-semibold text-[#2A2F3A]">Clé en main</p>
                    <p className="mt-0.5 text-[10px] text-[#5C5F66]">Recommandé</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImplementationOption("partial")}
                    className={cn(
                      "rounded-lg px-2.5 py-2 text-left transition",
                      implementationOption === "partial"
                        ? "bg-white ring-1 ring-[#E0742D]/35 shadow-sm"
                        : "hover:bg-white/70",
                    )}
                  >
                    <p className="text-xs font-semibold text-[#2A2F3A]">Autonome</p>
                    <p className="mt-0.5 text-[10px] text-[#5C5F66]">Support ponctuel</p>
                  </button>
                </div>
              </div>

              {implementationOption === "partial" && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/90 bg-amber-50/80 px-2.5 py-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Pour équipes expérimentées en finance et comptabilité.
                  </p>
                </div>
              )}

              <div className="mt-4 flex-1">
                <DetailList
                  items={
                    implementationOption === "full" ? IMPLEMENTATION_FULL_INCLUDES : IMPLEMENTATION_PARTIAL_INCLUDES
                  }
                />
              </div>
            </div>
          </article>

          {/* Volet 02 — Abonnement */}
          <article
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm",
              showCalculator && !isContactBand ? "ring-1 ring-[#E0742D]/15" : "border-slate-200/90",
            )}
          >
            <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="font-mono text-xl font-bold tabular-nums text-[#E0742D]/25">02</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Récurrent
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50">
                  <DollarSign className="h-5 w-5 text-[#2A2F3A]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#2A2F3A]">Abonnement</h3>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-[#E0742D]">{subscriptionPriceLabel}</p>
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              <p className="text-[13px] leading-relaxed text-[#5C5F66]">
                Accès mensuel à la plateforme, mises à jour produit et support technique — les outils pour mesurer,
                piloter et augmenter la valeur de votre entreprise ; l&apos;analyse stratégique à votre place reste
                optionnelle.
              </p>
              <div className="mt-4 flex-1">
                <DetailList items={SUBSCRIPTION_INCLUDES} />
              </div>
            </div>
          </article>

          {/* Volet 03 — Accompagnement */}
          <article className="flex flex-col overflow-hidden rounded-2xl border border-[#E0742D]/20 bg-white shadow-sm ring-1 ring-[#E0742D]/8">
            <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="font-mono text-xl font-bold tabular-nums text-[#E0742D]/25">03</span>
                <span className="rounded-full bg-[#E0742D]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#E0742D]">
                  Optionnel
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E0742D]/15 bg-[#E0742D]/[0.04]">
                  <Compass className="h-5 w-5 text-[#2A2F3A]" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#2A2F3A]">Accompagnement stratégique</h3>
                  <p className="mt-1 text-sm font-semibold text-[#5C5F66]">Sur devis</p>
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              <p className="text-[13px] leading-relaxed text-[#5C5F66]">
                Diagnostic, planification ou pilotage complet — au-delà de la mise en place technique, en forfait ou en
                abonnement selon l&apos;ampleur souhaitée.
              </p>
              <div className="mt-4 flex-1">
                <DetailList items={ACCOMPANIMENT_INCLUDES} />
              </div>
              <button
                type="button"
                onClick={openAccompanimentView}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E0742D]/35 bg-[#E0742D]/[0.06] px-4 py-2.5 text-sm font-semibold text-[#2A2F3A] transition hover:bg-[#E0742D]/10"
              >
                Choisir votre accompagnateur
                <ArrowRight className="h-4 w-4 text-[#E0742D]" strokeWidth={2} />
              </button>
            </div>
          </article>
        </div>
        ) : (
        <div
          id="accompagnement-partenaires"
          className={`scroll-mt-28 space-y-5 transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]/90">
                Volet 03 — Optionnel
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                Accompagnement stratégique
              </h3>
              <p className="mt-1 text-sm text-[#5C5F66]">Sur devis — avec Modelisys ou vos professionnels de confiance</p>
            </div>
            <button
              type="button"
              onClick={closeAccompanimentView}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-[#2A2F3A] shadow-sm transition hover:bg-slate-50 sm:self-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux volets
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Choisissez votre accompagnateur
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5C5F66]">
                Deux façons de réaliser l&apos;accompagnement stratégique — avec notre équipe ou vos professionnels de
                confiance, en s&apos;appuyant sur Modelisys.
              </p>
            </div>

            <div className="border-b border-slate-100 px-5 py-6 sm:px-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-3">
                {ACCOMPANIMENT_PATHS.map(({ step, title, duration, durationNote, durationSubnote }) => (
                  <div key={step} className="flex min-w-0 flex-col">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2F3A] text-sm font-bold text-white shadow-md ring-4 ring-white/80">
                        {step}
                      </span>
                      <span className="text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">{title}</span>
                    </div>
                    <div className="mt-4 min-w-0">
                      <div className="rounded-t-xl border-l-2 border-r-2 border-t-2 border-[#E0742D]/45 bg-gradient-to-b from-[#E0742D]/[0.07] to-transparent px-3 pb-3 pt-3 text-center shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.6)]">
                        <p className="text-xs font-semibold tracking-tight text-[#2A2F3A] sm:text-sm">{duration}</p>
                        <p className="mx-auto mt-1.5 max-w-sm text-[10px] leading-snug text-[#5C5F66] sm:text-[11px]">
                          {durationNote}
                          {durationSubnote ? (
                            <>
                              <br />
                              {durationSubnote}
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]/90">
                Équipe Modelisys
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">
                Trois formules d&apos;accompagnement
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5C5F66]">
                Le Diagnostic et la Planification sont des forfaits — des actes ponctuels. Le Pilotage est un abonnement,
                avec un suivi récurrent adapté à votre rythme.
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3 sm:px-6 sm:py-6">
              {MODELISYS_ACCOMPANIMENT_OFFERS.map(
                ({ icon: Icon, title, phases, billing, description, highlights }) => (
                  <article
                    key={title}
                    className={cn(
                      "flex h-full flex-col rounded-xl border bg-slate-50/40 px-5 py-5",
                      billing === "abonnement"
                        ? "border-[#E0742D]/25 ring-1 ring-[#E0742D]/10"
                        : "border-slate-200/90",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white">
                        <Icon className="h-5 w-5 text-[#2A2F3A]" strokeWidth={1.5} />
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                          billing === "forfait"
                            ? "bg-slate-200/70 text-[#2A2F3A]"
                            : "bg-[#E0742D]/10 text-[#E0742D]",
                        )}
                      >
                        {billing === "forfait" ? "Forfait" : "Abonnement"}
                      </span>
                    </div>
                    <h4 className="mt-4 text-base font-semibold text-[#2A2F3A]">{title}</h4>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E0742D]/85">
                      {phases}
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-[#5C5F66]">{description}</p>
                    <div className="mt-4 flex-1">
                      <DetailList items={highlights} />
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>

          <section className="border-t border-slate-200/90 pt-10 sm:pt-12">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="min-w-0 max-w-2xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Contact</p>
                  <span
                    className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-slate-300/50 to-transparent"
                    aria-hidden
                  />
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl md:text-[1.75rem] md:leading-tight">
                  Parlons de votre accompagnement
                </h2>
                <p className="mt-3 text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
                  Un plan adapté à votre trajectoire — échangeons sur vos objectifs et la voie qui vous convient.
                </p>
              </div>
              <Link
                href="/#demo"
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#2A2F3A] bg-[#2A2F3A] px-6 py-3 text-sm font-semibold text-[#E6D6C3] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] transition hover:bg-[#353b48] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50 lg:self-center"
              >
                Nous contacter
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
            </div>
          </section>
        </div>
        )}

        {/* Calculateur — bloc unique sous les volets */}
        {!showAccompanimentView ? (
        <div
          id="pricing-calculator"
          className={`mt-8 scroll-mt-28 transition-all duration-1000 delay-150 sm:mt-10 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            {!showCalculator ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0 max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                    <Calculator className="h-3.5 w-3.5 text-[#E0742D]" strokeWidth={1.75} aria-hidden />
                    Volets 01 & 02
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#5C5F66]">
                    Estimez la configuration et l&apos;abonnement selon vos revenus, entités et complexité. Fourchette indicative —
                    validée par notre équipe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCalculator}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#E0742D] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#E0742D]/20 transition hover:bg-[#c96526]"
                >
                  <Calculator className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Ouvrir le calculateur
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50">
                      <Calculator className="h-4 w-4 text-[#2A2F3A]" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2A2F3A]">Calculateur</p>
                      <p className="text-xs text-[#5C5F66]">Mise à jour des volets 01 et 02</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(false)}
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200/90 px-3 py-2 text-sm font-medium text-[#2A2F3A] transition hover:bg-slate-50 sm:self-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Fermer
                  </button>
                </div>

                <div className="border-b border-slate-100 px-5 py-6 sm:px-6">
                  <PricingQuickEstimatePanel
                    revenueM={revenueM}
                    onRevenueMChange={setRevenueM}
                    entityBand={entityBand}
                    onEntityBandChange={setEntityBand}
                    complexityLevel={complexityLevel}
                    onComplexityLevelChange={setComplexityLevel}
                  />
                </div>

                <div className="bg-slate-50/60 px-5 py-6 sm:px-6">
                  <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                    <CalendarClock className="h-3.5 w-3.5 text-[#E0742D]" strokeWidth={2} />
                    Envoyer
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[#2A2F3A]">Envoyer mon estimation</h3>
                  <p className="mt-1 text-sm text-[#5C5F66]">
                    Notre équipe vous recontacte pour affiner votre besoin.
                  </p>

                  {estimateSent ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E0742D]/25 bg-[#E0742D]/10">
                        <CheckCircle2 className="h-6 w-6 text-[#E0742D]" strokeWidth={2} />
                      </div>
                      <p className="font-semibold text-[#2A2F3A]">Estimation bien reçue</p>
                      <p className="mt-1 text-sm text-[#5C5F66]">Nous vous recontactons très bientôt.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendEstimate} className="mt-6 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="estimate-name" className="text-sm text-[#2A2F3A]">
                            Nom complet <span className="text-[#E0742D]">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="estimate-name"
                              name="name"
                              type="text"
                              autoComplete="name"
                              required
                              value={estimateName}
                              onChange={(e) => setEstimateName(e.target.value)}
                              placeholder="Jean Dupont"
                              className={cn("h-11 pl-9", estimateFieldClass)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="estimate-email" className="text-sm text-[#2A2F3A]">
                            Courriel <span className="text-[#E0742D]">*</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="estimate-email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              required
                              value={estimateEmail}
                              onChange={(e) => setEstimateEmail(e.target.value)}
                              placeholder="vous@entreprise.com"
                              className={cn("h-11 pl-9", estimateFieldClass)}
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={estimateSubmitting}
                        className={cn(
                          "h-11 w-full bg-[#E0742D] font-semibold text-white shadow-md shadow-[#E0742D]/20 hover:bg-[#c96526]",
                          estimateSubmitting && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {estimateSubmitting ? (
                          "Envoi en cours…"
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" strokeWidth={2} />
                            Envoyer mon estimation
                          </>
                        )}
                      </Button>

                      <p className="text-center text-xs text-[#5C5F66]/90">
                        L&apos;accompagnement stratégique n&apos;est pas inclus dans cette estimation.
                      </p>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        ) : null}
      </div>
    </section>
  )
}
