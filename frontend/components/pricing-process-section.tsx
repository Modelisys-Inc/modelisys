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
} from "@/lib/pricing-estimate"

const FORMSPREE_PRICING = "https://formspree.io/f/xzdapzyv"

/** Aligné sur la carte formulaire « Démarrer » (`demo-booking-section`). */
const estimateFormCardShell =
  "relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70"
const estimateFormCardAccent = "pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]"
const estimateFieldClass =
  "h-12 border-slate-200 bg-white/80 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"

export function PricingProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [revenueM, setRevenueM] = useState(10)
  const [companies, setCompanies] = useState(1)
  const [estimateEmail, setEstimateEmail] = useState("")
  const [estimateName, setEstimateName] = useState("")
  const [estimateSubmitting, setEstimateSubmitting] = useState(false)
  const [estimateSent, setEstimateSent] = useState(false)

  const estimate = useMemo(
    () =>
      computePricingEstimate({
        revenueM,
        companies,
        selectedModuleIds: buildQuickCalculatorModuleIds(),
        includeConsolidationModule: true,
      }),
    [revenueM, companies],
  )

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
          societes_divisions: companies,
          frais_implantation_fourchette$: `${formatCad(estimate.integrationMin)} – ${formatCad(estimate.integrationMax)}`,
          abonnement_fourchette_mensuelle$: `${formatCad(estimate.monthlyMin)} – ${formatCad(estimate.monthlyMax)}`,
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

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div
            className={`space-y-6 transition-all duration-1000 delay-100 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            {!showCalculator ? (
              <>
                <div className="rounded-xl border-2 border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
                  <h3 className="mb-4 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">Une approche personnalisée</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#5C5F66]">
                    Chaque entreprise est unique. La configuration de vos données comptables et des fonctionnalités
                    utiles dépend de votre{" "}
                    <strong className="font-semibold text-[#2A2F3A]">structure organisationnelle</strong> et de vos{" "}
                    <strong className="font-semibold text-[#2A2F3A]">besoins spécifiques</strong>.
                  </p>
                  <p className="text-base leading-relaxed text-[#5C5F66]">
                    Nous analysons votre situation avant de proposer une enveloppe cohérente avec vos enjeux de
                    consolidation, reporting et pilotage.
                  </p>

                  <div className="mt-8 border-t border-slate-200/90 pt-6">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50">
                        <Settings className="h-5 w-5 text-[#2A2F3A]" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h4 className="mb-2 text-lg font-semibold text-[#2A2F3A]">Configuration sur mesure</h4>
                        <p className="text-sm leading-relaxed text-[#5C5F66]">
                          Données comptables, périmètre, axes d&apos;analyse et fonctionnalités activées selon votre
                          réalité opérationnelle.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
                  <h3 className="mb-4 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">Estimation rapide</h3>
                  <p className="mb-4 text-base leading-relaxed text-[#5C5F66]">
                    Utilisez le <strong className="font-semibold text-[#2A2F3A]">calculateur</strong> pour une fourchette
                    de prix en quelques secondes à partir de vos revenus consolidés et du nombre d&apos;entités. L&apos;
                    estimation intègre l&apos;ensemble des leviers utiles à la{" "}
                    <strong className="font-semibold text-[#2A2F3A]">valorisation</strong>, dont les prévisions et
                    l&apos;évaluation.
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
              <div className="rounded-xl border-2 border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/90 pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50">
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
                  companies={companies}
                  onCompaniesChange={setCompanies}
                />
              </div>
            )}
          </div>

          <div
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="rounded-xl border-2 border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/90 px-4 py-2">
                <Sparkles className="h-4 w-4 text-[#E0742D]" />
                <span className="text-sm font-semibold text-[#2A2F3A]">Structure en deux volets</span>
              </div>

              <h3 className="mb-8 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">
                Implantation <span className="text-[#5C5F66]">et abonnement</span>
              </h3>

              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-5 sm:p-6">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-sm">
                      <Settings className="h-6 w-6 text-[#2A2F3A]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h4 className="text-lg font-semibold text-[#2A2F3A]">Frais d&apos;implantation</h4>
                        {showCalculator ? (
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#E0742D]">
                            {formatCad(estimate.integrationMin)}&nbsp;$ – {formatCad(estimate.integrationMax)}&nbsp;$
                          </span>
                        ) : null}
                      </div>
                      <p className="mb-4 text-sm leading-relaxed text-[#5C5F66]">
                        Montant ponctuel pour la mise en place initiale : paramétrage, intégration des données et
                        préparation au bon usage par vos équipes.
                      </p>
                      <ul className="space-y-2.5">
                        {[
                          "Paramétrage des données et périmètres comptables",
                          "Activation des modules et règles adaptés à vos besoins",
                          "Formation des utilisateurs et transfert de méthode",
                        ].map((line) => (
                          <li key={line} className="flex items-start gap-2.5 text-sm text-[#5C5F66]">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-5 sm:p-6">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white shadow-sm">
                      <DollarSign className="h-6 w-6 text-[#2A2F3A]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h4 className="text-lg font-semibold text-[#2A2F3A]">Abonnement</h4>
                        {showCalculator ? (
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[#E0742D]">
                            {formatCad(estimate.monthlyMin)}&nbsp;$ – {formatCad(estimate.monthlyMax)}&nbsp;$ / mois
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
                  <div className={cn(estimateFormCardShell, "p-6 sm:p-8")}>
                    <div className={estimateFormCardAccent} aria-hidden />
                    <div className="relative">
                      <div className="mb-2 flex items-center gap-2 text-[#5C5F66]">
                        <CalendarClock className="h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                        <span className="text-sm font-semibold tracking-wide">Démarrer</span>
                      </div>
                      <h3 className="mb-2 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                        Envoyer mon estimation
                      </h3>
                      <p className="mb-8 leading-relaxed text-[#5C5F66]">
                        Transmettez-nous cette fourchette calculée selon vos paramètres : notre équipe vous contactera
                        dans un délai de <span className="font-semibold text-[#2A2F3A]">24&nbsp;heures</span> (jours
                        ouvrables) pour affiner votre besoin.
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
