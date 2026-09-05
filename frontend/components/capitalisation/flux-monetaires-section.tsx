"use client"

import { LabelWithHint, ParamRow } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

type FluxMonetairesSectionProps = {
  capitalisation: UseEbitdaCapitalisationReturn
}

function BridgeRow({
  label,
  hint,
  bas,
  haut,
  moyen,
  total,
  muted,
  testId,
}: {
  label: string
  hint?: string
  bas: string
  haut: string
  moyen: string
  total?: boolean
  muted?: boolean
  testId?: string
}) {
  return (
    <tr
      className={cn(
        total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200",
      )}
      data-testid={testId}
    >
      <td className="py-2 pr-4">
        <span
          className={cn(
            "text-sm",
            total
              ? "font-semibold text-[#2A2F3A]"
              : muted
                ? "text-slate-500"
                : "text-[#2A2F3A]",
          )}
        >
          <LabelWithHint label={label} hint={hint} />
        </span>
      </td>
      <td
        className={cn(
          "py-2 pr-4 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]",
        )}
      >
        {bas}
      </td>
      <td
        className={cn(
          "py-2 pr-4 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]",
        )}
      >
        {haut}
      </td>
      <td
        className={cn(
          "py-2 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#E0742D]" : "text-[#2A2F3A]",
        )}
      >
        {moyen}
      </td>
    </tr>
  )
}

/** Affiche un montant de déduction (impôt, capex) avec préfixe −. */
function formatDeduction(amount: number): string {
  if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) return "—"
  return `−${formatCurrency(Math.abs(amount))}`
}

export function FluxMonetairesSection({ capitalisation: c }: FluxMonetairesSectionProps) {
  const cf = c.characteristicCashFlows
  const wc = c.workingCapitalAdjustment
  const fdrPct = c.vcaFdrPctOfRevenue

  return (
    <NetTangibleReportSection
      id="flux-monetaires"
      number="4."
      title="Flux caractéristiques"
    >
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        À partir du BAIIA ajusté et des revenus retenus (bas / haut), on déduit l&apos;impôt, un
        ajustement de fonds de roulement (FDR % VCA × revenus × croissance) et les
        capex de maintien pour obtenir les{" "}
        <span className="font-medium text-[#2A2F3A]">flux monétaires caractéristiques</span>.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <div data-testid="adjusted-ebitda-cash-flow-bridge">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pont vers les flux caractéristiques
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Poste
                </th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bas
                </th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Haut
                </th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Moyen
                </th>
              </tr>
            </thead>
            <tbody>
              <BridgeRow
                label="BAIIA ajusté"
                bas={formatCurrency(cf.low.baiia)}
                haut={formatCurrency(cf.high.baiia)}
                moyen={formatCurrency(cf.mid.baiia)}
                testId="cash-flow-baiia"
              />
              <BridgeRow
                label="(−) Impôt"
                bas={formatDeduction(cf.low.tax)}
                haut={formatDeduction(cf.high.tax)}
                moyen={formatDeduction(cf.mid.tax)}
                muted
                testId="cash-flow-tax"
              />
              <BridgeRow
                label="(−) Ajustement FDR"
                bas={formatDeduction(cf.low.workingCapital)}
                haut={formatDeduction(cf.high.workingCapital)}
                moyen={formatDeduction(cf.mid.workingCapital)}
                muted
                testId="cash-flow-working-capital"
              />
              <BridgeRow
                label="(−) Capex de maintien"
                bas={formatDeduction(cf.low.maintenanceCapex)}
                haut={formatDeduction(cf.high.maintenanceCapex)}
                moyen={formatDeduction(cf.mid.maintenanceCapex)}
                muted
                testId="cash-flow-maintenance-capex"
              />
              <BridgeRow
                label="Flux monétaires caractéristiques"
                bas={formatCurrency(cf.low.characteristicCashFlow)}
                haut={formatCurrency(cf.high.characteristicCashFlow)}
                moyen={formatCurrency(cf.mid.characteristicCashFlow)}
                total
                testId="cash-flow-characteristic"
              />
            </tbody>
          </table>
        </div>

        <div data-testid="adjusted-ebitda-cash-flow-hypotheses">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hypothèses
          </p>
          <ParamRow
            label="Taux d'impôt"
            hint="Taux effectif appliqué au BAIIA ajusté de chaque borne (bas / haut / moyen)."
            value={c.cashFlowTaxRate}
            onChange={(v) => {
              if (!Number.isFinite(v) || v < 0) return
              c.setCashFlowTaxRate(v)
            }}
            unit="%"
            step={0.5}
            min={0}
            max={100}
            width="w-20"
            note={c.cashFlowNotes.tax}
            onNoteChange={(note) => c.updateCashFlowNote("tax", note)}
            testId="cash-flow-tax-rate"
            noteTestId="cash-flow-tax-note"
          />
          <ParamRow
            label="Croissance économique (inflation)"
            hint="Taux de croissance à perpétuité appliqué aux revenus retenus pour estimer le FDR de croissance."
            value={c.cashFlowEconomicGrowth}
            onChange={(v) => {
              if (!Number.isFinite(v) || v < 0) return
              c.setCashFlowEconomicGrowth(v)
            }}
            unit="%"
            step={0.1}
            min={0}
            max={100}
            width="w-20"
            note={c.cashFlowNotes.economicGrowth}
            onNoteChange={(note) => c.updateCashFlowNote("economicGrowth", note)}
            testId="cash-flow-economic-growth"
            noteTestId="cash-flow-economic-growth-note"
          />
          <ParamRow
            label="Capex de maintien bas"
            hint="Borne basse des capex de maintien déduits des flux monétaires."
            value={c.cashFlowMaintenanceCapexLow}
            onChange={(v) => {
              if (!Number.isFinite(v)) return
              c.setCashFlowMaintenanceCapexLow(v)
            }}
            currency
            width="w-36"
            note={c.cashFlowNotes.maintenanceCapexLow}
            onNoteChange={(note) => c.updateCashFlowNote("maintenanceCapexLow", note)}
            testId="cash-flow-capex-low"
            noteTestId="cash-flow-capex-low-note"
          />
          <ParamRow
            label="Capex de maintien haut"
            hint="Borne haute des capex de maintien déduits des flux monétaires."
            value={c.cashFlowMaintenanceCapexHigh}
            onChange={(v) => {
              if (!Number.isFinite(v)) return
              c.setCashFlowMaintenanceCapexHigh(v)
            }}
            currency
            width="w-36"
            note={c.cashFlowNotes.maintenanceCapexHigh}
            onNoteChange={(note) => c.updateCashFlowNote("maintenanceCapexHigh", note)}
            testId="cash-flow-capex-high"
            noteTestId="cash-flow-capex-high-note"
          />
        </div>
      </div>

      <div className="mt-8" data-testid="adjusted-ebitda-fdr-adjustment-detail">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ajustement de fonds de roulement
        </p>
        <p className="mb-3 text-pretty text-sm leading-relaxed text-slate-500">
          Un BAIIA en croissance à perpétuité exige un fonds de roulement proportionnel aux
          revenus futurs&nbsp;; sans cet ajustement, les flux monétaires surestimeraient la
          trésorerie disponible.
          {fdrPct == null ? (
            <>
              {" "}
              <span className="font-medium text-amber-700">
                FDR % VCA non disponible — complétez l&apos;étape Valeur comptable ajustée (FDR
                représentatif).
              </span>
            </>
          ) : (
            <>
              {" "}
              FDR VCA&nbsp;:{" "}
              <span className="font-mono font-medium text-[#2A2F3A]">
                {fdrPct.toFixed(1)}&nbsp;%
              </span>{" "}
              des revenus.
            </>
          )}
        </p>
        <table className="w-full max-w-3xl">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Étape
              </th>
              <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bas
              </th>
              <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Haut
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Moyen
              </th>
            </tr>
          </thead>
          <tbody>
            <BridgeRow
              label="Revenus retenus"
              bas={formatCurrency(wc.low.revenue)}
              haut={formatCurrency(wc.high.revenue)}
              moyen={formatCurrency(wc.mid.revenue)}
              testId="fdr-adj-revenue"
            />
            <BridgeRow
              label={`× Croissance économique (${c.cashFlowEconomicGrowth.toFixed(1)} %)`}
              bas={formatCurrency(wc.low.fdrGrowthEstimate)}
              haut={formatCurrency(wc.high.fdrGrowthEstimate)}
              moyen={formatCurrency(wc.mid.fdrGrowthEstimate)}
              muted
              testId="fdr-adj-growth-estimate"
            />
            <BridgeRow
              label={
                fdrPct != null
                  ? `Ajustement FDR (${fdrPct.toFixed(1)} % × croissance économique)`
                  : "Ajustement FDR (% × croissance économique)"
              }
              hint={
                fdrPct != null
                  ? `Le taux de ${fdrPct.toFixed(1)} % est le FDR représentatif en pourcentage des revenus, déterminé à l’étape Valeur comptable ajustée (VCA). L’ajustement applique ce taux à l’accroissement des revenus retenus (revenus × croissance économique).`
                  : "Le taux FDR provient du FDR représentatif en % des revenus de l’étape Valeur comptable ajustée (VCA). Complétez cette étape pour l’alimenter."
              }
              bas={formatCurrency(wc.low.adjustment)}
              haut={formatCurrency(wc.high.adjustment)}
              moyen={formatCurrency(wc.mid.adjustment)}
              total
              testId="fdr-adj-result"
            />
          </tbody>
        </table>
      </div>
    </NetTangibleReportSection>
  )
}
