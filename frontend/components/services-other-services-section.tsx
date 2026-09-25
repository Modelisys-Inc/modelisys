"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import {
  SERVICES_PAGE_PILLARS,
  getServicePagePath,
  type ServicesPagePillarId,
} from "@/lib/services-page-content"
import { cn } from "@/lib/utils"

type ServicesOtherServicesSectionProps = {
  currentId: ServicesPagePillarId
}

export function ServicesOtherServicesSection({ currentId }: ServicesOtherServicesSectionProps) {
  const others = SERVICES_PAGE_PILLARS.filter((p) => p.id !== currentId)

  return (
    <section
      aria-label="Autres services"
      className="border-t border-[#2A2F3A]/10 pt-14 sm:pt-16 lg:pt-20"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
        Autres services
      </p>

      <div className="mt-8 grid lg:mt-10 lg:grid-cols-3">
        {others.map((other, index) => (
          <Link
            key={other.id}
            href={getServicePagePath(other.id)}
            className={cn(
              "group flex flex-col border-[#2A2F3A]/10 py-7 transition",
              "hover:border-[#E0742D]/35",
              index === 0 ? "border-t-0 pt-0 lg:pt-0" : "border-t",
              "lg:border-t-0 lg:border-l lg:px-8 lg:py-0",
              index === 0 && "lg:border-l-0 lg:pl-0",
              index === others.length - 1 && "lg:pr-0",
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
              <span className="font-mono tabular-nums">{other.number}</span>
              <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
                —
              </span>
              {other.label}
            </p>
            <p className="mt-4 text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.2rem]">
              {other.tagline}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[#2A2F3A] transition group-hover:text-[#9A4A1A]">
              Découvrir
              <ArrowRight className="h-3.5 w-3.5 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#2A2F3A]/10 pt-8 sm:mt-14">
        <Link
          href="/#demo"
          className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A]"
        >
          PRENDRE RENDEZ-VOUS
          <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
        </Link>
        <span className="hidden h-px w-10 bg-[#2A2F3A]/15 sm:block" aria-hidden />
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-slate-500 transition hover:text-[#2A2F3A]"
        >
          TOUS LES SERVICES
          <span className="inline-block h-px w-8 bg-[#E0742D]/80" />
        </Link>
      </div>
    </section>
  )
}
