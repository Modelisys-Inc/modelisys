"use client"

import { useState } from "react"
import type { Company } from "@/components/entity-selector"
import { WorkingCapitalAnalysis } from "@/components/working-capital-analysis"
import { DiagnosticCard } from "@/components/diagnostic/v2/diagnostic-card"
import {
  EmbeddedHorizonToggle,
  type ChartHorizonToggleValue,
} from "@/components/statement-chart"

interface DiagnosticWorkingCapitalSectionProps {
  companyId: string
  companies: Company[]
  referenceYear: number
  referenceMonth: number
}

export function DiagnosticWorkingCapitalSection({
  companyId,
  companies,
  referenceYear,
  referenceMonth,
}: DiagnosticWorkingCapitalSectionProps) {
  const [horizonView, setHorizonView] = useState<ChartHorizonToggleValue>("years")
  const analysisView = horizonView === "years" ? "years" : "12months"
  const workingCapitalHref = `/analysis/working-capital?companyId=${companyId}&refYear=${referenceYear}&refMonth=${referenceMonth}`

  return (
    <DiagnosticCard
      id="diag-rapport"
      testId="working-capital-report"
      className="scroll-mt-28"
      title="Fonds de roulement"
      subtitle="Indicateurs synchronisés avec la structure Analyse → Fonds de roulement"
      detailHref={workingCapitalHref}
      legend={<EmbeddedHorizonToggle value={horizonView} onChange={setHorizonView} />}
      bodyClassName="p-0"
    >
      <WorkingCapitalAnalysis
        appearance="diagnostic"
        period="monthly"
        view={analysisView}
        companyId={companyId}
        companies={companies}
        fiscalYear={referenceYear}
        referenceMonth={referenceMonth}
        showStructureSettings={false}
      />
    </DiagnosticCard>
  )
}
