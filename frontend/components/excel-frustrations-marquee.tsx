"use client"

import { AlertTriangle, Clock } from "lucide-react"

/** Ligne 1 — irritants typiques Excel */
const excelItems = [
  "#REF ?!",
  "Référence circulaire",
  "#DIV/0!",
  "#N/A",
  "Valeur manquante",
  "#NAME?",
  "Nom de plage introuvable",
  "Liens entre feuilles cassés",
  "Fichier trop lourd · tout ralentit",
  "Copier-coller qui casse les formats",
  "Fusion de cellules · tri impossible",
  "Versions qui ne se synchronisent pas",
  "Macros qui plantent au moindre changement",
]

/** Ligne 2 — autres frictions du quotidien en pilotage / finance */
const dailyItems = [
  "Chiffres en attente de validation",
  "Réunion sans décision claire",
  "Dernière version du fichier ?",
  "Échanges par e-mail qui se perdent",
  "PDF déjà obsolète à l’envoi",
  "Reporting demandé à la dernière minute",
  "Données éclatées entre plusieurs outils",
  "Priorités qui changent sans trace",
  "Clôture qui repousse encore",
  "Personne ne lit le même indicateur",
  "Consolidation refaite à la main",
  "Tableau de bord jamais tout à fait à jour",
  "Réunion de suivi sans ordre du jour",
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

export function ExcelFrustrationsMarquee() {
  return (
    <section
      className="relative isolate z-0 overflow-hidden border-y border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-100/90 to-slate-50"
      aria-label="Frictions liées à Excel et au quotidien du pilotage"
    >
      <div className="relative py-6 sm:py-8">
        <div className="excel-marquee-mask">
          <div className="grid grid-rows-2 gap-4 sm:gap-6">
            <div className="min-h-0 overflow-hidden py-0.5">
              <div className="excel-marquee-track flex w-max flex-nowrap items-center gap-4 sm:gap-5">
                <TrackCells list={excelItems} />
              </div>
            </div>
            <div className="min-h-0 overflow-hidden py-0.5">
              <div className="excel-marquee-track flex w-max flex-nowrap items-center gap-4 sm:gap-5">
                <TrackCells list={dailyItems} />
              </div>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden bg-gradient-to-r from-slate-50 via-slate-50 to-transparent md:block md:w-[min(13rem,44vw)]"
          aria-hidden
        />

        <div className="pointer-events-none absolute left-6 top-6 bottom-6 z-30 hidden grid grid-rows-2 items-center gap-0 sm:left-10 md:grid">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#E0742D]" aria-hidden />
            <span className="text-sm font-semibold tracking-wide text-[#5C5F66]">Excel</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 shrink-0 text-[#E0742D]" aria-hidden />
            <span className="text-sm font-semibold tracking-wide text-[#5C5F66]">Quotidien</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .excel-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }

        .excel-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: excelMarqueeScroll 38s linear infinite;
        }

        @keyframes excelMarqueeScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .excel-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
