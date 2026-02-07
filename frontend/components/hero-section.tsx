"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, DollarSign, Activity, Building2, Sparkles, FileBarChart, Calculator, FileText, Users, Calendar, Zap, CheckCircle2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"

const ArrowRightIcon = () => (
  <svg
    className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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

  const features = [
    {
      icon: FileBarChart,
      title: "Consolidation",
      description: "Multi-entités en temps réel",
      color: "emerald"
    },
    {
      icon: TrendingUp,
      title: "Analyse",
      description: "Fonds de roulement & Capex",
      color: "blue"
    },
    {
      icon: Calculator,
      title: "Prévisions",
      description: "Budgets & projections",
      color: "indigo"
    },
    {
      icon: FileText,
      title: "Rentabilité",
      description: "Par produit, client, projet",
      color: "purple"
    },
    {
      icon: Building2,
      title: "Valorisation",
      description: "Valeur d'entreprise & diagnostic",
      color: "emerald"
    },
    {
      icon: Calendar,
      title: "Documentation",
      description: "Comptable structurée",
      color: "blue"
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Portail sécurisé",
      color: "indigo"
    },
    {
      icon: Zap,
      title: "Temps réel",
      description: "Synchronisation automatique",
      color: "purple"
    },
  ]

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32 min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-600/10 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Content */}
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="space-y-6 mb-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">Bientôt disponible</span>
              </div>

            {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                La clarté financière{" "}
                <span className="text-slate-300">absolue</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mb-12">
                Écosystème financier complet conçu pour les <span className="text-white font-semibold">PME</span>, Modelisys regroupe consolidation, analyse de rentabilité, valorisation d'entreprise, prévisions budgétaires et documentation comptable structurée dans une plateforme unifiée et en temps réel.
              </p>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Votre performance financière. <span className="text-white font-medium">Instantanément.</span>{" "}
                <span className="text-white font-medium">Consolidée.</span>{" "}
                <span className="text-white font-medium">Analysée.</span>{" "}
                <span className="text-white font-medium">Projetée.</span>{" "}
                <span className="text-white font-medium">Améliorée.</span>
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <Button
                size="lg"
                className="bg-emerald-500 text-white rounded-lg px-8 py-6 text-base font-semibold hover:bg-emerald-600 border border-emerald-500 transition-colors duration-200 group"
                onClick={() => {
                  const demoSection = document.getElementById('demo')
                  if (demoSection) {
                    demoSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                Accéder en priorité au lancement
                <ArrowRightIcon />
              </Button>
            </div>
          </div>

          {/* Right Column - Circular Features Layout */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <div className="relative w-full aspect-square max-w-[800px] mx-auto">
              {/* Connection Lines - Behind everything */}
              {features.map((feature, index) => {
                const angle = (index * 360) / features.length
                const radius = 280 // Distance from center to card center (same as cards)
                const radian = (angle * Math.PI) / 180
                
                // Center circle radius
                // w-48 = 192px (96px radius), w-56 = 224px (112px radius)
                // Using 112px for desktop (sm:w-56)
                const centerRadius = 112
                
                // Card center position (same calculation as cards)
                const cardCenterX = Math.cos(radian) * radius
                const cardCenterY = Math.sin(radian) * radius
                
                // Start point: edge of center circle
                const startX = Math.cos(radian) * centerRadius
                const startY = Math.sin(radian) * centerRadius
                
                // End point: center of card
                const endX = cardCenterX
                const endY = cardCenterY
                
                // Calculate line length and angle
                const lineLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
                const lineAngle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI)
                
                      return (
                  <div
                    key={`line-${index}`}
                    className="absolute top-1/2 left-1/2 z-0 pointer-events-none"
                    style={{
                      transform: `translate(${startX}px, ${startY}px) rotate(${lineAngle}deg)`,
                      transformOrigin: 'left center',
                      width: `${lineLength}px`,
                      height: '2px',
                      background: 'repeating-linear-gradient(to right, rgba(148, 163, 184, 0.3) 0px, rgba(148, 163, 184, 0.3) 3px, transparent 3px, transparent 6px)',
                    }}
                  />
                )
              })}

              {/* Center - Modelisys */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150"></div>
                  
                  {/* Center circle */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center group hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                    <div className="relative z-10 flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 translate-y-1">
                      <Image
                        src="/images/modelisys-logo-white.svg"
                        alt="Modelisys"
                        width={176}
                        height={176}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                      </div>
                    </div>

              {/* Orbital Features */}
              {features.map((feature, index) => {
                const Icon = feature.icon
                const angle = (index * 360) / features.length
                const radius = 280 // Distance from center
                const radian = (angle * Math.PI) / 180
                const x = Math.cos(radian) * radius
                const y = Math.sin(radian) * radius
                
                return (
                  <div
                    key={index}
                    className="absolute top-1/2 left-1/2 z-10 group"
                    style={{
                      transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
                    }}
                  >
                    {/* Feature card */}
                    <div
                      className="relative w-32 sm:w-36 bg-slate-800/80 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl hover:scale-110 hover:border-slate-600/50 transition-all duration-500"
                    >
                      {/* Icon */}
                      <div className="flex items-center justify-center mb-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center group-hover:bg-slate-700/70 transition-colors">
                          <Icon className="w-6 h-6 text-slate-300" />
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h4 className="text-sm font-bold text-white text-center mb-1.5">{feature.title}</h4>
                      
                      {/* Description */}
                      <p className="text-xs text-slate-400 text-center leading-tight">{feature.description}</p>
                      
                      {/* Hover glow */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>
                )
              })}

              {/* Outer ring decoration */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border border-slate-700/30 opacity-50 z-0"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] rounded-full border border-slate-700/20 opacity-30 z-0"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 border border-slate-600 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-slate-500 rounded-full"></div>
        </div>
      </div>
    </section>
  )
}
