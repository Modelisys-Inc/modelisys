"use client"

import { TrendingUp } from "lucide-react"
import { NARRATIVE_BASELINE, NARRATIVE_PROJECTION, NARRATIVE_TARGET } from "@/lib/hero-narrative-metrics"

const items = [
  `Diagnostic — Revenus ${NARRATIVE_BASELINE.revenus} · BAIIA ${NARRATIVE_BASELINE.baiia} · valeur ${NARRATIVE_BASELINE.valeur}`,
  "Diagnostic — Concentration client 45 % · liquidité 1,1",
  `Planification — Vision ${NARRATIVE_TARGET.valeur} · revenus ${NARRATIVE_BASELINE.revenus} → ${NARRATIVE_TARGET.revenus}`,
  `Planification — Besoin de financement : ${NARRATIVE_PROJECTION.an2.capex} à l'acquisition`,
  "Pilotage — Réel vs passé vs prévu · notes d'explication des écarts",
  "Pilotage — Scénario recalibré sans repartir de zéro",
  `Pilotage — Trajectoire maintenue vers ${NARRATIVE_TARGET.valeur}`,
  "Pilotage — Écart capex documenté · impact sur trésorerie",
]

export function HeroMarquee() {
  return (
    <section className="relative isolate z-0 overflow-hidden bg-[#141823]">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <div className="relative">
        <div className="marquee-mask">
          <div className="marquee-track">
            <div className="marquee-row" aria-label="Insights de l'approche Modelisys — diagnostic à pilotage">
              {items.map((text) => (
                <div key={text} className="marquee-item">
                  <span className="marquee-dot" />
                  <span className="marquee-text">{text}</span>
                </div>
              ))}
            </div>

            <div className="marquee-row" aria-hidden="true">
              {items.map((text) => (
                <div key={`dup-${text}`} className="marquee-item">
                  <span className="marquee-dot" />
                  <span className="marquee-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Au-dessus du défilement : même fond que la bande pour ne pas voir le texte sous « Insights » */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden bg-[#141823] md:block md:w-[min(12rem,42vw)]"
          aria-hidden
        />

        <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2.5 text-[#E6D6C3]/80 sm:left-10 md:flex">
          <TrendingUp className="h-5 w-5 text-[#E6B08C]" />
          <span className="text-sm font-semibold tracking-wide">Insights</span>
        </div>
      </div>

      <style jsx>{`
        .marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }

        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: marqueeLeft 30s linear infinite;
        }

        .marquee-row {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 20px 32px;
        }

        .marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
        }

        .marquee-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(230, 176, 140, 0.9);
          box-shadow: 0 0 0 4px rgba(230, 176, 140, 0.12);
        }

        .marquee-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(230, 214, 195, 0.9);
        }

        @keyframes marqueeLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
