"use client"

import { useEffect, useRef, useState } from "react"
import { Zap, Target, Quote } from "lucide-react"

export function PostFeaturesSection() {
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
    <section ref={sectionRef} className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background with depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white"></div>
      
      {/* Decorative elements for depth */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient orbs for depth */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Main card with 3D effect */}
          <div className="relative">
            {/* Shadow layers for depth */}
            <div className="absolute inset-0 bg-slate-200/50 rounded-2xl blur-xl transform translate-y-4"></div>
            <div className="absolute inset-0 bg-slate-300/30 rounded-2xl blur-lg transform translate-y-2"></div>
            
            {/* Main card */}
            <div className="relative bg-white rounded-2xl border-2 border-slate-200 shadow-2xl overflow-hidden">
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-white pointer-events-none"></div>
              
              {/* Content */}
              <div className="relative px-8 sm:px-12 lg:px-16 py-12 sm:py-16">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  {/* Left side - Text */}
                  <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-4">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">Pilotage stratégique</span>
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                      Transformez vos données en{" "}
                      <span className="text-slate-600">décisions stratégiques</span>
                    </h3>
                    
                    <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                      Avec Modelisys, passez de la simple comptabilité à une analyse financière approfondie qui vous donne les clés pour piloter votre entreprise avec confiance.
                    </p>
                  </div>

                  {/* Right side - Visual element */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      {/* Glowing circle behind */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-emerald-400/20 rounded-full blur-2xl transform scale-150"></div>
                      
                      {/* Icon container with 3D effect */}
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                        <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-white relative z-10" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote section with elegant design */}
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                    {/* Quote icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <Quote className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Quote content */}
                    <div className="flex-1 space-y-3">
                      <blockquote className="text-lg sm:text-xl text-slate-600 leading-relaxed italic">
                        "Modelisys transforme l'analyse financière en un véritable levier d'efficacité, en mettant en lumière les dynamiques qui façonnent la valeur d'une entreprise."
                      </blockquote>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <p className="text-base font-semibold text-slate-900">Tristan Bellerose, CPA, CBV</p>
                        <span className="hidden sm:inline text-slate-400">•</span>
                        <p className="text-sm text-slate-600">Président et Fondateur</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

