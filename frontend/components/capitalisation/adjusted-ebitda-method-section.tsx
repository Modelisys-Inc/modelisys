"use client"

import { NetTangibleReportSection } from "@/components/net-tangible/report-section"

/** Méthode — étape Flux monétaires (BAIIA → fourchette → flux caractéristiques). */
export function AdjustedEbitdaMethodSection() {
  return (
    <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Cette étape détermine les{" "}
        <span className="font-medium text-[#2A2F3A]">flux monétaires caractéristiques</span>{" "}
        de l&apos;entreprise à la date de référence. On part du BAIIA historique, on le
        normalise et on le convertit en flux de trésorerie disponibles pour la capitalisation
        et les analyses de structure de capital.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        La démarche consiste à&nbsp;:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">01</span>
          <span>
            Analyser le BAIIA (et les revenus) sur les exercices pertinents, avec ajustements
            non récurrents ciblant les revenus ou le BAIIA.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">02</span>
          <span>
            Pondérer les colonnes représentatives et synthétiser les moyennes (dont la moyenne
            pondérée) pour orienter la fourchette retenue.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">03</span>
          <span>
            Retenir une fourchette de{" "}
            <span className="font-medium text-[#2A2F3A]">revenus</span> et de{" "}
            <span className="font-medium text-[#2A2F3A]">BAIIA ajusté</span> (bas / haut /
            moyen).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">04</span>
          <span>
            Déduire l&apos;impôt, l&apos;ajustement de fonds de roulement (FDR
            représentatif VCA × revenus retenus × croissance économique) et les capex de
            maintien (bas / haut) pour obtenir les flux monétaires caractéristiques.
          </span>
        </li>
      </ul>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-slate-500">
        La relation retenue est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm leading-relaxed text-[#2A2F3A]">
        Flux caractéristiques = BAIIA ajusté − Impôt ± Ajustement FDR − Capex de maintien
      </p>
    </NetTangibleReportSection>
  )
}
