"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiError, getStatementStructure, upsertStatementStructure, type StandardLinkCode } from "@/lib/api"
import type { StatementType } from "@/lib/api"
import {
  cloneStructure,
  findChargeLineRange,
  findStructureInsertIndexAfterAnnexContiguousBlock,
  isCodeMappingEnabled,
  isComputedNetIncomeStructureRow,
  isDetailParamsDtCtRequired,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  autoHideIncomeStatementSummaryRowPatch,
  normalizeAnnexLetter,
  newBalanceSheetPostRow,
  newChargeRow,
  newDetailSubLineRow,
  newEmptySpacerCashFlowSummaryRow,
  newEmptySpacerSummaryRow,
  normalizeCodeList,
  normalizeDtCt,
  normalizeLiaisonMode,
  renumberAnnexesByAppearance,
  stripObsoleteIncomeStatementStructureRows,
  syncIncomeStatementDetailSubLinesFromStandard,
  validateDuplicatePrimaryLinkCodes,
} from "@/lib/income-statement-structure-utils"
import type { AnnexScheme } from "@/lib/income-statement-structure-utils"
import {
  ensureBalanceSheetValidationStructure,
  isBalanceSheetValidationStructureRow,
} from "@/lib/balance-sheet-validation"
import {
  isCapexSettingsStructureRow,
  normalizeCapexStructure,
} from "@/lib/capex-analysis-settings"

export type StatementStructureEditKind = Extract<
  StatementType,
  "income-statement" | "balance-sheet" | "cash-flow" | "cash-flow-detail" | "working-capital" | "capex" | "ratios"
>

export function useStatementStructureEdit(
  companyId: string | null | undefined,
  active: boolean,
  statementType: StatementStructureEditKind
) {
  const [structure, setStructure] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chargeRange = useMemo(
    () => (statementType === "income-statement" ? findChargeLineRange(structure) : null),
    [structure, statementType]
  )

  /** Schéma d'identifiant d'annexe : nombres pour le bilan, lettres sinon. */
  const annexScheme: AnnexScheme = useMemo(
    () => (statementType === "balance-sheet" ? "number" : "letter"),
    [statementType]
  )

  /** Indices globaux pour la grille Paramètres Sommaire (sans `detailOnly`, Validation, ni CAP-C.1). */
  const summaryStructureDisplayIndices = useMemo(
    () =>
      structure
        .map((r, i) =>
          !isStructureRowDetailOnly(r) &&
          !isComputedNetIncomeStructureRow(r) &&
          !(statementType === "balance-sheet" && isBalanceSheetValidationStructureRow(r)) &&
          !(statementType === "capex" && isCapexSettingsStructureRow(r))
            ? i
            : -1,
        )
        .filter((i) => i >= 0),
    [structure, statementType]
  )

  const finalizeStructure = useCallback(
    (rows: Record<string, unknown>[]) => {
      return renumberAnnexesByAppearance(rows, annexScheme)
    },
    [annexScheme]
  )

  const load = useCallback(async () => {
    if (!companyId || !active) return
    setLoading(true)
    setError(null)
    try {
      const data = await getStatementStructure(companyId, statementType)
      const raw = cloneStructure(data.structure ?? [])
      const cleaned =
        statementType === "income-statement"
          ? stripObsoleteIncomeStatementStructureRows(raw)
          : statementType === "balance-sheet"
            ? ensureBalanceSheetValidationStructure(raw)
            : statementType === "capex"
              ? normalizeCapexStructure(raw)
              : raw
      // Normaliser les identifiants d'annexe selon l'ordre d'apparition dès le
      // chargement : les structures anciennes (identifiants désordonnés) sont
      // corrigées en mémoire et le champ « Lettre » (lecture seule) est exact.
      setStructure(renumberAnnexesByAppearance(cleaned, annexScheme))
    } catch (e) {
      console.error(e)
      setError("Impossible de charger la structure.")
      setStructure([])
    } finally {
      setLoading(false)
    }
  }, [companyId, active, statementType, annexScheme])

  useEffect(() => {
    if (active && companyId) void load()
  }, [active, companyId, load])

  const updateRow = useCallback(
    (index: number, patch: Record<string, unknown>) => {
      setStructure((prev) => {
        const next = cloneStructure(prev)
        if (!next[index]) return prev
        next[index] = { ...next[index], ...patch }
        return finalizeStructure(next)
      })
    },
    [finalizeStructure]
  )

  /**
   * Bascule la case « Annexe » d'une ligne, puis renumérote toutes les annexes
   * selon leur ordre d'apparition dans le rapport (et non l'ordre de cochage).
   * À l'activation : `showInDetail = true` ; l'identifiant est attribué par la
   * renumérotation. À la désactivation : efface lettre et nature, supprime les
   * sous-lignes `detailOnly` contiguës (sinon orphelines), puis renumérote pour
   * que les annexes restantes soient sans trou.
   */
  const setShowInDetail = useCallback(
    (index: number, checked: boolean) => {
      setStructure((prev) => {
        if (!prev[index]) return prev
        const next = cloneStructure(prev)
        const row = next[index]
        if (checked) {
          row.showInDetail = true
        } else {
          row.showInDetail = false
          row.annexLetter = undefined
          row.posteNature = undefined
          // Retirer les sous-lignes détail contiguës de cette annexe désactivée.
          while (index + 1 < next.length && isStructureRowDetailOnly(next[index + 1]!)) {
            next.splice(index + 1, 1)
          }
        }
        return renumberAnnexesByAppearance(next, annexScheme)
      })
    },
    [annexScheme]
  )

  const newPostRow = useCallback(
    (opts?: { indent?: boolean; isBold?: boolean }) =>
      statementType === "income-statement"
        ? newChargeRow(opts)
        : newBalanceSheetPostRow(opts),
    [statementType]
  )

  const insertPostAbove = useCallback(
    (globalIndex: number, opts?: { indent?: boolean; isBold?: boolean }) => {
      setStructure((prev) => {
        if (globalIndex < 0) return prev
        const indent = opts?.indent ?? true
        const isBold = opts?.isBold ?? false
        const row = newPostRow({ indent, isBold })
        if (prev.length === 0) {
          return globalIndex === 0 ? [row] : prev
        }
        if (globalIndex < 0 || globalIndex >= prev.length) return prev
        const next = cloneStructure(prev)
        next.splice(globalIndex, 0, row)
        return next
      })
    },
    [newPostRow]
  )

  const insertPostBelow = useCallback(
    (globalIndex: number, opts?: { indent?: boolean; isBold?: boolean }) => {
      setStructure((prev) => {
        if (globalIndex < 0) return prev
        const indent = opts?.indent ?? true
        const isBold = opts?.isBold ?? false
        const row = newPostRow({ indent, isBold })
        if (prev.length === 0) {
          return globalIndex === 0 ? [row] : prev
        }
        if (globalIndex < 0 || globalIndex >= prev.length) return prev
        const insertAt = globalIndex + 1
        const next = cloneStructure(prev)
        next.splice(insertAt, 0, row)
        return next
      })
    },
    [newPostRow]
  )

  const insertEmptySpacerAbove = useCallback(
    (globalIndex: number, opts?: { summaryOnly?: boolean }) => {
      setStructure((prev) => {
        if (globalIndex < 0) return prev
        const spacer = opts?.summaryOnly
          ? newEmptySpacerCashFlowSummaryRow()
          : newEmptySpacerSummaryRow()
        if (prev.length === 0) {
          return globalIndex === 0 ? [spacer] : prev
        }
        if (globalIndex < 0 || globalIndex >= prev.length) return prev
        const next = cloneStructure(prev)
        next.splice(globalIndex, 0, spacer)
        return next
      })
    },
    [],
  )

  const insertEmptySpacerBelow = useCallback(
    (globalIndex: number, opts?: { summaryOnly?: boolean }) => {
      setStructure((prev) => {
        if (globalIndex < 0) return prev
        const spacer = opts?.summaryOnly
          ? newEmptySpacerCashFlowSummaryRow()
          : newEmptySpacerSummaryRow()
        if (prev.length === 0) {
          return globalIndex === 0 ? [spacer] : prev
        }
        if (globalIndex < 0 || globalIndex >= prev.length) return prev
        const insertAt = globalIndex + 1
        const next = cloneStructure(prev)
        next.splice(insertAt, 0, spacer)
        return next
      })
    },
    [],
  )

  const addDetailSubLine = useCallback(
    (
      annexLetter: string,
      fields: { label: string; linkCode: string; dtCt: "DT" | "CT" }
    ) => {
      setStructure((prev) => {
        const next = cloneStructure(prev)
        const at = findStructureInsertIndexAfterAnnexContiguousBlock(next, annexLetter)
        if (at < 0) return prev
        next.splice(
          at + 1,
          0,
          newDetailSubLineRow(annexLetter, {
            label: fields.label,
            linkCode: fields.linkCode,
            dtCt: fields.dtCt,
          })
        )
        return next
      })
    },
    []
  )

  const canRemoveRowAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= structure.length) return false
      return !!structure[index]
    },
    [structure]
  )

  const removeStructureRowAt = useCallback(
    (index: number) => {
      setStructure((prev) => {
        if (index < 0 || index >= prev.length) return prev
        const row = prev[index]
        if (!row) return prev
        const next = cloneStructure(prev)
        next.splice(index, 1)
        return finalizeStructure(next)
      })
    },
    [finalizeStructure]
  )

  const moveStructureRow = useCallback(
    (index: number, direction: -1 | 1) => {
      setStructure((prev) => {
        const target = index + direction
        if (index < 0 || index >= prev.length || target < 0 || target >= prev.length) return prev
        const next = cloneStructure(prev)
        const [row] = next.splice(index, 1)
        if (!row) return prev
        next.splice(target, 0, row)
        return finalizeStructure(next)
      })
    },
    [finalizeStructure]
  )

  const applyDetailSubLinesFromStandard = useCallback((standardCodes: StandardLinkCode[]) => {
    if (statementType !== "income-statement" && statementType !== "balance-sheet") return
    setStructure((prev) => {
      const synced = syncIncomeStatementDetailSubLinesFromStandard(prev, standardCodes)
      return JSON.stringify(synced) === JSON.stringify(prev) ? prev : synced
    })
  }, [statementType])

  const hideSummaryRowAt = useCallback(
    (index: number) => {
      setStructure((prev) => {
        if (!prev[index]) return prev
        const next = cloneStructure(prev)
        const row = next[index]!
        const letter = normalizeAnnexLetter(String(row.annexLetter ?? ""))
        const hidePatch = {
          hidden: true,
          defineMapping: false,
          showInDetail: false,
          linkCode: undefined,
          annexLetter: undefined,
          posteNature: undefined,
          liaisonMode: undefined,
          liaisonSumCodes: undefined,
          liaisonNumeratorCodes: undefined,
          liaisonDenominatorCodes: undefined,
          separatorAbove: undefined,
        }
        next[index] = { ...row, ...hidePatch }
        if (letter) {
          for (let i = 0; i < next.length; i++) {
            if (i === index) continue
            const sub = next[i]
            if (!sub || !isStructureRowDetailOnly(sub)) continue
            if (normalizeAnnexLetter(String(sub.annexLetter ?? "")) !== letter) continue
            next[i] = { ...sub, ...autoHideIncomeStatementSummaryRowPatch() }
          }
        }
        return finalizeStructure(next)
      })
    },
    [finalizeStructure]
  )

  const save = useCallback(async () => {
    if (!companyId) return false
    setSaving(true)
    setError(null)
    try {
      const normalized = structure.map((r) => {
        if (isStructureRowHidden(r)) {
          const hasLink = String(r.linkCode ?? "").trim() !== ""
          return {
            ...r,
            defineMapping: false,
            showInDetail: false,
            ...(hasLink
              ? {}
              : {
                  linkCode: undefined,
                  liaisonMode: undefined,
                  liaisonSumCodes: undefined,
                  liaisonNumeratorCodes: undefined,
                  liaisonDenominatorCodes: undefined,
                }),
          }
        }
        return r
      })
      const cleaned =
        statementType === "income-statement"
          ? stripObsoleteIncomeStatementStructureRows(normalized)
          : statementType === "balance-sheet"
            ? ensureBalanceSheetValidationStructure(normalized)
            : statementType === "capex"
              ? normalizeCapexStructure(normalized)
              : normalized
      // Renuméroter les annexes selon l'ordre d'apparition avant validation /
      // sauvegarde : chaque annexe possède donc déjà un identifiant.
      const toSave = renumberAnnexesByAppearance(cleaned, annexScheme)
      const duplicateMsg = validateDuplicatePrimaryLinkCodes(toSave)
      if (duplicateMsg) {
        setError(duplicateMsg)
        setSaving(false)
        return false
      }
      for (let i = 0; i < toSave.length; i++) {
        const r = toSave[i]
        if (isStructureRowEmptyLabel(r)) continue
        if (isStructureRowHidden(r)) continue
        if (!isCodeMappingEnabled(r)) continue
        const lab = String(r.label ?? "").trim() || `ligne ${i + 1}`
        const mode = normalizeLiaisonMode(r)
        if (mode === "single") {
          if (!String(r.linkCode ?? "").trim()) {
            setError(
              `« ${lab} » : renseignez un code de liaison unique, ou choisissez addition ou soustraction.`
            )
            setSaving(false)
            return false
          }
        }
        if (mode === "sum") {
          if (!normalizeCodeList(r.liaisonSumCodes).length) {
            setError(`« ${lab} » : sélectionnez au moins un code de liaison pour l’addition.`)
            setSaving(false)
            return false
          }
        }
        if (mode === "difference") {
          const nums = normalizeCodeList(r.liaisonNumeratorCodes)
          const dens = normalizeCodeList(r.liaisonDenominatorCodes)
          if (!nums.length && !dens.length) {
            setError(
              `« ${lab} » : sélectionnez au moins un code pour le numérateur ou le dénominateur (soustraction).`
            )
            setSaving(false)
            return false
          }
        }
        if (isDetailParamsDtCtRequired(r) && !normalizeDtCt(r.dtCt)) {
          setError(`« ${lab} » : sélectionnez DT ou CT (Paramètres Détail).`)
          setSaving(false)
          return false
        }
        // L'identifiant d'annexe est désormais attribué automatiquement
        // (renumberAnnexesByAppearance ci-dessus) : plus de validation manuelle.
      }
      await upsertStatementStructure(companyId, statementType, toSave)
      return true
    } catch (e) {
      console.error(e)
      if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
        setError(
          "Connexion au serveur impossible. Vérifiez que l’API est démarrée (ou le proxy Next.js) et votre réseau, puis réessayez."
        )
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError("Enregistrement impossible. Vérifiez les codes de liaison et réessayez.")
      }
      return false
    } finally {
      setSaving(false)
    }
  }, [companyId, structure, statementType, annexScheme])

  const discard = useCallback(() => {
    setStructure([])
    setError(null)
    setLoading(false)
  }, [])

  return {
    structure,
    setStructure,
    loading,
    saving,
    error,
    setError,
    chargeRange,
    summaryStructureDisplayIndices,
    updateRow,
    hideSummaryRowAt,
    setShowInDetail,
    insertPostAbove,
    insertPostBelow,
    insertEmptySpacerAbove,
    insertEmptySpacerBelow,
    canRemoveRowAt,
    removeStructureRowAt,
    moveStructureRow,
    addDetailSubLine,
    applyDetailSubLinesFromStandard,
    save,
    discard,
    reload: load,
  }
}

export function useIncomeStatementStructureEdit(
  companyId: string | null | undefined,
  active: boolean
) {
  return useStatementStructureEdit(companyId, active, "income-statement")
}

export function useBalanceSheetStructureEdit(
  companyId: string | null | undefined,
  active: boolean
) {
  return useStatementStructureEdit(companyId, active, "balance-sheet")
}

export function useCashFlowStructureEdit(
  companyId: string | null | undefined,
  active: boolean
) {
  return useStatementStructureEdit(companyId, active, "cash-flow")
}

export function useCashFlowDetailStructureEdit(
  companyId: string | null | undefined,
  active: boolean
) {
  return useStatementStructureEdit(companyId, active, "cash-flow-detail")
}
