"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, CheckCircle2 } from "lucide-react"

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

    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setIsSubmitted(true)
    setEmail("")

    setTimeout(() => {
      setIsSubmitted(false)
    }, 3000)
  }

  return (
    <section
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden border-t border-slate-200/90 bg-gradient-to-b from-slate-100/80 via-slate-50/95 to-white py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 85% 15%, rgb(224 116 45 / 0.06) 0%, transparent 45%),
              radial-gradient(circle at 15% 85%, rgb(148 163 184 / 0.12) 0%, transparent 48%)`,
          }}
        />
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
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mx-auto mb-10 max-w-3xl text-center transition-all duration-1000 sm:mb-12 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Restez informé</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
            Inscrivez votre courriel pour{" "}
            <span className="text-[#5C5F66]">rester informé</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
            Soyez parmi les premiers informés des nouveautés, des opportunités et des développements de Modelisys.
          </p>
          <div className="mx-auto mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0" />
        </div>

        <div
          className={`mx-auto max-w-2xl border-t border-slate-200/90 pt-8 transition-all duration-1000 delay-100 sm:pt-10 lg:mx-0 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {isSubmitted ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[#E0742D]" />
              <p className="text-base font-medium text-[#2A2F3A]">Merci pour votre inscription !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch lg:max-w-none">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@courriel.com"
                  required
                  className="h-12 border-slate-200/90 bg-white pl-10 shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-[#E0742D]/25"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 shrink-0 bg-[#E0742D] px-8 font-semibold text-white hover:bg-[#c75a26] sm:w-auto sm:px-6"
              >
                {isSubmitting ? "Inscription…" : "S'inscrire"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
