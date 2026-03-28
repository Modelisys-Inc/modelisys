"use client"

import { useEffect, useRef, useState } from "react"
import { Settings, DollarSign, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"

export function PricingProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

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
            <div className="rounded-xl border-2 border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
              <h3 className="mb-4 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">Une approche personnalisée</h3>
              <p className="mb-4 text-base leading-relaxed text-[#5C5F66]">
                Chaque entreprise est unique. La configuration de vos données comptables et des fonctionnalités utiles
                dépend de votre{" "}
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
                      Données comptables, périmètre, axes d&apos;analyse et fonctionnalités activées selon votre réalité
                      opérationnelle.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-slate-200/90 bg-white p-6 shadow-lg sm:p-8">
              <h3 className="mb-4 text-xl font-semibold text-[#2A2F3A] sm:text-2xl">
                Passer à l&apos;étape suivante
              </h3>
              <p className="mb-6 text-base leading-relaxed text-[#5C5F66]">
                Échangez avec notre équipe pour voir comment Modelisys peut s&apos;aligner sur votre organisation et
                obtenir une estimation personnalisée.
              </p>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-lg bg-[#E0742D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition hover:bg-[#c96526]"
              >
                Planifier une démonstration
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
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
                      <h4 className="mb-2 text-lg font-semibold text-[#2A2F3A]">Frais d&apos;implantation</h4>
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
                      <h4 className="mb-2 text-lg font-semibold text-[#2A2F3A]">Abonnement</h4>
                      <p className="text-sm leading-relaxed text-[#5C5F66]">
                        Accès récurrent à la plateforme, mises à jour, évolutions produit et accompagnement dans la durée
                        selon le niveau de service convenu.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-8 border-t border-slate-200/90 pt-6 text-center text-sm leading-relaxed text-[#5C5F66]">
                Les montants dépendent de votre structure et de vos usages. Contactez-nous pour une proposition sur
                mesure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
