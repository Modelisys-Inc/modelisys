"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IncomeStatementLiaisonCell } from "@/components/income-statement-liaison-cell"
import {
  BookMarked,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Hash,
  Link2,
  Pencil,
  PanelTop,
  Percent,
  Trash2,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  capexAutoRatioLiaisonLabel,
  isCapexAutoComputedRow,
  isCapexAutoRatioRow,
  readRowCapexCostDisplayMode,
  structureRowShowsCapexCostDisplaySelector,
  type CapexCostDisplayMode,
} from "@/lib/capex-analysis-settings"
import {
  readRowCashFlowCalcMode,
  readRowCashFlowTinDisplayMode,
  structureRowShowsCashFlowCalcSelector,
  structureRowShowsCashFlowTinDisplaySelector,
  type CashFlowCalcMode,
  type CashFlowTinDisplayMode,
} from "@/lib/cash-flow-detail-settings"
import {
  isCashFlowEndingCashStructureRow,
  isCashFlowFixedTreasuryStructureRow,
} from "@/lib/cash-flow-treasury-rows"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  isAnnexLetterInputEditable,
  isCodeMappingEnabled,
  isShowInDetail,
  isShowInSummary,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normalizeAnnexLetter,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  resolveWorkingCapitalDisplayFormat,
  type WorkingCapitalDisplayFormat,
} from "@/lib/working-capital-structure-utils"

export type StatementAnnexColumnMode = "full" | "summary" | "hidden"

export type StatementSummaryStructureEditApi = {
  updateRow: (index: number, patch: Record<string, unknown>) => void
  /** Bascule « Annexe » puis renumérote les identifiants selon l'ordre du rapport. */
  setShowInDetail: (index: number, checked: boolean) => void
  canRemoveRowAt: (index: number) => boolean
  removeStructureRowAt: (index: number) => void
  moveStructureRow?: (index: number, direction: -1 | 1) => void
}

function resolveAnnexMode(
  hideAnnexColumns: boolean | undefined,
  annexMode: StatementAnnexColumnMode | undefined,
): StatementAnnexColumnMode {
  if (annexMode) return annexMode
  return hideAnnexColumns ? "hidden" : "full"
}

export function StatementSummaryStructureColgroup({
  hideAnnexColumns = false,
  annexMode,
  showDisplayFormatColumn = false,
  showCapexCostDisplayColumn = false,
  showCashFlowCalcColumn = false,
  showCashFlowTinDisplayColumn = false,
}: {
  hideAnnexColumns?: boolean
  annexMode?: StatementAnnexColumnMode
  showDisplayFormatColumn?: boolean
  showCapexCostDisplayColumn?: boolean
  showCashFlowCalcColumn?: boolean
  showCashFlowTinDisplayColumn?: boolean
}) {
  const mode = resolveAnnexMode(hideAnnexColumns, annexMode)
  return (
    <colgroup>
      <col className="min-w-0" />
      <col style={{ width: "7rem" }} />
      <col style={{ width: "7rem" }} />
      <col style={{ width: "7rem" }} />
      <col style={{ width: "7rem" }} />
      {showDisplayFormatColumn ? <col style={{ width: "7.5rem" }} /> : null}
      {showCapexCostDisplayColumn ? <col style={{ width: "9rem" }} /> : null}
      {showCashFlowCalcColumn ? <col style={{ width: "9rem" }} /> : null}
      {showCashFlowTinDisplayColumn ? <col style={{ width: "9rem" }} /> : null}
      {mode === "full" ? (
        <>
          <col style={{ width: "7rem" }} />
          <col style={{ width: "7rem" }} />
        </>
      ) : null}
      {mode === "summary" ? <col style={{ width: "7rem" }} /> : null}
      <col style={{ width: "9.5rem" }} />
    </colgroup>
  )
}

export function StatementSummaryStructureThead({
  posteHeader = "Poste",
  hideAnnexColumns = false,
  annexMode,
  showDisplayFormatColumn = false,
  showCapexCostDisplayColumn = false,
  showCashFlowCalcColumn = false,
  showCashFlowTinDisplayColumn = false,
}: {
  posteHeader?: string
  hideAnnexColumns?: boolean
  annexMode?: StatementAnnexColumnMode
  showDisplayFormatColumn?: boolean
  showCapexCostDisplayColumn?: boolean
  showCashFlowCalcColumn?: boolean
  showCashFlowTinDisplayColumn?: boolean
}) {
  const mode = resolveAnnexMode(hideAnnexColumns, annexMode)
  return (
    <>
      <th
        className={cn(
          "px-6 py-4 text-left text-sm font-semibold text-slate-900",
          "min-w-0 pl-4 pr-3"
        )}
      >
        <span className="flex items-center gap-2">
          <span className="rounded-lg bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
            Libellé
          </span>
          <span className="font-semibold text-slate-800">{posteHeader}</span>
        </span>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <PanelTop className="h-4 w-4 text-slate-700" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Séparation</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-balance">
            Affiche une ligne de séparation au-dessus de cette ligne au sommaire.
          </TooltipContent>
        </Tooltip>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-300/80">
                <EyeOff className="h-4 w-4 text-slate-600" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Masquer</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-balance">
            Masque la ligne au sommaire et au détail. Désactive Code et Annexe pour cette ligne.
          </TooltipContent>
        </Tooltip>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <Hash className="h-4 w-4 text-[#E0742D]" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Code</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-balance">
            Active la modification du code de liaison. L’identifiant d’annexe est attribué automatiquement. Indisponible si la ligne est masquée.
          </TooltipContent>
        </Tooltip>
      </th>
      <th className="box-border w-[7rem] px-2 py-4 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-help flex-col items-center gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                <Link2 className="h-4 w-4 text-slate-600" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-800">Liaison</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-balance">
            Liaison : n/a, code unique, somme de codes (addition) ou différence (numérateur − dénominateur) lorsque « Code »
            est coché.
          </TooltipContent>
        </Tooltip>
      </th>
      {showDisplayFormatColumn ? (
        <th className="box-border w-[7.5rem] px-2 py-4 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <Percent className="h-4 w-4 text-slate-600" />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-slate-800">Format</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-balance">
              Format d’affichage hors Paramètres : devise ($), nombre décimal, pourcentage (ratio × 100),
              ou jours (ex. 100.25 jours).
            </TooltipContent>
          </Tooltip>
        </th>
      ) : null}
      {showCapexCostDisplayColumn ? (
        <th className="box-border w-[9rem] px-2 py-4 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-slate-800">Coût ALT</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-balance">
              Pour les codes ALT-B / C / D : afficher le solde réel ou la variation (N − N−1).
            </TooltipContent>
          </Tooltip>
        </th>
      ) : null}
      {showCashFlowCalcColumn ? (
        <th className="box-border w-[9rem] px-2 py-4 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-slate-800">Calcul</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-balance">
              Code unique seulement : Réel ou variation N − N−1. Les sommes et différences agrègent
              chaque code selon son propre mode.
            </TooltipContent>
          </Tooltip>
        </th>
      ) : null}
      {showCashFlowTinDisplayColumn ? (
        <th className="box-border w-[9rem] px-2 py-4 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-slate-800">Réel / Coût</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px] text-balance">
              Codes TIN uniquement : solde réel ou seulement les comptes marqués Coût au mapping
              (immobilisations ALT-B / C / D).
            </TooltipContent>
          </Tooltip>
        </th>
      ) : null}
      {mode === "full" ? (
        <>
          <th className="box-border w-[7rem] px-2 py-4 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    <Eye className="h-4 w-4 text-sky-600" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-slate-800">Annexe</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-balance">
                Affiche cette ligne au détail (avec liaison et lettre). Nécessite « Code » et une ligne visible.
              </TooltipContent>
            </Tooltip>
          </th>
          <th className="box-border w-[7rem] px-2 py-4 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    <BookMarked className="h-4 w-4 text-slate-600" />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-slate-800">Lettre</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-balance">
                Identifiant d’annexe attribué automatiquement selon l’ordre d’apparition dans le rapport.
              </TooltipContent>
            </Tooltip>
          </th>
        </>
      ) : null}
      {mode === "summary" ? (
        <th className="box-border w-[7rem] px-2 py-4 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help flex-col items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <Eye className="h-4 w-4 text-sky-600" />
                </span>
                <span className="text-[11px] font-semibold leading-tight text-slate-800">Annexe</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-balance">
              Affiche cette ligne au Sommaire trésorerie, avec le même calcul que dans le Détail.
            </TooltipContent>
          </Tooltip>
        </th>
      ) : null}
      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 min-w-[9.5rem]">
        Actions
      </th>
    </>
  )
}

type StructureRowCellsProps = {
  structRow: Record<string, unknown>
  globalIdx: number
  structEdit: StatementSummaryStructureEditApi
  allLiaisonCodes: string[]
  /** Code de liaison → libellé du poste, pour afficher « code — nom » dans les sélecteurs. */
  linkCodeLabels?: Map<string, string>
  /** Codes parents du plan standard (Compte de résultat ou Bilan) pour le mode « Code unique ». */
  singleModeLinkCodes?: string[]
  singleModeLinkCodeLabels?: Map<string, string>
  showSeparatorAbove: boolean
  onEditPresentation?: (globalIdx: number) => void
  /** Bilan : numéros d'annexe attribués automatiquement (1, 2, 3…) — champ en lecture seule. */
  annexIdentifierAutoAssigned?: boolean
  /** Masque les colonnes Annexe et Lettre (ex. Capex). Préférer `annexMode`. */
  hideAnnexColumns?: boolean
  /** full = Annexe+Lettre ; summary = Annexe → Sommaire (Trésorerie Détail) ; hidden = aucune. */
  annexMode?: StatementAnnexColumnMode
  /** Fonds de roulement : autorise multiplication et division. */
  allowProductQuotient?: boolean
  /**
   * Multiplicateur : Liaison = Hypothèse ou formule uniquement (pas de code unique).
   */
  hideSingleLiaisonMode?: boolean
  /** Fonds de roulement : colonne Format ($ / Nombre / %). */
  showDisplayFormatColumn?: boolean
  /** Capex : colonne Réel / Variation par ligne (coûts ALT). */
  showCapexCostDisplayColumn?: boolean
  /** Trésorerie détail : colonne Calcul (Réel / variations). */
  showCashFlowCalcColumn?: boolean
  /** Trésorerie détail : colonne Réel / Coût pour les codes TIN. */
  showCashFlowTinDisplayColumn?: boolean
}

export function StatementSummaryStructureRowCells({
  structRow,
  globalIdx,
  structEdit,
  allLiaisonCodes,
  linkCodeLabels,
  singleModeLinkCodes,
  singleModeLinkCodeLabels,
  showSeparatorAbove,
  onEditPresentation,
  annexIdentifierAutoAssigned = false,
  hideAnnexColumns = false,
  annexMode,
  allowProductQuotient = false,
  hideSingleLiaisonMode = false,
  showDisplayFormatColumn = false,
  showCapexCostDisplayColumn = false,
  showCashFlowCalcColumn = false,
  showCashFlowTinDisplayColumn = false,
}: StructureRowCellsProps) {
  const mode = resolveAnnexMode(hideAnnexColumns, annexMode)
  const isFixedTreasuryRow = isCashFlowFixedTreasuryStructureRow(structRow)
  const isCapexAutoComputed = isCapexAutoComputedRow(structRow)
  const isCapexAutoRatio = isCapexAutoRatioRow(structRow)

  return (
    <>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        {isStructureRowEmptyLabel(structRow) ? (
          <span className="text-sm text-slate-300">—</span>
        ) : (
          <div className="flex justify-center">
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
                isStructureRowHidden(structRow)
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer",
                !isStructureRowHidden(structRow) &&
                  showSeparatorAbove &&
                  "bg-slate-800/90 ring-2 ring-slate-900/40",
                !isStructureRowHidden(structRow) &&
                  !showSeparatorAbove &&
                  "bg-slate-100/60 hover:bg-slate-200/60"
              )}
            >
              <Checkbox
                checked={showSeparatorAbove}
                disabled={isStructureRowHidden(structRow)}
                onCheckedChange={(v) => {
                  if (isStructureRowHidden(structRow)) return
                  structEdit.updateRow(globalIdx, { separatorAbove: v === true })
                }}
                aria-label="Séparation : trait au-dessus"
                className="border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
              />
            </label>
          </div>
        )}
      </td>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        <div className="flex justify-center">
          <label
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-xl p-1.5 transition-colors",
              isStructureRowHidden(structRow)
                ? "bg-slate-200/80 ring-2 ring-slate-400/35"
                : "bg-slate-100/60 hover:bg-slate-200/60"
            )}
          >
            <Checkbox
                checked={isStructureRowHidden(structRow)}
                disabled={isStructureRowHidden(structRow) || isFixedTreasuryRow}
                onCheckedChange={(v) => {
                if (v === true) {
                  structEdit.updateRow(globalIdx, {
                    hidden: true,
                    defineMapping: false,
                    showInDetail: false,
                    linkCode: undefined,
                    annexLetter: undefined,
                    liaisonMode: undefined,
                    liaisonSumCodes: undefined,
                    liaisonNumeratorCodes: undefined,
                    liaisonDenominatorCodes: undefined,
                    separatorAbove: undefined,
                  })
                } else {
                  structEdit.updateRow(globalIdx, { hidden: false })
                }
              }}
              aria-label="Masquer la ligne au sommaire"
              className="border-slate-300 data-[state=checked]:border-slate-700 data-[state=checked]:bg-slate-700"
            />
          </label>
        </div>
      </td>
      <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
        {isStructureRowEmptyLabel(structRow) ? (
          <span className="text-sm text-slate-300">—</span>
        ) : (
          <div className="flex justify-center">
            <label
              className={cn(
                "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                isStructureRowHidden(structRow) || isCapexAutoComputed
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer",
                !isStructureRowHidden(structRow) &&
                  isCodeMappingEnabled(structRow) &&
                  !isCapexAutoComputed &&
                  "bg-orange-50/90 ring-2 ring-[#E0742D]/35",
                !isStructureRowHidden(structRow) &&
                  !isCodeMappingEnabled(structRow) &&
                  !isCapexAutoComputed &&
                  "bg-slate-100/60 hover:bg-slate-200/60"
              )}
            >
              <Checkbox
                checked={isCodeMappingEnabled(structRow)}
                disabled={isStructureRowHidden(structRow) || isFixedTreasuryRow || isCapexAutoComputed}
                onCheckedChange={(v) => {
                  if (isStructureRowHidden(structRow) || isCapexAutoComputed) return
                  if (v === true) {
                    if (hideSingleLiaisonMode) {
                      structEdit.updateRow(globalIdx, {
                        defineMapping: true,
                        liaisonMode: "na",
                        linkCode: undefined,
                      })
                    } else {
                      structEdit.updateRow(globalIdx, {
                        defineMapping: true,
                        ...(normalizeLiaisonMode(structRow) === "na"
                          ? { liaisonMode: "single" }
                          : {}),
                      })
                    }
                  } else {
                    structEdit.updateRow(globalIdx, {
                      defineMapping: false,
                      showInDetail: false,
                      linkCode: undefined,
                      annexLetter: undefined,
                      liaisonMode: undefined,
                      liaisonSumCodes: undefined,
                      liaisonNumeratorCodes: undefined,
                      liaisonDenominatorCodes: undefined,
                      cashFlowCalcMode: undefined,
                      cashFlowTinDisplayMode: undefined,
                    })
                  }
                }}
                aria-label="Code : liaison et lettre modifiables"
                className="border-slate-300 data-[state=checked]:border-[#E0742D] data-[state=checked]:bg-[#E0742D]"
              />
            </label>
          </div>
        )}
      </td>
      <td className="box-border min-w-[8.5rem] max-w-[10rem] px-2 py-2.5 align-middle">
        {isFixedTreasuryRow ? (
          <span
            className="block truncate rounded-lg bg-slate-100/80 px-1.5 py-2 text-center text-[11px] font-medium leading-snug text-slate-600"
            title="Calcul automatique — non modifiable"
          >
            {isCashFlowEndingCashStructureRow(structRow)
              ? "Variation + début"
              : "ACT-A − PCT-A (N−1)"}
          </span>
        ) : isCapexAutoComputed && !isStructureRowHidden(structRow) ? (
          <span
            className="block truncate rounded-lg bg-emerald-50/80 px-1.5 py-2 text-center text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200/70"
            title="Calcul automatique — non modifiable"
          >
            {capexAutoRatioLiaisonLabel(structRow)}
          </span>
        ) : isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
          <IncomeStatementLiaisonCell
            structRow={structRow}
            rowIndex={globalIdx}
            allLinkCodes={allLiaisonCodes}
            linkCodeLabels={linkCodeLabels}
            singleModeLinkCodes={singleModeLinkCodes}
            singleModeLinkCodeLabels={singleModeLinkCodeLabels}
            updateRow={structEdit.updateRow}
            allowProductQuotient={allowProductQuotient}
            hideSingleLiaisonMode={hideSingleLiaisonMode}
          />
        ) : (
          <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
            —
          </span>
        )}
      </td>
      {showCashFlowCalcColumn ? (
        <td className="box-border w-[9rem] px-2 py-2.5 align-middle">
          {isStructureRowEmptyLabel(structRow) ||
          isStructureRowHidden(structRow) ||
          !structureRowShowsCashFlowCalcSelector(structRow) ? (
            <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
              —
            </span>
          ) : (
            <Select
              value={readRowCashFlowCalcMode(structRow)}
              onValueChange={(v) =>
                structEdit.updateRow(globalIdx, {
                  cashFlowCalcMode: v as CashFlowCalcMode,
                })
              }
            >
              <SelectTrigger
                className="h-9 w-full rounded-xl border-slate-200/90 text-xs shadow-sm focus:border-[#E0742D]/50 focus:ring-2 focus:ring-[#E0742D]/20"
                aria-label="Mode de calcul"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Réel</SelectItem>
                <SelectItem value="variation_nn1">Variations N − N−1</SelectItem>
                <SelectItem value="variation_n1n">N−1 − N</SelectItem>
              </SelectContent>
            </Select>
          )}
        </td>
      ) : null}
      {showCashFlowTinDisplayColumn ? (
        <td className="box-border w-[9rem] px-2 py-2.5 align-middle">
          {isStructureRowEmptyLabel(structRow) ||
          isStructureRowHidden(structRow) ||
          !structureRowShowsCashFlowTinDisplaySelector(structRow) ? (
            <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
              —
            </span>
          ) : (
            <Select
              value={readRowCashFlowTinDisplayMode(structRow)}
              onValueChange={(v) =>
                structEdit.updateRow(globalIdx, {
                  cashFlowTinDisplayMode: v as CashFlowTinDisplayMode,
                })
              }
            >
              <SelectTrigger
                className="h-9 w-full rounded-xl border-slate-200/90 text-xs shadow-sm focus:border-[#E0742D]/50 focus:ring-2 focus:ring-[#E0742D]/20"
                aria-label="Affichage réel ou coût TIN"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Réel</SelectItem>
                <SelectItem value="cost">Coût</SelectItem>
              </SelectContent>
            </Select>
          )}
        </td>
      ) : null}
      {showDisplayFormatColumn ? (
        <td className="box-border w-[7.5rem] px-2 py-2.5 align-middle">
          {isStructureRowEmptyLabel(structRow) || isStructureRowHidden(structRow) ? (
            <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
              —
            </span>
          ) : isCapexAutoComputed ? (
            <span className="block truncate rounded-lg bg-slate-100/80 px-1.5 py-2 text-center text-xs font-medium text-slate-600">
              {isCapexAutoRatio ? "%" : "$"}
            </span>
          ) : (
            <Select
              value={resolveWorkingCapitalDisplayFormat(structRow)}
              onValueChange={(v) =>
                structEdit.updateRow(globalIdx, {
                  displayFormat: v as WorkingCapitalDisplayFormat,
                })
              }
            >
              <SelectTrigger
                className="h-9 w-full rounded-xl border-slate-200/90 text-xs shadow-sm focus:border-[#E0742D]/50 focus:ring-2 focus:ring-[#E0742D]/20"
                aria-label="Format d'affichage"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currency">$</SelectItem>
                <SelectItem value="number">Nombre</SelectItem>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="days">Jours</SelectItem>
              </SelectContent>
            </Select>
          )}
        </td>
      ) : null}
      {showCapexCostDisplayColumn ? (
        <td className="box-border w-[9rem] px-2 py-2.5 align-middle">
          {isStructureRowEmptyLabel(structRow) ||
          isStructureRowHidden(structRow) ||
          !structureRowShowsCapexCostDisplaySelector(structRow) ? (
            <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
              —
            </span>
          ) : (
            <Select
              value={readRowCapexCostDisplayMode(structRow)}
              onValueChange={(v) =>
                structEdit.updateRow(globalIdx, {
                  capexCostDisplayMode: v as CapexCostDisplayMode,
                })
              }
            >
              <SelectTrigger
                className="h-9 w-full rounded-xl border-slate-200/90 text-xs shadow-sm focus:border-[#E0742D]/50 focus:ring-2 focus:ring-[#E0742D]/20"
                aria-label="Affichage du coût ALT"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Réel</SelectItem>
                <SelectItem value="variation">Variation (N − N−1)</SelectItem>
              </SelectContent>
            </Select>
          )}
        </td>
      ) : null}
      {mode === "full" ? (
        <>
          <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
            {isStructureRowEmptyLabel(structRow) ? (
              <span className="text-sm text-slate-300">—</span>
            ) : (
              <div className="flex justify-center">
                <label
                  className={cn(
                    "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                    isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer",
                    !isStructureRowHidden(structRow) &&
                      isCodeMappingEnabled(structRow) &&
                      isShowInDetail(structRow) &&
                      "bg-sky-50/90 ring-2 ring-sky-400/40",
                    !isStructureRowHidden(structRow) &&
                      isCodeMappingEnabled(structRow) &&
                      !isShowInDetail(structRow) &&
                      "bg-slate-100/60 hover:bg-slate-200/60"
                  )}
                >
                  <Checkbox
                    checked={isShowInDetail(structRow)}
                    disabled={isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)}
                    onCheckedChange={(v) => {
                      if (isStructureRowHidden(structRow) || !isCodeMappingEnabled(structRow)) return
                      structEdit.setShowInDetail(globalIdx, v === true)
                    }}
                    aria-label="Annexe : afficher au détail"
                    className="border-slate-300 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                  />
                </label>
              </div>
            )}
          </td>
          <td className="box-border w-[7rem] min-w-0 px-2 py-2.5 align-middle">
            {isCodeMappingEnabled(structRow) && !isStructureRowHidden(structRow) ? (
              <Input
                value={String(structRow.annexLetter ?? "")}
                disabled={!isAnnexLetterInputEditable(structRow)}
                onChange={(e) =>
                  structEdit.updateRow(globalIdx, {
                    annexLetter: normalizeAnnexLetter(e.target.value) || undefined,
                  })
                }
                placeholder="A"
                title={
                  !isAnnexLetterInputEditable(structRow)
                    ? "Identifiant attribué automatiquement selon l’ordre d’apparition de l’annexe dans le rapport."
                    : undefined
                }
                className={cn(
                  "h-9 w-full min-w-0 rounded-xl border-slate-200/90 px-2 text-center text-xs font-bold uppercase tracking-widest shadow-sm focus-visible:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/25",
                  isAnnexLetterInputEditable(structRow) ? "bg-white" : "cursor-not-allowed bg-slate-100/80 text-slate-400"
                )}
                maxLength={8}
              />
            ) : (
              <span className="block truncate rounded-lg bg-slate-100/50 px-1.5 py-2 text-center text-sm text-slate-300">
                —
              </span>
            )}
          </td>
        </>
      ) : null}
      {mode === "summary" ? (
        <td className="box-border w-[7rem] px-2 py-2.5 align-middle text-center">
          {isStructureRowEmptyLabel(structRow) ? (
            <span className="text-sm text-slate-300">—</span>
          ) : (
            <div className="flex justify-center">
              <label
                className={cn(
                  "flex items-center justify-center rounded-xl p-1.5 transition-colors",
                  isStructureRowHidden(structRow)
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer",
                  !isStructureRowHidden(structRow) &&
                    isShowInSummary(structRow) &&
                    "bg-sky-50/90 ring-2 ring-sky-400/40",
                  !isStructureRowHidden(structRow) &&
                    !isShowInSummary(structRow) &&
                    "bg-slate-100/60 hover:bg-slate-200/60",
                )}
              >
                <Checkbox
                  checked={isShowInSummary(structRow)}
                  disabled={isStructureRowHidden(structRow)}
                  onCheckedChange={(v) => {
                    if (isStructureRowHidden(structRow)) return
                    structEdit.updateRow(globalIdx, { showInSummary: v === true })
                  }}
                  aria-label="Annexe : afficher au sommaire"
                  className="border-slate-300 data-[state=checked]:border-sky-600 data-[state=checked]:bg-sky-600"
                />
              </label>
            </div>
          )}
        </td>
      ) : null}
      <td className="px-2 py-2 text-center align-middle">
        <div className="flex items-center justify-center gap-0.5">
          {structEdit.moveStructureRow ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
                title="Monter la ligne"
                onClick={() => structEdit.moveStructureRow?.(globalIdx, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
                title="Descendre la ligne"
                onClick={() => structEdit.moveStructureRow?.(globalIdx, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          {onEditPresentation && !isStructureRowEmptyLabel(structRow) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-[#E0742D]"
              title="Modifier le poste (niveau, gras)"
              onClick={() => onEditPresentation(globalIdx)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {structEdit.canRemoveRowAt(globalIdx) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
              title="Supprimer la ligne"
              onClick={() => structEdit.removeStructureRowAt(globalIdx)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </td>
    </>
  )
}
