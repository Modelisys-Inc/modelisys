"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Handshake, Sparkles } from "lucide-react"
import Link from "next/link"

export function CabinetsPartnerContactTransitionSection() {
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
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      },
    )

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="cabinet-partner-contact-cta"
      ref={sectionRef}
      className="relative overflow-hidden py-16 sm:py-24"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-emerald-100/30 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-blue-100/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="relative">
            <div className="absolute inset-0 translate-y-4 transform rounded-2xl bg-slate-200/50 blur-xl" />
            <div className="absolute inset-0 translate-y-2 transform rounded-2xl bg-slate-300/30 blur-lg" />

            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-2xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-white" />

              <div className="relative px-8 py-12 sm:px-12 sm:py-16 lg:px-16">
                <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">
                  <div className="flex-1 space-y-4">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-700">Partenariat cabinet</span>
                    </div>

                    <h3 className="text-2xl leading-tight font-bold text-slate-900 sm:text-3xl md:text-4xl">
                      Contactez-nous pour{" "}
                      <span className="text-slate-600">
                        démarrer le processus de partenariat et l&apos;implantation du premier client
                      </span>
                    </h3>

                    <p className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                      Un premier échange nous permet d&apos;aligner la vision avec votre cabinet, de planifier le déploiement et d&apos;accompagner concrètement la mise en route — jusqu&apos;à l&apos;intégration réussie de votre premier client sur Modelisys.
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 scale-150 transform rounded-full bg-gradient-to-br from-emerald-400/20 to-blue-400/20 blur-2xl" />

                      <div className="relative flex h-24 w-24 transform items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl transition-transform duration-300 hover:scale-105 sm:h-32 sm:w-32">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                        <Handshake className="relative z-10 h-12 w-12 text-white sm:h-16 sm:w-16" strokeWidth={1.75} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-8">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>Nous contacter pour lancer le processus</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
