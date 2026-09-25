"use client"

import { Clock } from "lucide-react"

const dailyItems = [
  "Quelle est la valeur de votre entreprise ?",
  "Comment maximisez-vous la valeur de votre entreprise ?",
  "Quelles divisions performent le mieux ?",
  "Quels sont vos risques opérationnels majeurs ?",
  "Quel impact vos décisions ont-elles sur votre multiple ?",
  "Où sont vos leviers pour créer et protéger de la valeur ?",
]

function TrackCells({ list }: { list: string[] }) {
  return (
    <>
      {list.map((text, i) => (
        <span
          key={`a-${i}-${text}`}
          className="inline-flex shrink-0 items-center rounded-xl border border-slate-200/95 bg-white px-4 py-3.5 text-xs font-semibold tracking-wide text-[#2A2F3A] shadow-sm sm:px-5 sm:py-4 sm:text-sm"
        >
          {text}
        </span>
      ))}
      {list.map((text, i) => (
        <span
          key={`b-${i}-${text}`}
          className="inline-flex shrink-0 items-center rounded-xl border border-slate-200/95 bg-white px-4 py-3.5 text-xs font-semibold tracking-wide text-[#2A2F3A] shadow-sm sm:px-5 sm:py-4 sm:text-sm"
          aria-hidden
        >
          {text}
        </span>
      ))}
    </>
  )
}

export function LandingQuotidienMarquee() {
  return (
    <section
      className="relative isolate z-0 overflow-hidden border-y border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-50"
      aria-label="Questions quotidiennes sur la valeur d’entreprise"
    >
      <div className="relative py-6 sm:py-8">
        <div className="quotidien-marquee-mask">
          <div className="min-h-0 overflow-hidden py-0.5">
            <div className="quotidien-marquee-track flex w-max flex-nowrap items-center gap-4 sm:gap-5">
              <TrackCells list={dailyItems} />
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden bg-gradient-to-r from-slate-50 via-slate-50 to-transparent md:block md:w-[min(13rem,44vw)]"
          aria-hidden
        />

        <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2.5 md:flex sm:left-10">
          <Clock className="h-5 w-5 shrink-0 text-[#E0742D]" aria-hidden />
          <span className="text-sm font-semibold tracking-wide text-[#5C5F66]">Quotidien</span>
        </div>
      </div>

      <style jsx>{`
        .quotidien-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 6%,
            black 94%,
            transparent 100%
          );
        }

        .quotidien-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: quotidienMarqueeScroll 38s linear infinite;
        }

        @keyframes quotidienMarqueeScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .quotidien-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
