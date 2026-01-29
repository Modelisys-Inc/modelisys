"use client"

import { useEffect, useRef, useState } from "react"
import { Settings, Users, DollarSign, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"

export function PricingProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  return (
    <section ref={sectionRef} id="pricing-process" className="py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Header */}
        <div
          className={`mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Comment fonctionne{" "}
              <span className="text-slate-600">notre tarification</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Notre objectif est de mettre à votre disposition un outil financier puissant pour vous aider à piloter votre entreprise avec confiance. Pour bien utiliser cet outil, une implantation financière par notre équipe est nécessaire.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column - Explanation */}
          <div
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <div className="bg-white rounded-xl border-2 border-slate-200 p-8 shadow-lg">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    Une approche personnalisée
                  </h3>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Chaque entreprise est unique. La configuration de vos données comptables et des fonctionnalités nécessaires dépend de votre <strong className="text-slate-900">structure organisationnelle</strong> et de vos <strong className="text-slate-900">besoins spécifiques</strong>.
                  </p>
                  <p className="text-base text-slate-600 leading-relaxed">
                    C'est pourquoi notre tarification est adaptée à votre contexte. Nous analysons votre situation pour vous proposer une solution sur mesure qui répond exactement à vos défis financiers.
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Settings className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">
                        Configuration sur mesure
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Nous configurons vos données comptables et les fonctionnalités selon votre structure organisationnelle et vos besoins spécifiques.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="mt-6">
              <div className="bg-white rounded-xl border-2 border-slate-200 p-8 shadow-lg">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">
                      Prêt à transformer votre gestion financière ?
                    </h3>
                    <p className="text-base text-slate-600 leading-relaxed mb-6">
                      Discutez avec notre équipe pour comprendre comment Modelisys peut s'adapter à votre entreprise et obtenir une estimation personnalisée.
                    </p>
                    <div>
                      <a
                        href="#demo"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg hover:scale-105"
                      >
                        Planifier une démonstration
                        <ArrowRight className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Two-Part Pricing */}
          <div
            className={`transition-all duration-1000 delay-400 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl p-8 text-white relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-700/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-700/20 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 mb-6">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-semibold">Structure de tarification</span>
                </div>

                <h3 className="text-2xl font-bold mb-8">
                  Tarification en{" "}
                  <span className="text-slate-300">2 volets</span>
                </h3>

                <div className="space-y-6">
                  {/* Part 1 - Implementation */}
                  <div className="bg-slate-700/40 rounded-xl p-6 border border-slate-600/50 backdrop-blur-sm">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold mb-2">Frais d'implantation</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                          Un montant unique pour la configuration initiale de votre plateforme.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-300">Configuration des données comptables</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-300">Configuration des fonctionnalités selon vos besoins</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-slate-300">Formation des utilisateurs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part 2 - Subscription */}
                  <div className="bg-slate-700/40 rounded-xl p-6 border border-slate-600/50 backdrop-blur-sm">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold mb-2">Frais d'abonnement</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          Un abonnement mensuel récurrent pour l'accès à la plateforme et à toutes ses fonctionnalités configurées.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-600/50">
                  <p className="text-sm text-slate-400 leading-relaxed text-center">
                    Les montants varient selon votre structure organisationnelle et vos besoins spécifiques. Contactez-nous pour obtenir une estimation personnalisée.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

