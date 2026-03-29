"use client"

import { useEffect, useRef, useState } from "react"
import { Clock, User, CheckCircle2, Sparkles } from "lucide-react"

export function DemoBookingSection() {
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
    <section ref={sectionRef} id="demo" className="py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="flex items-start justify-between gap-8 mb-6">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
                Réservez votre démonstration
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
                Découvrez comment Modelisys peut transformer la gestion financière de votre entreprise lors d&apos;une démonstration personnalisée.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Benefits */}
          <div className="lg:col-span-1">
            <div
              className={`transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
            >
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all duration-300 h-full">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Comment ça fonctionne</span>
                </div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Réservez votre créneau
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Choisissez une date et une heure qui vous conviennent dans le calendrier.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Rencontre personnalisée
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Découvrez la plateforme en action lors d&apos;une démonstration adaptée à vos besoins.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Accès prioritaire
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Inscrivez-vous sur la liste d&apos;attente et bénéficiez d&apos;un tarif préférentiel.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">30 minutes</h5>
                      <p className="text-xs text-slate-600">Démonstration complète</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">Expert dédié</h5>
                      <p className="text-xs text-slate-600">Accompagnement personnalisé</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900">Sans engagement</h5>
                      <p className="text-xs text-slate-600">Découvrez sans pression</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Google Calendar Embed */}
          <div className="lg:col-span-2">
            <div
              className={`transition-all duration-1000 delay-400 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden">
                <iframe
                  src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ3LsFLyLVprj4g3VIw0saKEFBf_9bzcCz0nbGdDG7-63FqO4eXNzY0Teas7Dg9BVGR-SWFTlc8h?gv=false"
                  className="w-full border-0"
                  style={{ height: '700px' }}
                  title="Réserver une démonstration"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
