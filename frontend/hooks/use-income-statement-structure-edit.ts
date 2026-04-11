"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getStatementStructure, upsertStatementStructure } from "@/lib/api"
import {
  cloneStructure,
  findChargeLineRange,
  findStructureInsertIndexAfterAnnexContiguousBlock,
  isCodeMappingEnabled,
  isDetailParamsDtCtRequired,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  newChargeRow,
  newDetailSubLineRow,
  newEmptySpacerSummaryRow,
  normalizeCodeList,
  normalizeDtCt,
  normalizeLiaisonMode,
  stripObsoleteIncomeStatementStructureRows,
} from "@/lib/income-statement-structure-utils"

export function useIncomeStatementStructureEdit(
  companyId: string | null | undefined,
  active: boolean
) {
  const [structure, setStructure] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chargeRange = useMemo(() => findChargeLineRange(structure), [structure])

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
      const data = await getStatementStructure(companyId, "income-statement")
      setStructure(stripObsoleteIncomeStatementStructureRows(cloneStructure(data.structure ?? [])))
    } catch (e) {
      console.error(e)
      setError("Impossible de charger la structure.")
      setStructure([])
    } finally {
      setLoading(false)
    }
  }, [companyId, active])

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

  /**
   * Insère un nouveau poste (charge) juste au-dessus du poste à l’index global `globalIndex`.
   * `indent: true` = poste secondaire (décalé), `false` = poste principal (aligné à gauche).
   * `isBold` = libellé en gras au sommaire.
   */
  const insertPostAbove = useCallback((globalIndex: number, opts?: { indent?: boolean; isBold?: boolean }) => {
    setStructure((prev) => {
      if (globalIndex < 0) return prev
      const indent = opts?.indent ?? true
      const isBold = opts?.isBold ?? false
      const row = newChargeRow({ indent, isBold })
      if (prev.length === 0) {
        return globalIndex === 0 ? [row] : prev
      }
      if (globalIndex < 0 || globalIndex >= prev.length) return prev
      const next = cloneStructure(prev)
      next.splice(globalIndex, 0, row)
      return next
    })
  }, [])

  /**
   * Insère un nouveau poste juste en dessous du poste à l’index global `globalIndex`
   * (nouvelle ligne à l’index `globalIndex + 1`).
   */
  const insertPostBelow = useCallback((globalIndex: number, opts?: { indent?: boolean; isBold?: boolean }) => {
    setStructure((prev) => {
      if (globalIndex < 0) return prev
      const indent = opts?.indent ?? true
      const isBold = opts?.isBold ?? false
      const row = newChargeRow({ indent, isBold })
      if (prev.length === 0) {
        return globalIndex === 0 ? [row] : prev
      }
      if (globalIndex < 0 || globalIndex >= prev.length) return prev
      const insertAt = globalIndex + 1
      const next = cloneStructure(prev)
      next.splice(insertAt, 0, row)
      return next
    })
  }, [])

  /** Insère une ligne vide (espacement) juste au-dessus du poste à l’index global `globalIndex`. */
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

  /** Insère une ligne vide juste en dessous du poste à l’index global `globalIndex`. */
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

  const addDetailSubLine = useCallback((annexLetter: string) => {
    setStructure((prev) => {
      const next = cloneStructure(prev)
      const at = findStructureInsertIndexAfterAnnexContiguousBlock(next, annexLetter)
      if (at < 0) return prev
      next.splice(at + 1, 0, newDetailSubLineRow(annexLetter))
      return next
    })
  }, [])

  /** Indique si la ligne à cet index global peut être retirée de la structure. */
  const canRemoveRowAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= structure.length) return false
      return !!structure[index]
    },
    [structure]
  )

  /** Supprime la ligne à l’index global (sommaire, espacement, charge, sous-ligne détail, etc.). */
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
      const toSave = stripObsoleteIncomeStatementStructureRows(normalized)
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
      await upsertStatementStructure(companyId, "income-statement", toSave)
      return true
    } catch (e) {
      console.error(e)
      setError("Enregistrement impossible. Vérifiez les codes de liaison et réessayez.")
      return false
    } finally {
      setSaving(false)
    }
  }, [companyId, structure])

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
