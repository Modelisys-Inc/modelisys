"use client"

import { useEffect, useRef, useState } from "react"
import { Clock, User, CheckCircle2, Sparkles, Mail, Building2, Send, CalendarClock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const FORMSPREE_DEMO = "https://formspree.io/f/xzdapzyv"

export function DemoBookingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(FORMSPREE_DEMO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          _subject: "Demande de démonstration — Modelisys",
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => {
          setIsSubmitted(false)
          setFormData({
            name: "",
            email: "",
            company: "",
            phone: "",
            message: "",
          })
        }, 4000)
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const cardShell = "rounded-2xl border border-slate-200/90 bg-white/80 shadow-sm"
  const cardAccent = "pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#E0742D]/[0.10]"
  const fieldClass =
    "h-12 border-slate-200 bg-white/80 focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="scroll-mt-24 relative z-10 overflow-hidden bg-slate-100/50 py-24 sm:py-32"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
        <div className="absolute left-1/2 top-1/2 h-[min(72vh,520px)] w-[min(92vw,880px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Démarrer</p>
          <h2 className="mb-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
                Réservez votre démonstration
              </h2>
          <p className="max-w-3xl text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
            Découvrez comment Modelisys peut transformer la gestion financière de votre entreprise lors d&apos;une
            démonstration personnalisée.
              </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-14">
          <div className="lg:col-span-1">
            <div
              className={`transition-all delay-200 duration-1000 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
              }`}
            >
              <div className={cn("relative", cardShell, "h-full p-6 sm:p-7")}>
                <div className={cardAccent} aria-hidden />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                      <Sparkles className="h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                      Comment ça fonctionne
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    {[
                      {
                        n: "1",
                        title: "Envoyez votre demande",
                        body: "Indiquez vos coordonnées et, si vous le souhaitez, un court message dans le formulaire.",
                      },
                      {
                        n: "2",
                        title: "Réponse rapide",
                        body: "Notre équipe vous recontacte dans les plus brefs délais pour convenir d’un créneau.",
                      },
                      {
                        n: "3",
                        title: "Démonstration sur mesure",
                        body: "Découvrez la plateforme en action lors d’une session adaptée à votre contexte.",
                      },
                    ].map((step) => (
                      <div key={step.n} className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-sm font-bold text-[#2A2F3A]">
                          {step.n}
                    </div>
                    <div>
                          <h4 className="mb-1 text-base font-semibold text-[#2A2F3A]">{step.title}</h4>
                          <p className="text-sm leading-relaxed text-[#5C5F66]">{step.body}</p>
                    </div>
                  </div>
                    ))}
                  </div>

                  <div className="mt-8 space-y-4 border-t border-slate-200/90 pt-6">
                    {[
                      {
                        icon: Clock,
                        title: "30 minutes",
                        sub: "Démonstration complète",
                      },
                      {
                        icon: User,
                        title: "Expert dédié",
                        sub: "Accompagnement personnalisé",
                      },
                      {
                        icon: CheckCircle2,
                        title: "Sans engagement",
                        sub: "Découvrez sans pression",
                      },
                    ].map(({ icon: Icon, title, sub }) => (
                      <div key={title} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-[#2A2F3A]">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div>
                          <h5 className="text-sm font-semibold text-[#2A2F3A]">{title}</h5>
                          <p className="text-xs text-[#5C5F66]">{sub}</p>
                    </div>
                  </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              className={`transition-all delay-400 duration-1000 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <div className={cn("relative", cardShell, "p-8 lg:p-10")}>
                <div className={cardAccent} aria-hidden />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                      <CalendarClock className="h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                      Demande
                    </div>
                  </div>
                  <h2 className="mt-4 mb-2 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                    Demande de démonstration
                  </h2>
                  <p className="mb-8 leading-relaxed text-[#5C5F66]">
                    Laissez-nous vos informations : notre équipe vous contactera dans les plus brefs délais pour planifier
                    votre démonstration.
                  </p>

                  {isSubmitted ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E0742D]/25 bg-[#E0742D]/10">
                        <CheckCircle2 className="h-8 w-8 text-[#E0742D]" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold text-[#2A2F3A]">Demande bien reçue</h3>
                      <p className="max-w-md text-[#5C5F66]">
                        Merci ! Nous vous recontactons très bientôt pour convenir d’un créneau qui vous convient.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="demo-name" className="text-[#2A2F3A]">
                            Nom complet <span className="text-[#E0742D]">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="demo-name"
                              name="name"
                              type="text"
                              required
                              autoComplete="name"
                              value={formData.name}
                              onChange={handleChange}
                              className={cn("pl-10", fieldClass)}
                              placeholder="Jean Dupont"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="demo-email" className="text-[#2A2F3A]">
                            Courriel <span className="text-[#E0742D]">*</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="demo-email"
                              name="email"
                              type="email"
                              required
                              autoComplete="email"
                              value={formData.email}
                              onChange={handleChange}
                              className={cn("pl-10", fieldClass)}
                              placeholder="vous@entreprise.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="demo-company" className="text-[#2A2F3A]">
                            Entreprise
                          </Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="demo-company"
                              name="company"
                              type="text"
                              autoComplete="organization"
                              value={formData.company}
                              onChange={handleChange}
                              className={cn("pl-10", fieldClass)}
                              placeholder="Nom de l’organisation"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="demo-phone" className="text-[#2A2F3A]">
                            Téléphone
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="demo-phone"
                              name="phone"
                              type="tel"
                              autoComplete="tel"
                              value={formData.phone}
                              onChange={handleChange}
                              className={cn("pl-10", fieldClass)}
                              placeholder="+1 (450) 822-2436"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="demo-message" className="text-[#2A2F3A]">
                          Message <span className="text-slate-400">(facultatif)</span>
                        </Label>
                        <Textarea
                          id="demo-message"
                          name="message"
                          rows={6}
                          value={formData.message}
                          onChange={handleChange}
                          className={cn("resize-none", fieldClass)}
                          placeholder="Contexte, besoins ou disponibilités…"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(
                          "h-12 w-full bg-[#E0742D] text-base font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition-all duration-200 hover:bg-[#c96526]",
                          isSubmitting && "cursor-not-allowed opacity-50",
                        )}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="mr-2 animate-spin">⏳</span>
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Envoyer ma demande
                          </>
                        )}
                      </Button>

                      <p className="text-center text-xs text-[#5C5F66]/90">
                        En envoyant ce formulaire, vous acceptez que nous utilisions ces informations pour vous
                        recontacter au sujet d’une démonstration.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
