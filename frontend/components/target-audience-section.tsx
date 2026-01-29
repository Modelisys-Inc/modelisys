"use client"

import { useEffect, useRef, useState } from "react"
import { Building2, Briefcase, FileText, CheckCircle2, ArrowRight } from "lucide-react"

const targetAudiences = [
  {
    title: "Équipe financière",
    subtitle: "Pour les professionnels de la finance",
    description:
      "Collaborez sur une plateforme unique pour gagner du temps dans vos opérations. Automatisez et centralisez des données fiables pour la gestion de votre trésorerie et vos reportings. Accédez à des analyses approfondies en temps réel.",
    icon: Building2,
    color: "blue",
    features: [
      "Rapports consolidés en temps réel",
      "Analyse financière approfondie",
      "Prévisions et scénarios",
      "Tableaux de bord personnalisables",
    ],
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    borderColor: "border-blue-200",
    hoverBorder: "hover:border-blue-400",
  },
  {
    title: "Consultant",
    subtitle: "Pour les conseillers financiers",
    description:
      "Offrez des analyses financières professionnelles à vos clients. Générez des rapports détaillés, des évaluations d'entreprises et des recommandations stratégiques basées sur des données fiables et à jour.",
    icon: Briefcase,
    color: "emerald",
    features: [
      "Analyses multi-clients",
      "Évaluations d'entreprises",
      "Rapports personnalisés",
      "Recommandations stratégiques",
    ],
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-50 to-teal-50",
    borderColor: "border-emerald-200",
    hoverBorder: "hover:border-emerald-400",
  },
  {
    title: "Cabinets Comptables",
    subtitle: "Pour les cabinets d'expertise comptable",
    description:
      "Optimisez la gestion de vos clients avec une plateforme centralisée. Automatisez les consolidations, générez les états financiers et offrez des services d'analyse avancés à vos clients comptables.",
    icon: FileText,
    color: "purple",
    features: [
      "Gestion multi-clients",
      "Consolidation automatique",
      "États financiers standards",
      "Services d'analyse premium",
    ],
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50",
    borderColor: "border-purple-200",
    hoverBorder: "hover:border-purple-400",
  },
]

export function TargetAudienceSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

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
    <section ref={sectionRef} className="py-20 sm:py-32 px-4 relative z-10 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 sm:mb-24 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold mb-8">
            <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
            À qui s'adresse notre solution
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 text-balance mb-6 sm:mb-8 leading-tight">
            Une plateforme adaptée à{" "}
            <span className="bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">
              chaque profil
            </span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Que vous soyez une équipe financière, un consultant ou un cabinet comptable, notre solution s'adapte à vos besoins spécifiques.
          </p>
        </div>

        {/* Cards Grid */}
        <div
          className={`grid md:grid-cols-3 gap-6 sm:gap-8 transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          {targetAudiences.map((audience, index) => {
            const Icon = audience.icon
            const isHovered = hoveredCard === index

            return (
              <div
                key={index}
                className={`group relative bg-white border-2 ${audience.borderColor} rounded-3xl overflow-hidden transition-all duration-500 ${audience.hoverBorder} hover:shadow-2xl hover:-translate-y-2`}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Top accent bar */}
                <div className={`h-1.5 bg-gradient-to-r ${audience.gradient}`}></div>

                {/* Icon Header */}
                <div className={`relative bg-gradient-to-br ${audience.bgGradient} p-8 sm:p-10`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent rounded-bl-full"></div>
                  <div className="relative">
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${audience.gradient} flex items-center justify-center shadow-lg transition-transform duration-500 ${
                        isHovered ? "scale-110 rotate-3" : ""
                      }`}
                    >
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8">
                  <div className="mb-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                      {audience.title}
                    </h3>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {audience.subtitle}
                    </p>
                  </div>

                  <p className="text-slate-600 text-base leading-relaxed mb-6">
                    {audience.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    {audience.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-start gap-3 transition-all duration-300"
                        style={{
                          opacity: isHovered ? 1 : 0.8,
                          transform: isHovered ? "translateX(4px)" : "translateX(0)",
                        }}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${audience.gradient} flex items-center justify-center`}>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-slate-700 text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    className={`w-full group/btn flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r ${audience.gradient} text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02]`}
                  >
                    <span>En savoir plus</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </button>
                </div>

                {/* Hover effect overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${audience.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}
                ></div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div
          className={`mt-16 sm:mt-20 text-center transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-slate-600 text-lg mb-6">
            Vous ne savez pas quelle solution vous convient ?
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <span>Parler à un expert</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
