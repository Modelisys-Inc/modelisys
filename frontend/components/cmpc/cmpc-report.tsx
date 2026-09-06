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
import { ReportHeader } from "./report-header"
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
  onMetaChange,
  onEquityNotesChange,
  onSourcesChange,
  className,
}: CmpcReportProps) {
  const results = useMemo(() => computeCmpcWacc(inputs), [inputs])

  const updateInput = (key: keyof CmpcWaccInputs) => (value: number) =>
    onInputsChange({ ...inputs, [key]: value })

  const updateMeta = (key: keyof CmpcReportMeta) => (value: string) =>
    onMetaChange({ ...meta, [key]: value })

  const updateEquityNote = (key: keyof CmpcEquityNotes) => (value: string) =>
    onEquityNotesChange({ ...equityNotes, [key]: value })

  return (
    <article
      data-testid="cmpc-report"
      data-report-sheet
      className={cn(
        "rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg sm:px-12 sm:py-12",
        className,
      )}
    >
      <ReportHeader meta={meta} update={updateMeta} />
      <Conclusion results={results} meta={meta} />
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

      <footer className="mt-10 border-t border-slate-200 pt-4">
        <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
          Rapport indicatif de détermination du coût moyen pondéré du capital · Méthodologie
          conforme aux pratiques généralement reconnues en évaluation d&apos;entreprises (CBV /
          EEE) · {meta.subject} · {meta.valuationDate}
        </p>
      </footer>
    </article>
  )
}
