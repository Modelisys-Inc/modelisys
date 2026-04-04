"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, CheckCircle2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

const FORMSPREE_URL = "https://formspree.io/f/xzdapzyv"

export function EmailSubscriptionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState("")
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
      const response = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          _subject: "Inscription infolettre — Modelisys",
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setEmail("")

        setTimeout(() => {
          setIsSubmitted(false)
        }, 4000)
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden bg-slate-100/50 py-16 sm:py-24"
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
        <div className="absolute left-1/2 top-1/2 h-[min(56vh,420px)] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Infolettre</p>
            <h2 className="mb-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
              Inscrivez votre courriel pour rester informé
            </h2>
            <p className="max-w-3xl text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
              Soyez parmi les premiers informés des nouveautés, des opportunités et des développements de Modelisys.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </div>

          <div className="relative mt-10 max-w-2xl">
            {isSubmitted ? (
              <div className="flex flex-col items-start gap-4 py-2 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#E0742D]/25 bg-[#E0742D]/10">
                  <CheckCircle2 className="h-7 w-7 text-[#E0742D]" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#2A2F3A]">Merci pour votre inscription</p>
                  <p className="mt-1 text-[#5C5F66]">Vous recevrez nos prochaines actualités à cette adresse.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newsletter-email" className="text-[#2A2F3A]">
                    Courriel <span className="text-[#E0742D]">*</span>
                  </Label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="relative min-w-0 flex-1">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="newsletter-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@entreprise.com"
                        required
                        autoComplete="email"
                        className="h-12 border-slate-200 bg-white/90 pl-10 shadow-sm focus-visible:border-[#E0742D]/80 focus-visible:ring-[#E0742D]/25"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "h-12 shrink-0 bg-[#E0742D] px-8 text-base font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition-all duration-200 hover:bg-[#c96526] sm:min-w-[11rem]",
                        isSubmitting && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="mr-2 animate-spin">⏳</span>
                          Inscription...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          S&apos;inscrire
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[#5C5F66]/90">
                  Une seule adresse, pas de spam : vous pourrez vous désinscrire à tout moment.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
