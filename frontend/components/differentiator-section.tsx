"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Zap, Layers, Rocket, Brain, Gauge } from "lucide-react"

const differentiators = [
  {
    icon: Zap,
    title: "Analyse en temps réel",
    description: "Conçue pour professionnels de la finance",
  },
  {
    icon: Layers,
    title: "Aligné aux meilleures pratiques",
    description: "Consultants et CPA",
  },
  {
    icon: Rocket,
    title: "Approche modulaire",
    description: "Basée sur 10 moteurs financiers interconnectés",
  },
  {
    icon: Gauge,
    title: "Automatisation complète",
    description: "Des états financiers",
  },
  {
    icon: Sparkles,
    title: "Interface radicalement moderne",
    description: "Et ultra rapide",
  },
  {
    icon: Brain,
    title: "Prévisions assistées par IA",
    description: "Basé sur vos données et les conditions du marché",
  },
]

export function DifferentiatorSection() {
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
    <section ref={sectionRef} className="py-24 sm:py-32 px-4 relative z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-300 text-sm font-bold mb-8 uppercase tracking-wide">
            <Sparkles className="w-5 h-5" />
            <span>Différenciateur</span>
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
            Pas un simple SaaS.
            <br />
            <span className="text-blue-400">
              Une surcouche d'intelligence
            </span>
            <br />
            <span className="text-white">pour votre entreprise.</span>
          </h2>
        </div>

        {/* Differentiators Grid */}
        <div
          className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-1000 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          {differentiators.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={index}
                className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-2"
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
                }}
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-3xl transition-all duration-500"></div>

                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

