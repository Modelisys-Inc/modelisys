"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CabinetsPartnerContactTransitionSection() {
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
    <section
      id="cabinet-partner-contact-cta"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 overflow-hidden bg-slate-100/50 py-16 sm:py-24"
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
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Contact</p>
            <h2 className="mb-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
              Contactez-nous pour démarrer le processus de partenariat et l&apos;implantation du premier client
            </h2>
            <p className="max-w-3xl text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
              Un premier échange nous permet d&apos;aligner la vision avec votre cabinet, de planifier le déploiement et
              d&apos;accompagner concrètement la mise en route — jusqu&apos;à l&apos;intégration réussie de votre premier
              client sur Modelisys.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
          </div>

          <div className="relative mt-10 max-w-2xl">
            <Button
              asChild
              className="h-12 w-full bg-[#E0742D] px-8 text-base font-semibold text-white shadow-lg shadow-[#E0742D]/20 transition-all duration-200 hover:bg-[#c96526] sm:w-auto sm:min-w-[14rem]"
            >
              <Link href="/contact">
                <ArrowRight className="mr-2 h-4 w-4" />
                Nous contacter pour lancer le processus
              </Link>
            </Button>
            <p className="mt-6 text-xs text-[#5C5F66]/90">
              Nous vous répondons rapidement pour planifier un échange adapté à votre cabinet.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
