"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react"

export function IntroTransitionSection() {
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
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">Solutions adaptées</span>
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                      Des outils conçus pour{" "}
                      <span className="text-slate-600">répondre à vos défis</span>
                    </h3>
                    
                    <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                      Chaque fonctionnalité a été pensée pour résoudre concrètement les enjeux que vous rencontrez quotidiennement dans la gestion financière de votre PME.
                    </p>
                  </div>

                  {/* Right side - Visual element */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      {/* Glowing circle behind */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-2xl transform scale-150"></div>
                      
                      {/* Icon container with 3D effect */}
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                        <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16 text-white relative z-10" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ArrowRight className="w-4 h-4" />
                    <span>Explorez nos fonctionnalités ci-dessous</span>
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

