"use client"

import { NetTangibleReportSection } from "@/components/net-tangible/report-section"

/** Méthode — étape BAIIA ajusté (normalisation, sans multiple). */
export function AdjustedEbitdaMethodSection() {
  return (
    <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Le BAIIA ajusté vise à déterminer un niveau de résultat d&apos;exploitation normalisé,
        représentatif de la capacité bénéficiaire de l&apos;entreprise à la date de référence. Il
        sert ensuite de base à la capitalisation par multiples.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        La démarche consiste à&nbsp;:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">01</span>
          <span>
            Analyser le BAIIA des derniers exercices et y apporter les ajustements nécessaires
            (éléments non récurrents, normalisations).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">02</span>
          <span>
            Pondérer les exercices jugés représentatifs pour obtenir un BAIIA normalisé.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">03</span>
          <span>
            Définir une fourchette de BAIIA retenu (basse / haute) autour de cette référence.
          </span>
        </li>
      </ul>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-slate-500">
        La relation retenue est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        BAIIA représentatif = BAIIA ± ajustements, pondéré
      </p>
    </NetTangibleReportSection>
  )
}
