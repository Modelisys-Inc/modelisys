"use client"

import { MapPin } from "lucide-react"

const MARQUEE_MESSAGE =
  "Notre vision : une plateforme commune et une méthode structurée pour piloter la trajectoire de valeur — ancrer le point de départ, fixer une ambition chiffrée, suivre les écarts et recalibrer au fil du temps, aux côtés des dirigeants et de leurs conseillers."

/** Peu de répétitions : chaque entrée est une phrase longue. */
const MARQUEE_ITEMS = Array.from({ length: 3 }, (_, i) => ({ id: i, text: MARQUEE_MESSAGE }))

export function AboutHeroMarquee() {
  return (
    <section className="relative isolate z-0 overflow-hidden bg-[#141823]">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <div className="relative">
        <div className="about-marquee-mask">
          <div className="about-marquee-track">
            <div
              className="about-marquee-row"
              aria-label="Vision Modelisys — piloter la trajectoire de valeur avec une plateforme commune et une méthode structurée"
            >
              {MARQUEE_ITEMS.map(({ id, text }) => (
                <div key={id} className="about-marquee-item">
                  <span className="about-marquee-dot" />
                  <span className="about-marquee-text">{text}</span>
                </div>
              ))}
            </div>

            <div className="about-marquee-row" aria-hidden="true">
              {MARQUEE_ITEMS.map(({ id, text }) => (
                <div key={`dup-${id}`} className="about-marquee-item">
                  <span className="about-marquee-dot" />
                  <span className="about-marquee-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden bg-[#141823] md:block md:w-[min(12rem,42vw)]"
          aria-hidden
        />

        <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2.5 text-[#E6D6C3]/80 sm:left-10 md:flex">
          <MapPin className="h-5 w-5 text-[#E6B08C]" aria-hidden />
          <span className="text-sm font-semibold tracking-wide">Québec</span>
        </div>
      </div>

      <style jsx>{`
        .about-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }

        .about-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: aboutMarqueeLeft 80s linear infinite;
        }

        .about-marquee-row {
          display: flex;
          align-items: center;
          gap: 48px;
          padding: 20px 40px;
        }

        .about-marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
        }

        .about-marquee-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(230, 176, 140, 0.9);
          box-shadow: 0 0 0 4px rgba(230, 176, 140, 0.12);
        }

        .about-marquee-text {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 1.35;
          color: rgba(230, 214, 195, 0.9);
        }

        @keyframes aboutMarqueeLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .about-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
