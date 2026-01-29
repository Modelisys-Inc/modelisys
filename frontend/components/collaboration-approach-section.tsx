"use client"

import { useEffect, useRef, useState } from "react"
import { Zap, CheckCircle2, Users, FileText, Briefcase, Building2 } from "lucide-react"

export function CollaborationApproachSection() {
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
    <section ref={sectionRef} className="py-24 sm:py-32 px-4 relative z-10 bg-slate-50">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Transition Section - Linking Challenges to Collaboration */}
        <div
          className={`mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 p-8 sm:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: '80px 80px'
              }}></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800/50 border border-slate-700/50 text-white text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                <span>Notre approche</span>
              </div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
                Au-delà des défis financiers,{" "}
                <span className="text-slate-300">renforcer la collaboration</span>
              </h3>
              <p className="text-lg sm:text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed mb-8">
                Modelisys ne se contente pas de résoudre les défis financiers des PME. Notre plateforme renforce également la collaboration entre les PME et leurs partenaires financiers, créant un écosystème où l'expertise de chacun contribue à votre succès opérationnel et stratégique.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium">Résolution des défis financiers</span>
                </div>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600"></div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium">Collaboration renforcée</span>
                </div>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-600"></div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium">Soutien continu</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collaboration Section - Full Section */}
        <div
          className={`transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 lg:p-16 shadow-lg">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 text-white text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                <span>Collaboration professionnelle</span>
              </div>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                Une meilleure collaboration pour{" "}
                <span className="text-slate-700">un meilleur soutien</span>
              </h3>
              <p className="text-lg sm:text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
                Par l'entremise de portails sécurisés dédiés, vos partenaires financiers bénéficient d'un accès continu à vos données financières consolidées et peuvent vous fournir leur expertise professionnelle directement au sein de votre plateforme. Cette intégration facilite la collaboration stratégique et optimise l'efficacité de vos processus opérationnels et décisionnels.
              </p>
            </div>

            {/* Partner Types - Benefits for PME */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-lg bg-slate-800 w-fit mx-auto mb-4">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h5 className="text-lg font-bold text-slate-900 mb-3">Cabinets comptables</h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Votre cabinet comptable dispose d'un accès continu à votre plateforme via un portail sécurisé, lui permettant d'examiner vos états financiers consolidés et vos analyses en tout temps, et non uniquement lors de la clôture annuelle. Vous pouvez documenter vos observations directement dans la plateforme pour justifier les écarts budgétaires, expliquer les fluctuations mensuelles et contextualiser les transactions significatives. Cette visibilité permanente permet à votre cabinet d'effectuer un suivi proactif de votre situation financière et de vous fournir des recommandations stratégiques en temps réel, améliorant ainsi l'efficacité de vos processus comptables et la qualité de vos décisions opérationnelles.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-lg bg-slate-800 w-fit mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h5 className="text-lg font-bold text-slate-900 mb-3">CPA et Consultants financiers</h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Vos CPA et consultants financiers effectuent une analyse continue de votre modèle d'affaires et procèdent à la valorisation actualisée de votre entreprise en temps réel. Ils vous fournissent des recommandations stratégiques pour optimiser votre gestion du fonds de roulement et de la trésorerie, identifiant rapidement les leviers d'amélioration de votre performance financière. Cette collaboration structurée renforce vos processus décisionnels, maximise la création de valeur et vous offre un accompagnement personnalisé adapté à vos enjeux opérationnels et stratégiques.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-lg bg-slate-800 w-fit mx-auto mb-4">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h5 className="text-lg font-bold text-slate-900 mb-3">Institutions financières</h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Votre institution financière accède à vos analyses financières consolidées via un portail sécurisé, lui permettant d'évaluer en continu votre situation financière, votre capacité de remboursement et votre profil de risque. Cette transparence opérationnelle facilite l'évaluation de votre solvabilité et permet à votre institution de vous proposer des solutions de financement personnalisées et adaptées à votre réalité. Cette approche proactive optimise vos processus de financement en accélérant les décisions d'octroi et en favorisant la négociation de conditions tarifaires et contractuelles avantageuses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

