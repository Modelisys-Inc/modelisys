"use client"

import { NetTangibleReportSection } from "@/components/net-tangible/report-section"

/** Méthode — étape Capitalisation (flux → multiple → VE → structure). */
export function CapitalisationMethodSection() {
  return (
    <NetTangibleReportSection id="methode" number="1." title="Méthode et périmètre">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Cette étape capitalise les{" "}
        <span className="font-medium text-[#2A2F3A]">flux monétaires caractéristiques</span>{" "}
        pour déterminer la valeur d&apos;entreprise à la date de référence, puis confronte
        cette conclusion aux multiples comparables et à la structure de financement compatible
        avec le CMPC.
      </p>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-500">
        La démarche consiste à&nbsp;:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">01</span>
          <span>
            Reprendre les flux monétaires caractéristiques (bas / haut / moyen) issus de
            l&apos;étape{" "}
            <span className="font-medium text-[#2A2F3A]">Flux monétaires</span>.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">02</span>
          <span>
            Déterminer le multiple retenu à partir du CMPC (étape{" "}
            <span className="font-medium text-[#2A2F3A]">Multiplicateur</span>) diminué de la
            croissance économique, puis capitaliser les flux pour obtenir la valeur
            d&apos;entreprise et l&apos;achalandage (VE − ACN).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">03</span>
          <span>
            Analyser les multiples implicites (VE / Revenus, VE / BAIIA) par rapport aux
            fourchettes empiriques, IA et comparables de marché.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">04</span>
          <span>
            Traduire les flux en capacité d&apos;endettement maximale (VA) et en Dette /
            BAIIA, puis estimer la structure de financement selon la pondération CMPC.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-[#E0742D]">05</span>
          <span>
            Documenter les hypothèses et sources (multiples, remboursement, Dette / BAIIA).
          </span>
        </li>
      </ul>
      <p className="mt-5 text-pretty text-sm leading-relaxed text-slate-500">
        La relation retenue est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm leading-relaxed text-[#2A2F3A]">
        VE = Flux monétaires caractéristiques × Multiple
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm leading-relaxed text-[#2A2F3A]">
        Multiple = 1 ÷ (CMPC − croissance économique)
      </p>
    </NetTangibleReportSection>
  )
}
