"use client"

import {
  TrendingUp,
  Building2,
  FileBarChart,
  Calculator,
  FileText,
  Users,
  Calendar,
  Zap,
} from "lucide-react"
import Image from "next/image"

const features = [
  { icon: FileBarChart, title: "Consolidation", description: "Multi-entités en temps réel" },
  { icon: TrendingUp, title: "Analyse", description: "Fonds de roulement & Capex" },
  { icon: Calculator, title: "Prévisions", description: "Budgets & projections" },
  { icon: FileText, title: "Rentabilité", description: "Par produit, client, projet" },
  { icon: Building2, title: "Valorisation", description: "Valeur d'entreprise & diagnostic" },
  { icon: Calendar, title: "Documentation", description: "Comptable structurée" },
  { icon: Users, title: "Collaboration", description: "Portail sécurisé" },
  { icon: Zap, title: "Temps réel", description: "Synchronisation automatique" },
]

type HeroOrbitalVisualProps = {
  isVisible: boolean
  logoSrc?: string
}

export function HeroOrbitalVisual({
  isVisible,
  logoSrc = "/images/modelisys-logo-white.svg",
}: HeroOrbitalVisualProps) {
  return (
    <div
      className={`transition-all duration-1000 delay-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
    >
      <div className="relative w-full aspect-square max-w-[800px] mx-auto">
        {features.map((feature, index) => {
          const angle = (index * 360) / features.length
          const radius = 280
          const radian = (angle * Math.PI) / 180
          const centerRadius = 112
          const cardCenterX = Math.cos(radian) * radius
          const cardCenterY = Math.sin(radian) * radius
          const startX = Math.cos(radian) * centerRadius
          const startY = Math.sin(radian) * centerRadius
          const endX = cardCenterX
          const endY = cardCenterY
          const lineLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
          const lineAngle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI)

          return (
            <div
              key={`line-${index}`}
              className="absolute top-1/2 left-1/2 z-0 pointer-events-none"
              style={{
                transform: `translate(${startX}px, ${startY}px) rotate(${lineAngle}deg)`,
                transformOrigin: "left center",
                width: `${lineLength}px`,
                height: "2px",
                background:
                  "repeating-linear-gradient(to right, rgba(148, 163, 184, 0.3) 0px, rgba(148, 163, 184, 0.3) 3px, transparent 3px, transparent 6px)",
              }}
            />
          )
        })}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150"></div>
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full border-4 border-slate-800 shadow-2xl flex items-center justify-center group hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
              <div className="relative z-10 flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 translate-y-1">
                <Image
                  src={logoSrc}
                  alt="Modelisys"
                  width={176}
                  height={176}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {features.map((feature, index) => {
          const Icon = feature.icon
          const angle = (index * 360) / features.length
          const radius = 280
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
              <div className="relative w-32 sm:w-36 bg-slate-800/80 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-4 shadow-xl hover:shadow-2xl hover:scale-110 hover:border-slate-600/50 transition-all duration-500">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center group-hover:bg-slate-700/70 transition-colors">
                    <Icon className="w-6 h-6 text-slate-300" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white text-center mb-1.5">{feature.title}</h4>
                <p className="text-xs text-slate-400 text-center leading-tight">{feature.description}</p>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          )
        })}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border border-slate-700/30 opacity-50 z-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] rounded-full border border-slate-700/20 opacity-30 z-0"></div>
      </div>
    </div>
  )
}
