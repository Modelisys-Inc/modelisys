"use client"

import {
  formatCmpcPct,
  type CmpcEquityNotes,
  type CmpcParamSources,
  type CmpcWaccInputs,
  type CmpcWaccResults,
} from "@/lib/cmpc-wacc"
import { ReportSection } from "./report-section"
import { ParamRow } from "./editable"

type EquitySectionProps = {
  inputs: CmpcWaccInputs
  results: CmpcWaccResults
  notes: CmpcEquityNotes
  sources: CmpcParamSources
  update: (key: keyof CmpcWaccInputs) => (value: number) => void
  updateNote: (key: keyof CmpcEquityNotes) => (value: string) => void
}

function BuildupRow({
  operator,
  label,
  detail,
  value,
  total,
}: {
  operator: string
  label: string
  detail?: string
  value: string
  total?: boolean
}) {
  return (
    <tr className={total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200"}>
      <td className="w-6 py-2 pr-1 text-center font-mono text-sm text-slate-500">{operator}</td>
      <td className="py-2 pr-4">
        <span className={`text-sm ${total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]"}`}>
          {label}
        </span>
        {detail ? (
          <span className="ml-2 font-mono text-xs text-slate-500">{detail}</span>
        ) : null}
      </td>
      <td
        className={`py-2 text-right font-mono text-sm tabular-nums ${
          total ? "font-semibold text-[#E0742D]" : "text-[#2A2F3A]"
        }`}
      >
        {value}
      </td>
    </tr>
  )
}

export function EquitySection({
  inputs,
  results,
  notes,
  sources,
  update,
  updateNote,
}: EquitySectionProps) {
  const betaTimesErp = inputs.beta * inputs.equityRiskPremium

  return (
    <ReportSection number="1." title="Coût des capitaux propres (Ke)">
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Le coût des capitaux propres correspond au taux de rendement exigé par un investisseur en
        actions. Il est établi selon le modèle d&apos;équilibre des actifs financiers (MÉDAF /
        CAPM), auquel s&apos;ajoutent une prime de taille et une prime de risque spécifique afin de
        refléter les caractéristiques d&apos;une société fermée de moindre envergure. La formule
        retenue est&nbsp;:
      </p>
      <p className="mt-3 rounded-md bg-slate-100/80 px-4 py-3 text-center font-mono text-sm text-[#2A2F3A]">
        Ke = Rf + β × PRM + prime de taille + prime de risque spécifique
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses
          </p>
          <ParamRow
            label="Taux sans risque (Rf)"
            value={inputs.riskFreeRate}
            onChange={update("riskFreeRate")}
            testId="cmpc-risk-free-rate"
            hint={sources.riskFreeRate}
            note={notes.riskFreeRate}
            onNoteChange={updateNote("riskFreeRate")}
            noteTestId="cmpc-note-risk-free-rate"
          />
          <ParamRow
            label="Prime de risque du marché (PRM)"
            value={inputs.equityRiskPremium}
            onChange={update("equityRiskPremium")}
            testId="cmpc-equity-risk-premium"
            hint={sources.equityRiskPremium}
            note={notes.equityRiskPremium}
            onNoteChange={updateNote("equityRiskPremium")}
            noteTestId="cmpc-note-equity-risk-premium"
          />
          <ParamRow
            label="Bêta (β)"
            value={inputs.beta}
            onChange={update("beta")}
            testId="cmpc-beta"
            unit="×"
            step={0.05}
            hint={sources.beta}
            note={notes.beta}
            onNoteChange={updateNote("beta")}
            noteTestId="cmpc-note-beta"
          />
          <ParamRow
            label="Prime de taille"
            value={inputs.sizePremium}
            onChange={update("sizePremium")}
            testId="cmpc-size-premium"
            hint={sources.sizePremium}
            note={notes.sizePremium}
            onNoteChange={updateNote("sizePremium")}
            noteTestId="cmpc-note-size-premium"
          />
          <ParamRow
            label="Prime de risque spécifique"
            value={inputs.specificRiskPremium}
            onChange={update("specificRiskPremium")}
            testId="cmpc-specific-risk"
            hint={sources.specificRiskPremium}
            note={notes.specificRiskPremium}
            onNoteChange={updateNote("specificRiskPremium")}
            noteTestId="cmpc-note-specific-risk"
          />
        </div>

        <div className="mt-6 lg:mt-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calcul du coût des capitaux propres
          </p>
          <table className="w-full">
            <tbody>
              <BuildupRow
                operator=""
                label="Taux sans risque"
                value={formatCmpcPct(inputs.riskFreeRate)}
              />
              <BuildupRow
                operator="+"
                label="Prime de marché × β"
                detail={`${inputs.beta.toFixed(2)} × ${formatCmpcPct(inputs.equityRiskPremium)}`}
                value={formatCmpcPct(betaTimesErp)}
              />
              <BuildupRow
                operator="+"
                label="Prime de taille"
                value={formatCmpcPct(inputs.sizePremium)}
              />
              <BuildupRow
                operator="+"
                label="Prime de risque spécifique"
                value={formatCmpcPct(inputs.specificRiskPremium)}
              />
              <BuildupRow
                operator="="
                label="Coût des capitaux propres (Ke)"
                value={formatCmpcPct(results.costOfEquity)}
                total
              />
            </tbody>
          </table>
        </div>
      </div>
    </ReportSection>
  )
}
