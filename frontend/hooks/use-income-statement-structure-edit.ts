"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiError, getStatementStructure, upsertStatementStructure } from "@/lib/api"
import type { StatementType } from "@/lib/api"
import {
  cloneStructure,
  findChargeLineRange,
  findStructureInsertIndexAfterAnnexContiguousBlock,
  isCodeMappingEnabled,
  isDetailParamsDtCtRequired,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  newBalanceSheetPostRow,
  newChargeRow,
  newDetailSubLineRow,
  newEmptySpacerSummaryRow,
  normalizeCodeList,
  normalizeDtCt,
  normalizeLiaisonMode,
  stripObsoleteIncomeStatementStructureRows,
  validateDuplicatePrimaryLinkCodes,
} from "@/lib/income-statement-structure-utils"

export type StatementStructureEditKind = Extract<StatementType, "income-statement" | "balance-sheet">

function useStatementStructureEdit(
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

  /** Indices globaux pour la grille Paramètres Sommaire (sans lignes `detailOnly`). */
  const summaryStructureDisplayIndices = useMemo(
    () =>
      structure.map((r, i) => (!isStructureRowDetailOnly(r) ? i : -1)).filter((i) => i >= 0),
    [structure]
  )

  const load = useCallback(async () => {
    if (!companyId || !active) return
    setLoading(true)
    setError(null)
    try {
      const data = await getStatementStructure(companyId, statementType)
      const raw = cloneStructure(data.structure ?? [])
      setStructure(
        statementType === "income-statement"
          ? stripObsoleteIncomeStatementStructureRows(raw)
          : raw
      )
    } catch (e) {
      console.error(e)
      setError("Impossible de charger la structure.")
      setStructure([])
    } finally {
      setLoading(false)
    }
  }, [companyId, active, statementType])

  useEffect(() => {
    if (active && companyId) void load()
  }, [active, companyId, load])

  const updateRow = useCallback((index: number, patch: Record<string, unknown>) => {
    setStructure((prev) => {
      const next = cloneStructure(prev)
      if (!next[index]) return prev
      next[index] = { ...next[index], ...patch }
      return next
    })
  }, [])

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

  const insertEmptySpacerAbove = useCallback((globalIndex: number) => {
    setStructure((prev) => {
      if (globalIndex < 0) return prev
      const spacer = newEmptySpacerSummaryRow()
      if (prev.length === 0) {
        return globalIndex === 0 ? [spacer] : prev
      }
      if (globalIndex < 0 || globalIndex >= prev.length) return prev
      const next = cloneStructure(prev)
      next.splice(globalIndex, 0, spacer)
      return next
    })
  }, [])

  const insertEmptySpacerBelow = useCallback((globalIndex: number) => {
    setStructure((prev) => {
      if (globalIndex < 0) return prev
      const spacer = newEmptySpacerSummaryRow()
      if (prev.length === 0) {
        return globalIndex === 0 ? [spacer] : prev
      }
      if (globalIndex < 0 || globalIndex >= prev.length) return prev
      const insertAt = globalIndex + 1
      const next = cloneStructure(prev)
      next.splice(insertAt, 0, spacer)
      return next
    })
  }, [])

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

  const removeStructureRowAt = useCallback((index: number) => {
    setStructure((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const row = prev[index]
      if (!row) return prev
      const next = cloneStructure(prev)
      next.splice(index, 1)
      return next
    })
  }, [])

  const save = useCallback(async () => {
    if (!companyId) return false
    setSaving(true)
    setError(null)
    try {
      const normalized = structure.map((r) => {
        if (isStructureRowHidden(r)) {
          return {
            ...r,
            defineMapping: false,
            showInDetail: false,
            linkCode: undefined,
            liaisonMode: undefined,
            liaisonSumCodes: undefined,
            liaisonNumeratorCodes: undefined,
            liaisonDenominatorCodes: undefined,
          }
        }
        return r
      })
      const toSave =
        statementType === "income-statement"
          ? stripObsoleteIncomeStatementStructureRows(normalized)
          : normalized
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
        if (r.showInDetail === true) {
          if (!String(r.annexLetter ?? "").trim()) {
            setError(
              `« ${lab} » : renseignez la lettre d’annexe lorsque la case « Annexe » est activée.`
            )
            setSaving(false)
            return false
          }
        }
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
  }, [companyId, structure, statementType])

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
    insertPostAbove,
    insertPostBelow,
    insertEmptySpacerAbove,
    insertEmptySpacerBelow,
    canRemoveRowAt,
    removeStructureRowAt,
    addDetailSubLine,
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
