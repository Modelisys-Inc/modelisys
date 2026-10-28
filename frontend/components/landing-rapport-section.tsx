import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { RapportArtifact } from "@/components/rapport-artifact"
import { RAPPORT_PATH } from "@/lib/rapport-gestion-content"

const POINTS = [
  "Sommaire exécutif : revenus, contribution, bénéfice net, BAIIA et valeur des actions.",
  "Performance par division, structure de coûts et seuil de rentabilité.",
  "Situation financière, trajectoire 2026-2028 et plan d’action.",
] as const

export function LandingRapportSection() {
  return (
    <section id="rapport-annuel" className="relative isolate z-10 scroll-mt-24 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[5.25rem] overflow-hidden bg-[#F8FAFC] sm:h-28 md:h-32"
      >
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-full w-full sm:hidden"
        >
          <path d="M0,50 C480,16 960,16 1440,50 L1440,120 L0,120 Z" fill="#222732" />
        </svg>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 hidden h-full w-full sm:block"
        >
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#222732"
          />
        </svg>
      </div>

      <div className="relative bg-[#222732]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-[#E0742D]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#E6D6C3]/[0.05] blur-3xl" />

        <div className="relative mx-auto grid max-w-[1920px] items-center gap-10 px-5 pb-6 pt-28 sm:px-10 sm:pb-8 sm:pt-36 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:px-12 lg:pb-4 lg:pt-40 xl:px-16 2xl:px-20">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-200">Diagnostic financier</p>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Un exemple de livrable remis à la direction et discuté avec elle
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
              Cinq exercices, deux divisions, le seuil de rentabilité, la trésorerie et la trajectoire.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
            <ul className="mt-8 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-[#E6D6C3]/90">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href={RAPPORT_PATH}
              className="group mt-10 inline-flex items-center gap-2 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8]"
            >
              VOIR LE DIAGNOSTIC
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="relative min-h-[24rem] lg:-mr-6 lg:min-h-[32rem] xl:-mr-12">
            <RapportArtifact />
          </div>
        </div>
      </div>

      <div aria-hidden className="relative z-10 h-16 overflow-hidden bg-[#222732] sm:h-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-8 left-1/3 h-56 w-56 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
        </div>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-full w-full"
        >
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>
    </section>
  )
}
