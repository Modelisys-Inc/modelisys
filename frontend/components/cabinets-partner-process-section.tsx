"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  ClipboardCheck,
  GraduationCap,
  Handshake,
  MessageCircle,
  Rocket,
} from "lucide-react"

const steps: {
  step: number
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    step: 1,
    icon: MessageCircle,
    title: "Échange initial",
    description:
      "Nous comprenons votre cabinet : types de clients, volume de missions, outils actuels et attentes vis-à-vis de Modelisys. Un premier échange permet d'aligner la vision et les priorités.",
  },
  {
    step: 2,
    icon: ClipboardCheck,
    title: "Qualification du périmètre",
    description:
      "Nous précisons avec vous le périmètre : nombre de collaborateurs concernés, besoins d'intégration avec la comptabilité des clients et niveau d'accompagnement souhaité.",
  },
  {
    step: 3,
    icon: Handshake,
    title: "Démonstration et proposition",
    description:
      "Démo adaptée à votre contexte, proposition claire sur les fonctionnalités, les modalités et le plan de déploiement pour votre cabinet et vos équipes.",
  },
  {
    step: 4,
    icon: GraduationCap,
    title: "Mise en route et formation",
    description:
      "Paramétrage des accès, formation des utilisateurs et accompagnement sur les premiers dossiers pour que vous soyez autonomes rapidement, avec un support dédié.",
  },
  {
    step: 5,
    icon: Rocket,
    title: "Partenariat actif",
    description:
      "Suivi continu, évolutions produit et points réguliers pour faire grandir votre usage de Modelisys avec vos clients et renforcer votre offre de services.",
  },
]

export function CabinetsPartnerProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="cabinet-partner-process"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-slate-200/90 bg-gradient-to-b from-white via-slate-50/90 to-slate-100/40 py-20 sm:py-28 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(circle at 90% 10%, rgb(148 163 184 / 0.2) 0%, transparent 42%),
            radial-gradient(circle at 10% 90%, rgb(16 185 129 / 0.08) 0%, transparent 45%)`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Parcours</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Notre processus pour devenir{" "}
            <span className="bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent">
              partenaire
            </span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
            Un parcours structuré pour intégrer Modelisys dans votre cabinet : de la première discussion au premier client
            intégré, avec des étapes claires et un accompagnement à chaque phase.
          </p>
        </div>

        {/* Fil d’étapes — aperçu sur grand écran */}
        <div
          className={`mb-10 hidden transition-all duration-1000 delay-100 lg:mb-14 lg:grid lg:grid-cols-5 lg:gap-3 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-md ring-4 ring-slate-100">
                {item.step}
              </span>
              <span className="line-clamp-3 text-[11px] font-medium leading-snug text-slate-600 lg:text-xs">
                {item.title}
              </span>
            </div>
          ))}
        </div>

        <ol
          className={`mx-auto max-w-4xl space-y-0 border-t border-slate-200/90 transition-all duration-1000 delay-200 lg:max-w-none ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {steps.map((item, index) => {
            const Icon = item.icon
            const isLast = index === steps.length - 1
            return (
              <li
                key={item.step}
                className={`grid gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-8 sm:py-10 ${
                  isLast ? "border-b-0" : ""
                }`}
              >
                <div className="flex items-start gap-4 sm:flex-col sm:items-stretch sm:gap-3">
                  <span className="font-mono text-4xl font-bold leading-none tabular-nums text-emerald-600/25 sm:text-5xl">
                    {String(item.step).padStart(2, "0")}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm sm:h-14 sm:w-14">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-[17px]">{item.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
