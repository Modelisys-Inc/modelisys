"use client"

import { useState } from "react"
import Link from "next/link"
import { Activity, ArrowRight } from "lucide-react"
import type { Company } from "@/components/entity-selector"
import { CapexAnalysis } from "@/components/capex-analysis"
import {
  EmbeddedHorizonToggle,
  type ChartHorizonToggleValue,
} from "@/components/statement-chart"
import { CARD_CLASS } from "@/lib/diagnostic-theme"

interface DiagnosticCapexSectionProps {
  companyId: string
  companies: Company[]
  referenceYear: number
  referenceMonth: number
}

export function DiagnosticCapexSection({
  companyId,
  companies,
  referenceYear,
  referenceMonth,
}: DiagnosticCapexSectionProps) {
  const [horizonView, setHorizonView] = useState<ChartHorizonToggleValue>("years")
  const analysisView = horizonView === "years" ? "years" : "12months"
  const capexHref = `/analysis/capex?companyId=${companyId}&refYear=${referenceYear}&refMonth=${referenceMonth}`
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "Société sélectionnée"

  return (
    <section
      id="diag-rapport"
      data-testid="capex-report"
      className={`${CARD_CLASS} scroll-mt-28`}
    >
      <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Activity className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                Capex
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                <EmbeddedHorizonToggle value={horizonView} onChange={setHorizonView} />
                <span className="text-slate-300" aria-hidden>
                  •
                </span>
                <span className="font-semibold text-[#2A2F3A]">{companyName}</span>
                <span className="text-slate-300" aria-hidden>
                  •
                </span>
                <span className="text-xs text-slate-500">
                  Structure investissements (bilan + CDR)
                </span>
              </div>
            </div>
          </div>
          <Link
            href={capexHref}
            className="inline-flex flex-none items-center gap-1 text-[11px] font-medium text-[#E0742D] transition-colors hover:text-[#F08F4F]"
          >
            Voir l&apos;analyse détaillée
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      <CapexAnalysis
        key={analysisView}
        appearance="diagnostic"
        period="monthly"
        view={analysisView}
        companyId={companyId}
        companies={companies}
        fiscalYear={referenceYear}
        referenceMonth={referenceMonth}
        showStructureSettings={false}
      />
    </section>
  )
}
