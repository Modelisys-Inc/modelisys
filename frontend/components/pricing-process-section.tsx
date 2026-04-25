"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import {
  Settings,
  DollarSign,
  CheckCircle2,
  Sparkles,
  Calculator,
  ArrowLeft,
  Send,
  CalendarClock,
  User,
  Mail,
  AlertCircle,
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

/** Aligné sur la carte formulaire « Démarrer » (`demo-booking-section`). */
const estimateFormCardShell =
  "relative"
const estimateFormCardAccent = "hidden"
const estimateFieldClass =
  "h-12 border-slate-200 bg-white/80 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"

export function PricingProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
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
          message:
            "Le client souhaite être recontacté suite à son estimation en ligne (paramètres ci-dessus). Engagement : prise de contact sous 24 h.",
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

  return (
    <section
      ref={sectionRef}
      id="pricing-process"
      className="scroll-mt-24 relative z-10 border-t border-slate-200/90 bg-gradient-to-b from-white via-slate-50/95 to-slate-100/50 py-20 sm:py-28 overflow-hidden"
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
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Tarification</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
            Comment fonctionne{" "}
            <span className="text-[#5C5F66]">notre tarification</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
            Un outil de pilotage financier utile seulement s&apos;il est correctement implanté. Nous calons nos prix sur
            votre contexte — structure, périmètre et usages — pour une proposition claire et défendable.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-14">
          <div
            className={`space-y-6 lg:pr-10 transition-all duration-1000 delay-100 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            {!showCalculator ? (
              <>
                <div className="pt-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                    <Settings className="h-4 w-4 text-[#E0742D]" strokeWidth={1.75} aria-hidden />
                    Approche
                  </div>
                  <h3 className="mb-4 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">Une approche personnalisée</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#5C5F66]">
                    Chaque entreprise est unique. La configuration de vos données comptables et des fonctionnalités
                    utiles dépend de votre{" "}
                    <strong className="font-semibold text-[#2A2F3A]">structure organisationnelle</strong>, de vos{" "}
                    <strong className="font-semibold text-[#2A2F3A]">besoins spécifiques</strong> et du{" "}
                    <strong className="font-semibold text-[#2A2F3A]">niveau de complexité</strong> à couvrir.
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-200/90">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                    <Calculator className="h-4 w-4 text-[#E0742D]" strokeWidth={1.75} aria-hidden />
                    Estimation
                  </div>
                  <h3 className="mb-4 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">Estimation rapide</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#5C5F66]">
                    Par transparence, nous mettons à votre disposition le{" "}
                    <strong className="font-semibold text-[#2A2F3A]">calculateur</strong> : en quelques secondes, il donne
                    une fourchette indicative à partir de vos revenus consolidés et du nombre d&apos;entités, et intègre{" "}
                    <strong className="font-semibold text-[#2A2F3A]">toutes les fonctionnalités</strong>.
                  </p>
                  <p className="mb-4 text-base leading-relaxed text-[#5C5F66]">
                    Cette estimation doit toutefois être{" "}
                    <strong className="font-semibold text-[#2A2F3A]">validée par notre équipe</strong> : elle donne une
                    fourchette utile et transparente, mais le chiffrage définitif et l&apos;offre associée se calent après
                    échange — pour aligner l&apos;implantation sur ce qui doit réellement être livré, sans extrapoler sur
                    des hypothèses trop globales.
                  </p>
                  <p className="mb-6 text-sm leading-relaxed text-[#5C5F66]">
                    Pour une démo ou un devis détaillé, vous pouvez aussi{" "}
                    <a href="#demo" className="font-medium text-[#E0742D] underline-offset-2 hover:underline">
                      planifier un échange
                    </a>{" "}
                    avec l&apos;équipe.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E0742D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition hover:bg-[#c96526]"
                  >
                    <Calculator className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    Calculateur
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-1">
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/90 pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white">
                      <Calculator className="h-5 w-5 text-[#2A2F3A]" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#2A2F3A] sm:text-2xl">Calculateur</h3>
                      <p className="mt-0.5 text-sm text-[#5C5F66]">Paramètres</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(false)}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-[#2A2F3A] shadow-sm transition hover:bg-slate-50 sm:self-auto"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    Retour
                  </button>
                </div>
                <PricingQuickEstimatePanel
                  revenueM={revenueM}
                  onRevenueMChange={setRevenueM}
                  entityBand={entityBand}
                  onEntityBandChange={setEntityBand}
                  complexityLevel={complexityLevel}
                  onComplexityLevelChange={setComplexityLevel}
                />
              </div>
            )}
          </div>

          <div
            className={`relative lg:pl-10 lg:before:content-[''] lg:before:absolute lg:before:left-0 lg:before:top-0 lg:before:bottom-0 lg:before:w-px lg:before:bg-gradient-to-b lg:before:from-transparent lg:before:via-[#E0742D]/45 lg:before:to-transparent transition-all duration-1000 delay-200 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="pt-1">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                <Sparkles className="h-4 w-4 text-[#E0742D]" />
                Structure en deux volets
              </div>

              <h3 className="mb-8 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">
                Implantation <span className="text-[#5C5F66]">et abonnement</span>
              </h3>

              <div className="space-y-5">
                <div className="pt-6 border-t border-slate-200/90">
                  <div className="mb-4 flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-sm">
                      <Settings className="h-6 w-6 text-[#2A2F3A]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h4 className="text-lg font-semibold text-[#2A2F3A]">Frais d&apos;implantation</h4>
                        {showCalculator ? (
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#E0742D]">
                            {isContactBand
                              ? "Nous contacter"
                              : `${formatCad(integrationMinDisplay)} $ – ${formatCad(integrationMaxDisplay)} $`}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-[#5C5F66]">
                        Montant ponctuel pour la mise en place initiale : paramétrage, intégration des données et
                        préparation au bon usage par vos équipes.
                      </p>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-1.5">
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setImplementationOption("full")}
                          className={cn(
                            "rounded-lg px-3 py-2.5 text-left transition",
                            implementationOption === "full"
                              ? "bg-[#E0742D]/12 ring-1 ring-[#E0742D]/40"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <p className="text-sm font-semibold text-[#2A2F3A]">Option 1 - Clé en main</p>
                          <p className="mt-0.5 text-xs text-[#5C5F66]">Forfait clé en main (recommandé)</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImplementationOption("partial")}
                          className={cn(
                            "rounded-lg px-3 py-2.5 text-left transition",
                            implementationOption === "partial"
                              ? "bg-[#E0742D]/12 ring-1 ring-[#E0742D]/40"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <p className="text-sm font-semibold text-[#2A2F3A]">Option 2 - Autonome</p>
                          <p className="mt-0.5 text-xs text-[#5C5F66]">Client autonome, support ponctuel</p>
                        </button>
                      </div>
                    </div>
                    {implementationOption === "partial" && (
                      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <p className="text-xs leading-relaxed text-amber-800">
                            Cette option s’adresse aux équipes expérimentées en finance et comptabilité. Vous
                            construisez et configurez votre environnement financier en vous appuyant sur notre cadre
                            structuré, afin d’exploiter pleinement les capacités de la plateforme.
                        </p>
                      </div>
                    )}
                    <ul className="space-y-2.5">
                      {(
                        implementationOption === "full"
                          ? [
                              "Structuration complète de vos données et de votre périmètre financier",
                              "Configuration de chacune des fonctionnalitées et contrôle qualité",
                              "Mise en place des règles, modules et logiques adaptées à votre réalité",
                              "Prise en charge des éléments complexes (mapping, consolidation, intercos)",
                              "Formation des équipes et transfert d’une méthodologie claire et durable",
                            ]
                          : [
                              "Accès à un cadre structuré pour configurer votre modèle financier",
                              "Configuration réalisée par vos équipes, selon vos besoins et votre rythme",
                              "Formation initiale pour maîtriser la logique de structuration et de paramétrage",
                              "Support ciblé pour valider les étapes clés et sécuriser vos décisions",
                              "Accompagnement ponctuel en cas de blocage ou de situation complexe",
                            ]
                      ).map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-sm text-[#5C5F66]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200/90">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-sm">
                      <DollarSign className="h-6 w-6 text-[#2A2F3A]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h4 className="text-lg font-semibold text-[#2A2F3A]">Abonnement</h4>
                        {showCalculator ? (
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#E0742D]">
                            {isContactBand
                              ? "Nous contacter"
                              : `${formatCad(estimate.monthlyMin)} $ – ${formatCad(estimate.monthlyMax)} $ / mois`}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-[#5C5F66]">
                        Accès récurrent à la plateforme, mises à jour, évolutions produit et accompagnement dans la durée
                        selon le niveau de service convenu.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200/90 pt-6">
                {showCalculator ? (
                  <div className={cn(estimateFormCardShell, "pt-6")}>
                    <div className={estimateFormCardAccent} aria-hidden />
                    <div className="relative">
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                          <CalendarClock className="h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                          Envoyer
                        </div>
                      </div>
                      <h3 className="mb-2 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                        Envoyer mon estimation
                      </h3>
                      <p className="mb-8 leading-relaxed text-[#5C5F66]">
                        Transmettez-nous cette fourchette calculée selon vos paramètres : notre équipe vous contactera
                        dans les plus brefs délais pour affiner votre besoin.
                      </p>

                      {estimateSent ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center sm:py-12">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E0742D]/25 bg-[#E0742D]/10">
                            <CheckCircle2 className="h-8 w-8 text-[#E0742D]" strokeWidth={2} />
                          </div>
                          <h4 className="mb-2 text-xl font-semibold text-[#2A2F3A]">Estimation bien reçue</h4>
                          <p className="max-w-md text-[#5C5F66]">
                            Merci ! Nous vous recontactons très bientôt pour convenir d’un échange.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleSendEstimate} className="space-y-6">
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="estimate-name" className="text-[#2A2F3A]">
                                Nom complet <span className="text-[#E0742D]">*</span>
                              </Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input
                                  id="estimate-name"
                                  name="name"
                                  type="text"
                                  autoComplete="name"
                                  required
                                  value={estimateName}
                                  onChange={(e) => setEstimateName(e.target.value)}
                                  placeholder="Jean Dupont"
                                  className={cn("pl-10", estimateFieldClass)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="estimate-email" className="text-[#2A2F3A]">
                                Courriel <span className="text-[#E0742D]">*</span>
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input
                                  id="estimate-email"
                                  name="email"
                                  type="email"
                                  autoComplete="email"
                                  required
                                  value={estimateEmail}
                                  onChange={(e) => setEstimateEmail(e.target.value)}
                                  placeholder="vous@entreprise.com"
                                  className={cn("pl-10", estimateFieldClass)}
                                />
                              </div>
                            </div>
                          </div>

                          <Button
                            type="submit"
                            disabled={estimateSubmitting}
                            className={cn(
                              "h-12 w-full bg-[#E0742D] text-base font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition-all duration-200 hover:bg-[#c96526]",
                              estimateSubmitting && "cursor-not-allowed opacity-50",
                            )}
                          >
                            {estimateSubmitting ? (
                              <>
                                <span className="mr-2 animate-spin">⏳</span>
                                Envoi en cours…
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-5 w-5" strokeWidth={2} />
                                Envoyer mon estimation
                              </>
                            )}
                          </Button>

                          <p className="text-center text-xs text-[#5C5F66]/90">
                            En envoyant ce formulaire, vous acceptez que nous utilisions ces informations pour vous
                            recontacter au sujet de votre estimation.
                          </p>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm leading-relaxed text-[#5C5F66] sm:text-left">
                    Les montants dépendent de votre structure et de vos usages. Ouvrez le calculateur pour obtenir une
                    fourchette et l&apos;envoyer à notre équipe.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
