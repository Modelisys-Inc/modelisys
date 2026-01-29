"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, TrendingUp, Sparkles, BarChart3 } from "lucide-react"

export function AboutSection() {
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
    <section id="about" ref={sectionRef} className="py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Header - Centered */}
        <div
          className={`mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Notre mission</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Aider les PME à mieux{" "}
              <span className="text-slate-600">comprendre leurs chiffres</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Modelisys transforme les données financières en une vision claire, structurée et exploitable de la performance et de la valeur de l'entreprise.
            </p>
          </div>
        </div>

        {/* Mission Details - 3 Cards Grid */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          {/* Clarté financière */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-8 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 group">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Eye className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Clarté financière
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Nous aidons les PME à obtenir une lecture claire et fiable de leur situation financière.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Grâce à une vue consolidée et en temps réel, les dirigeants comprennent enfin ce qui se passe réellement à l'échelle de l'entreprise, des sociétés, des divisions et des activités.
            </p>
          </div>

          {/* Compréhension et optimisation de la valeur */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-8 hover:border-blue-200 hover:shadow-xl transition-all duration-300 group">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Compréhension et optimisation de la valeur
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Modelisys permet aux PME de comprendre comment leur valeur se crée, évolue et peut être améliorée.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              En reliant performance opérationnelle, décisions financières et valorisation, la plateforme aide à identifier les leviers concrets qui influencent la valeur de l'entreprise, aujourd'hui et à long terme.
            </p>
          </div>

          {/* Décisions éclairées */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-8 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 group md:col-span-2 lg:col-span-1">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Décisions éclairées
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Prenez des décisions stratégiques basées sur des données fiables et une analyse approfondie.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Notre plateforme vous fournit les outils et les insights nécessaires pour anticiper les tendances, identifier les opportunités et minimiser les risques dans votre gestion financière.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
