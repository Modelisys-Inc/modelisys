"use client"

import { Fragment, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Loader2, PanelTop, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useStatementStructureEdit,
  type StatementStructureEditKind,
} from "@/hooks/use-income-statement-structure-edit"
import { useStatementSummaryStructureDialogs } from "@/hooks/use-statement-summary-structure-dialogs"
import { useIncomeStatementParentLinkCodes } from "@/hooks/use-income-statement-parent-link-codes"
import { useBalanceSheetParentLinkCodes } from "@/hooks/use-balance-sheet-parent-link-codes"
import { useCashFlowCategoryLinkCodes } from "@/hooks/use-cash-flow-category-link-codes"
import { useWorkingCapitalLinkCodes } from "@/hooks/use-working-capital-link-codes"
import {
  StatementSummaryStructureColgroup,
  StatementSummaryStructureThead,
  StatementSummaryStructureRowCells,
} from "@/components/statement-summary-structure-shared"
import { StatementSummaryStructureDialogs } from "@/components/statement-summary-structure-dialogs"
import {
  collectDistinctLinkCodesFromStructure,
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isTruthySeparatorAbove,
  mapLinkCodesToOwnerLabel,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  collectWorkingCapitalFormulaRefCodes,
  workingCapitalRowRefCode,
} from "@/lib/working-capital-structure-utils"

const SUMMARY_STRUCTURE_COLUMN_COUNT = 8
const SUMMARY_STRUCTURE_COLUMN_COUNT_NO_ANNEX = 6
const SUMMARY_STRUCTURE_COLUMN_COUNT_WC = 7

interface StatementStructureStudioToolbarProps {
  companyId: string
  structEdit: ReturnType<typeof useStatementStructureEdit>
  onAddSpaceClick: () => void
  onAddPostClick: () => void
  onSaved?: () => void
  onClose: () => void
  className?: string
}

/** Barre d’actions édition structure (Ajouter / Annuler / Enregistrer). */
export function StatementStructureStudioToolbar({
  companyId,
  structEdit,
  onAddSpaceClick,
  onAddPostClick,
  onSaved,
  onClose,
  className,
}: StatementStructureStudioToolbarProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
        disabled={structEdit.loading}
        title="Insérer une ligne vide au-dessus ou en dessous d’un poste du sommaire"
        onClick={onAddSpaceClick}
      >
        <PanelTop className="h-4 w-4 text-[#E0742D]" />
        Ajouter un espace
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 rounded-xl text-[#2A2F3A] hover:bg-slate-100"
        disabled={structEdit.loading}
        title="Choisir au-dessus de quel poste insérer le nouveau poste"
        onClick={onAddPostClick}
      >
        <Plus className="h-4 w-4 text-[#E0742D]" />
        Ajouter un poste
      </Button>
      <Separator orientation="vertical" className="hidden h-7 sm:block" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-xl text-[#5C5F66] hover:bg-slate-100"
        disabled={structEdit.saving}
        onClick={() => {
          structEdit.discard()
          void structEdit.reload()
          onClose()
        }}
      >
        Annuler
      </Button>
      <Button
        type="button"
        size="sm"
        className="rounded-xl bg-[#E0742D] px-4 font-semibold text-white shadow-sm hover:bg-[#c96526] disabled:opacity-60"
        disabled={structEdit.saving || structEdit.loading || !companyId}
        onClick={async () => {
          const ok = await structEdit.save()
          if (ok) {
            onSaved?.()
            structEdit.discard()
            void structEdit.reload()
            onClose()
          }
        }}
      >
        {structEdit.saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          "Enregistrer"
        )}
      </Button>
    </div>
  )
}

interface StatementStructureStudioProps {
  companyId: string
  statementType: StatementStructureEditKind
  /** Called after a successful save (parent bumps its structureVersion). */
  onSaved?: () => void
  /** Called to leave edit mode (Annuler, or after a successful save). */
  onClose: () => void
  /** Intégré dans une carte dashboard (sans bordure/shadow propre). */
  embedded?: boolean
  /** Masque la barre d’actions (fournie par le parent, ex. en-tête Sommaire). */
  hideToolbar?: boolean
  /** Masque les colonnes Annexe et Lettre (ex. Trésorerie Détail). */
  hideAnnexColumns?: boolean
}

export function StatementStructureStudio({
  companyId,
  statementType,
  onSaved,
  onClose,
  embedded = false,
  hideToolbar = false,
  hideAnnexColumns = false,
}: StatementStructureStudioProps) {
  const structEdit = useStatementStructureEdit(companyId, true, statementType)
  const dialogs = useStatementSummaryStructureDialogs(structEdit)
  const isIncomeStatement = statementType === "income-statement"
  const isBalanceSheet = statementType === "balance-sheet"
  const isCashFlow = statementType === "cash-flow" || statementType === "cash-flow-detail"
  const isWorkingCapital = statementType === "working-capital"
  const isCapex = statementType === "capex"
  const isLinkCodeAnalysis = isWorkingCapital || isCapex
  const { codes: incomeParentLinkCodes, labels: incomeParentLinkLabels } =
    useIncomeStatementParentLinkCodes(isIncomeStatement)
  const { codes: balanceParentLinkCodes, labels: balanceParentLinkLabels } =
    useBalanceSheetParentLinkCodes(isBalanceSheet)
  const { codes: cashFlowCategoryLinkCodes, labels: cashFlowCategoryLinkLabels } =
    useCashFlowCategoryLinkCodes(isCashFlow)
  const { codes: workingCapitalLinkCodes, labels: workingCapitalLinkLabels } =
    useWorkingCapitalLinkCodes(isLinkCodeAnalysis)
  const singleModeLinkCodes = isIncomeStatement
    ? incomeParentLinkCodes
    : isBalanceSheet
      ? balanceParentLinkCodes
      : isCashFlow
        ? cashFlowCategoryLinkCodes
        : isLinkCodeAnalysis
          ? workingCapitalLinkCodes
          : undefined
  const singleModeLinkCodeLabels = isIncomeStatement
    ? incomeParentLinkLabels
    : isBalanceSheet
      ? balanceParentLinkLabels
      : isCashFlow
        ? cashFlowCategoryLinkLabels
        : isLinkCodeAnalysis
          ? workingCapitalLinkLabels
          : undefined

  const displayIndices = structEdit.summaryStructureDisplayIndices
  const wcFormulaRefs = useMemo(() => {
    if (!isLinkCodeAnalysis) return { codes: [] as string[], labels: new Map<string, string>() }
    return collectWorkingCapitalFormulaRefCodes(structEdit.structure)
  }, [isLinkCodeAnalysis, structEdit.structure])
  const allLiaisonCodes = useMemo(() => {
    const base = collectDistinctLinkCodesFromStructure(structEdit.structure)
    if (!isLinkCodeAnalysis || wcFormulaRefs.codes.length === 0) return base
    return [...new Set([...base, ...wcFormulaRefs.codes])].sort((a, b) =>
      a.localeCompare(b, "fr", { numeric: true }),
    )
  }, [isLinkCodeAnalysis, structEdit.structure, wcFormulaRefs.codes])
  const linkCodeLabels = useMemo(() => {
    const map = mapLinkCodesToOwnerLabel(structEdit.structure)
    if (isLinkCodeAnalysis) {
      for (const [code, label] of wcFormulaRefs.labels) {
        if (!map.has(code)) map.set(code, label)
      }
    }
    return map
  }, [isLinkCodeAnalysis, structEdit.structure, wcFormulaRefs.labels])

  const annexIdentifierAutoAssigned = isBalanceSheet
  const showDisplayFormatColumn = isLinkCodeAnalysis
  const structureColumnCount = showDisplayFormatColumn
    ? SUMMARY_STRUCTURE_COLUMN_COUNT_WC
    : hideAnnexColumns
      ? SUMMARY_STRUCTURE_COLUMN_COUNT_NO_ANNEX
      : SUMMARY_STRUCTURE_COLUMN_COUNT

  return (
    <div
      className={cn(
        embedded ? "min-w-0" : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      )}
    >
      {!hideToolbar ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50/80 p-2">
          <StatementStructureStudioToolbar
            companyId={companyId}
            structEdit={structEdit}
            onAddSpaceClick={dialogs.openAddSpaceDialog}
            onAddPostClick={dialogs.openAddPostDialog}
            onSaved={onSaved}
            onClose={onClose}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </div>
      ) : null}

      {structEdit.loading && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-center text-sm text-slate-600">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-[#E0742D]" />
          Chargement de la structure…
        </div>
      )}
      {structEdit.error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-center text-sm text-red-700">
          {structEdit.error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <StatementSummaryStructureColgroup
            hideAnnexColumns={hideAnnexColumns}
            showDisplayFormatColumn={showDisplayFormatColumn}
          />
          <thead className="bg-slate-50/70">
            <tr>
              <StatementSummaryStructureThead
                posteHeader="Poste"
                hideAnnexColumns={hideAnnexColumns}
                showDisplayFormatColumn={showDisplayFormatColumn}
              />
            </tr>
          </thead>
          <tbody>
            {displayIndices.length === 0 && !structEdit.loading ? (
              <tr>
                <td
                  colSpan={structureColumnCount}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  Aucun poste dans la structure. Utilisez « Ajouter un poste » ou « Ajouter un espace » pour commencer.
                </td>
              </tr>
            ) : null}
            {displayIndices.map((globalIdx, idx) => {
              const structRow = structEdit.structure[globalIdx]!
              const rowKey = String(structRow.id ?? `row-${globalIdx}`)
              const isEmpty = isStructureRowEmptyLabel(structRow)
              const isBoldRow = structRow.isBold === true
              const liaisonMode = normalizeLiaisonMode(structRow)
              const isLabelLockedBySingleLinkCode =
                isCodeMappingEnabled(structRow) &&
                !!String(structRow.linkCode ?? "").trim() &&
                liaisonMode === "single"
              const showSeparatorAbove = isTruthySeparatorAbove(structRow.separatorAbove)
              const rowLiaisonCodes =
                isLinkCodeAnalysis
                  ? allLiaisonCodes.filter((c) => c !== workingCapitalRowRefCode(structRow))
                  : allLiaisonCodes
              return (
                <Fragment key={rowKey}>
                  {showSeparatorAbove && (
                    <tr aria-hidden>
                      <td
                        colSpan={structureColumnCount}
                        className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                      />
                    </tr>
                  )}
                  <tr
                    className={cn(
                      "border-b border-b-slate-200 hover:bg-slate-100/70",
                      isEmpty && "h-2",
                      idx % 2 === 1 && !isEmpty && "bg-slate-50/50"
                    )}
                  >
                    <td className="min-w-0 px-3 py-3 pl-4">
                      {isEmpty ? (
                        <span className="inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-400">
                          Ligne vide — renommez ou supprimez
                        </span>
                      ) : (
                        <Input
                          value={String(structRow.label ?? "")}
                          disabled={isLabelLockedBySingleLinkCode}
                          readOnly={isLabelLockedBySingleLinkCode}
                          onChange={(e) => structEdit.updateRow(globalIdx, { label: e.target.value })}
                          title={
                            isLabelLockedBySingleLinkCode
                              ? "Libellé défini par le code de liaison sélectionné."
                              : undefined
                          }
                          className={cn(
                            "h-9 w-full max-w-full rounded-xl border-slate-200/90 bg-white text-sm shadow-sm focus-visible:border-[#E0742D]/50 focus-visible:ring-2 focus-visible:ring-[#E0742D]/20",
                            isBoldRow ? "font-semibold" : "font-normal",
                            isLabelLockedBySingleLinkCode &&
                              "cursor-not-allowed bg-slate-50 text-slate-700 opacity-100"
                          )}
                        />
                      )}
                    </td>
                    <StatementSummaryStructureRowCells
                      structRow={structRow}
                      globalIdx={globalIdx}
                      structEdit={structEdit}
                      allLiaisonCodes={rowLiaisonCodes}
                      linkCodeLabels={linkCodeLabels}
                      singleModeLinkCodes={singleModeLinkCodes}
                      singleModeLinkCodeLabels={singleModeLinkCodeLabels}
                      showSeparatorAbove={showSeparatorAbove}
                      onEditPresentation={dialogs.beginEditPostPresentation}
                      annexIdentifierAutoAssigned={annexIdentifierAutoAssigned}
                      hideAnnexColumns={hideAnnexColumns}
                      allowProductQuotient={isLinkCodeAnalysis}
                      showDisplayFormatColumn={showDisplayFormatColumn}
                    />
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <StatementSummaryStructureDialogs structEdit={structEdit} dialogs={dialogs} idPrefix="studio" />
    </div>
  )
}
