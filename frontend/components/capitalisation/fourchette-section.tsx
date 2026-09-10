"use client"

import { ParamRow } from "@/components/cmpc/editable"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import type { UseEbitdaCapitalisationReturn } from "@/hooks/use-ebitda-capitalisation"
import { normalizeAdjustmentTarget } from "@/lib/ebitda-capitalisation"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

type FourchetteSectionProps = {
  capitalisation: UseEbitdaCapitalisationReturn
  /** Numéro de section affiché (3. sur BAIIA ajusté). */
  number?: string
}

/** Marge BAIIA / revenus (ex. « 12,4 % »). */
function formatBaiiaToRevenue(ebitda: number, revenue: number): string {
  if (!Number.isFinite(ebitda) || !Number.isFinite(revenue) || Math.abs(revenue) < 1e-9) {
    return "—"
  }
  const pct = (ebitda / revenue) * 100
  return `${pct.toLocaleString("fr-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`
}

function SynthesisRow({
  label,
  revenue,
  ebitda,
  total,
  testId,
}: {
  label: string
  revenue: number
  ebitda: number
  total?: boolean
  testId?: string
}) {
  return (
    <tr
      className={total ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200"}
      data-testid={testId}
    >
      <td className="py-2 pr-4">
        <span className={cn("text-sm", total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]")}>
          {label}
        </span>
      </td>
      <td
        className={cn(
          "py-2 pr-4 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]",
        )}
      >
        {formatCurrency(revenue)}
      </td>
      <td
        className={cn(
          "py-2 pr-4 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]",
        )}
      >
        {formatCurrency(ebitda)}
      </td>
      <td
        className={cn(
          "py-2 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#E0742D]" : "text-[#2A2F3A]",
        )}
      >
        {formatBaiiaToRevenue(ebitda, revenue)}
      </td>
    </tr>
  )
}

function formatRangeSpread(bas: number, haut: number, moyen: number): string {
  if (
    !Number.isFinite(bas) ||
    !Number.isFinite(haut) ||
    !Number.isFinite(moyen) ||
    Math.abs(moyen) < 1e-9
  ) {
    return "—"
  }
  const pct = ((haut - bas) / Math.abs(moyen)) * 100
  return `${pct.toLocaleString("fr-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`
}

/** Écart entre deux marges (haut − bas), affiché en % (ex. 4,7 %). */
function formatMarginSpreadPct(
  basNumerator: number,
  basDenom: number,
  hautNumerator: number,
  hautDenom: number,
): string {
  if (
    !Number.isFinite(basNumerator) ||
    !Number.isFinite(basDenom) ||
    !Number.isFinite(hautNumerator) ||
    !Number.isFinite(hautDenom) ||
    Math.abs(basDenom) < 1e-9 ||
    Math.abs(hautDenom) < 1e-9
  ) {
    return "—"
  }
  const basPct = (basNumerator / basDenom) * 100
  const hautPct = (hautNumerator / hautDenom) * 100
  const delta = hautPct - basPct
  return `${delta.toLocaleString("fr-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  })} %`
}

function RetainedRangeRow({
  label,
  bas,
  haut,
  moyen,
  ecart,
  total,
  separatorAbove,
  testId,
}: {
  label: string
  bas: string
  haut: string
  moyen: string
  ecart: string
  total?: boolean
  /** Trait fort au-dessus (ex. sous la ligne BAIIA). */
  separatorAbove?: boolean
  testId?: string
}) {
  return (
    <tr
      className={cn(
        separatorAbove ? "border-t-2 border-[#2A2F3A]" : "border-t border-slate-200",
      )}
      data-testid={testId}
    >
      <td className="py-2 pr-4">
        <span className={cn("text-sm", total ? "font-semibold text-[#2A2F3A]" : "text-[#2A2F3A]")}>
          {label}
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
          "py-2 pr-4 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-[#E0742D]" : "text-[#2A2F3A]",
        )}
      >
        {moyen}
      </td>
      <td
        className={cn(
          "py-2 text-right font-mono text-sm tabular-nums",
          total ? "font-semibold text-slate-600" : "text-slate-500",
        )}
      >
        {ecart}
      </td>
    </tr>
  )
}

export function FourchetteSection({
  capitalisation: c,
  number = "3.",
}: FourchetteSectionProps) {
  const hasRevenueAdj = c.adjustments.some(
    (adj) => normalizeAdjustmentTarget(adj.target) === "revenue",
  )
  const revenueHeader = hasRevenueAdj ? "Revenus ajustés" : "Revenus"

  return (
    <NetTangibleReportSection
      id="fourchette"
      number={number}
      title="Fourchette du BAIIA représentatif"
    >
      <p className="mb-4 text-pretty text-sm leading-relaxed text-slate-500">
        Synthèse des moyennes, puis détermination des bornes de revenus et de BAIIA retenues.
        <span className="font-medium text-[#2A2F3A]"> BAIIA / Revenus</span> compare chaque borne
        à sa contrepartie (bas/bas, haut/haut, moyen/moyen)&nbsp;;{" "}
        <span className="font-medium text-[#2A2F3A]">BAIIA / Revenus moyens</span> rapporte
        chaque BAIIA aux revenus moyens représentatifs. L&apos;écart de marge s&apos;exprime en
        % (ex. 4,7&nbsp;%).
      </p>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Synthèse
          </p>
          <table className="w-full" data-testid="capitalisation-baiia-summary">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Indicateur
                </th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {revenueHeader}
                </th>
                <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  BAIIA
                </th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  BAIIA / Revenus
                </th>
              </tr>
            </thead>
            <tbody>
              {c.synthesisAverages.map((row) => (
                <SynthesisRow
                  key={row.id}
                  label={row.label}
                  revenue={row.revenue}
                  ebitda={row.ebitda}
                  testId={`capitalisation-${row.id}`}
                />
              ))}
              <SynthesisRow
                label="Moyenne pondérée"
                revenue={c.weightedAverageRevenue}
                ebitda={c.weightedAverageEBITDA}
                total
                testId="capitalisation-avg-weighted"
              />
            </tbody>
          </table>
        </div>

        <div className="space-y-8">
          <div data-testid="capitalisation-range-hypotheses">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hypothèses
            </p>
            <ParamRow
              label="Revenus bas"
              hint="Borne basse des revenus représentatifs retenus."
              value={c.lowRevenueRange}
              onChange={(v) => {
                if (!Number.isFinite(v)) return
                c.setLowRevenueRange(v)
              }}
              currency
              width="w-36"
              note={c.revenueRangeNotes.low || ""}
              onNoteChange={(note) => c.updateRevenueRangeNote("low", note)}
              testId="capitalisation-revenue-range-value-low"
              noteTestId="capitalisation-revenue-range-note-low"
            />
            <ParamRow
              label="Revenus haut"
              hint="Borne haute des revenus représentatifs retenus."
              value={c.highRevenueRange}
              onChange={(v) => {
                if (!Number.isFinite(v)) return
                c.setHighRevenueRange(v)
              }}
              currency
              width="w-36"
              note={c.revenueRangeNotes.high || ""}
              onNoteChange={(note) => c.updateRevenueRangeNote("high", note)}
              testId="capitalisation-revenue-range-value-high"
              noteTestId="capitalisation-revenue-range-note-high"
            />
            <ParamRow
              label="BAIIA ajusté bas"
              hint="Borne basse du BAIIA ajusté représentatif retenu pour la capitalisation."
              value={c.lowEBITDARange}
              onChange={(v) => {
                if (!Number.isFinite(v)) return
                c.setLowEBITDARange(v)
              }}
              currency
              width="w-36"
              note={c.ebitdaRangeNotes.low || ""}
              onNoteChange={(note) => c.updateEbitdaRangeNote("low", note)}
              testId="capitalisation-range-value-low"
              noteTestId="capitalisation-range-note-low"
            />
            <ParamRow
              label="BAIIA ajusté haut"
              hint="Borne haute du BAIIA ajusté représentatif retenu pour la capitalisation."
              value={c.highEBITDARange}
              onChange={(v) => {
                if (!Number.isFinite(v)) return
                c.setHighEBITDARange(v)
              }}
              currency
              width="w-36"
              note={c.ebitdaRangeNotes.high || ""}
              onNoteChange={(note) => c.updateEbitdaRangeNote("high", note)}
              testId="capitalisation-range-value-high"
              noteTestId="capitalisation-range-note-high"
            />
          </div>

          <div data-testid="capitalisation-range-summary">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fourchette retenue
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Indicateur
                  </th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Bas
                  </th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Haut
                  </th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Moyen
                  </th>
                  <th
                    className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                    title="Amplitude (haut − bas) en % du moyen ; pour les marges, écart entre bas et haut en %"
                  >
                    Écart
                  </th>
                </tr>
              </thead>
              <tbody>
                <RetainedRangeRow
                  label="Revenus"
                  bas={formatCurrency(c.lowRevenueRange)}
                  haut={formatCurrency(c.highRevenueRange)}
                  moyen={formatCurrency(c.midRevenueRange)}
                  ecart={formatRangeSpread(
                    c.lowRevenueRange,
                    c.highRevenueRange,
                    c.midRevenueRange,
                  )}
                  testId="capitalisation-retained-revenue"
                />
                <RetainedRangeRow
                  label="BAIIA ajusté"
                  bas={formatCurrency(c.lowEBITDARange)}
                  haut={formatCurrency(c.highEBITDARange)}
                  moyen={formatCurrency(c.midEBITDARange)}
                  ecart={formatRangeSpread(
                    c.lowEBITDARange,
                    c.highEBITDARange,
                    c.midEBITDARange,
                  )}
                  total
                  testId="capitalisation-retained-baiia"
                />
                <RetainedRangeRow
                  label="BAIIA / Revenus"
                  bas={formatBaiiaToRevenue(c.lowEBITDARange, c.lowRevenueRange)}
                  haut={formatBaiiaToRevenue(c.highEBITDARange, c.highRevenueRange)}
                  moyen={formatBaiiaToRevenue(c.midEBITDARange, c.midRevenueRange)}
                  ecart={formatMarginSpreadPct(
                    c.lowEBITDARange,
                    c.lowRevenueRange,
                    c.highEBITDARange,
                    c.highRevenueRange,
                  )}
                  separatorAbove
                  testId="capitalisation-retained-margin"
                />
                <RetainedRangeRow
                  label="BAIIA / Revenus moyens"
                  bas={formatBaiiaToRevenue(c.lowEBITDARange, c.midRevenueRange)}
                  haut={formatBaiiaToRevenue(c.highEBITDARange, c.midRevenueRange)}
                  moyen={formatBaiiaToRevenue(c.midEBITDARange, c.midRevenueRange)}
                  ecart={formatMarginSpreadPct(
                    c.lowEBITDARange,
                    c.midRevenueRange,
                    c.highEBITDARange,
                    c.midRevenueRange,
                  )}
                  testId="capitalisation-retained-margin-mid-rev"
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </NetTangibleReportSection>
  )
}
