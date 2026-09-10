"use client"

import { useMemo } from "react"
import {
  computeCmpcWacc,
  type CmpcEquityNotes,
  type CmpcParamSources,
  type CmpcReportMeta,
  type CmpcWaccInputs,
} from "@/lib/cmpc-wacc"
import { cn } from "@/lib/utils"
import { Conclusion } from "./conclusion"
import { EquitySection } from "./equity-section"
import { DebtSection } from "./debt-section"
import { StructureSection } from "./structure-section"
import { Determination } from "./determination"
import { Assumptions } from "./assumptions"
import { Disclaimer } from "./disclaimer"
import "./cmpc-report-print.css"

export type CmpcReportProps = {
  inputs: CmpcWaccInputs
  meta: CmpcReportMeta
  equityNotes: CmpcEquityNotes
  sources: CmpcParamSources
  onInputsChange: (next: CmpcWaccInputs) => void
  onMetaChange: (next: CmpcReportMeta) => void
  onEquityNotesChange: (next: CmpcEquityNotes) => void
  onSourcesChange: (next: CmpcParamSources) => void
  className?: string
}

export function CmpcReport({
  inputs,
  meta,
  equityNotes,
  sources,
  onInputsChange,
  onEquityNotesChange,
  onSourcesChange,
  className,
}: CmpcReportProps) {
  const results = useMemo(() => computeCmpcWacc(inputs), [inputs])

  const updateInput = (key: keyof CmpcWaccInputs) => (value: number) =>
    onInputsChange({ ...inputs, [key]: value })

  const updateEquityNote = (key: keyof CmpcEquityNotes) => (value: string) =>
    onEquityNotesChange({ ...equityNotes, [key]: value })

  return (
    <article
      data-testid="cmpc-report"
      data-report-sheet
      className={cn(
        "overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]",
        className,
      )}
    >
      <Conclusion results={results} />

      <div className="px-6 pb-8 pt-10 sm:px-12 sm:pb-12">
        <div className="mb-6" aria-hidden>
          <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-[#E6D6C3]/50 to-transparent" />
        </div>

        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
            Détail du rapport
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Coût des capitaux propres, coût de la dette, structure de capital et détermination du
            CMPC.
          </p>
        </div>

        <EquitySection
          inputs={inputs}
          results={results}
          notes={equityNotes}
          sources={sources}
          update={updateInput}
          updateNote={updateEquityNote}
        />
        <DebtSection
          inputs={inputs}
          results={results}
          sources={sources}
          update={updateInput}
        />
        <StructureSection
          inputs={inputs}
          results={results}
          sources={sources}
          onInputsChange={onInputsChange}
        />
        <Determination results={results} />
        <Assumptions
          inputs={inputs}
          sources={sources}
          onSourcesChange={onSourcesChange}
        />
        <Disclaimer />

        <footer className="mt-10 border-t border-[#E6D6C3]/45 pt-4">
          <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
            Rapport indicatif de détermination du coût moyen pondéré du capital · Méthodologie
            conforme aux pratiques généralement reconnues en évaluation d&apos;entreprises (CBV /
            EEE) · {meta.subject} · {meta.valuationDate}
          </p>
        </footer>
      </div>
    </article>
  )
}
