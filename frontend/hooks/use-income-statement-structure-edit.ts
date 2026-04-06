"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getStatementStructure, upsertStatementStructure } from "@/lib/api"
import {
  cloneStructure,
  findChargeLineRange,
  findLastStructureIndexForAnnexLetter,
  isCodeMappingEnabled,
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  newChargeRow,
  newDetailSubLineRow,
  newEmptySpacerSummaryRow,
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

  const addChargeLine = useCallback(() => {
    setStructure((prev) => {
      const r = findChargeLineRange(prev)
      if (!r) return prev
      const next = cloneStructure(prev)
      next.splice(r.end, 0, newChargeRow())
      return next
    })
  }, [])

  /** Insère une ligne vide (espacement) juste au-dessus du poste à l’index global `globalIndex`. */
  const insertEmptySpacerAbove = useCallback((globalIndex: number) => {
    setStructure((prev) => {
      if (globalIndex < 0 || globalIndex >= prev.length) return prev
      const next = cloneStructure(prev)
      next.splice(globalIndex, 0, newEmptySpacerSummaryRow())
      return next
    })
  }, [])

  const addDetailSubLine = useCallback((annexLetter: string) => {
    setStructure((prev) => {
      const next = cloneStructure(prev)
      const at = findLastStructureIndexForAnnexLetter(next, annexLetter)
      if (at < 0) return prev
      next.splice(at + 1, 0, newDetailSubLineRow(annexLetter))
      return next
    })
  }, [])

  /** Indique si la ligne à cet index global peut être retirée de la structure. */
  const canRemoveRowAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= structure.length) return false
      if (structure.length <= 1) return false
      const row = structure[index]
      if (!row) return false
      if (isStructureRowDetailOnly(row)) return true
      const r = chargeRange
      if (r && index >= r.start && index < r.end) {
        return r.end - r.start > 1
      }
      return true
    },
    [structure, chargeRange]
  )

  /**
   * Supprime la ligne à l’index global (sommaire, espacement, charge, sous-ligne détail, etc.).
   * Conserve au moins une ligne dans le bloc « charges » entre la section et le total.
   */
  const removeStructureRowAt = useCallback((index: number) => {
    setStructure((prev) => {
      if (index < 0 || index >= prev.length) return prev
      if (prev.length <= 1) return prev
      const row = prev[index]
      if (!row) return prev

      if (isStructureRowDetailOnly(row)) {
        const next = cloneStructure(prev)
        next.splice(index, 1)
        return next
      }

      const r = findChargeLineRange(prev)
      if (r && index >= r.start && index < r.end) {
        if (r.end - r.start <= 1) return prev
        const next = cloneStructure(prev)
        next.splice(index, 1)
        return next
      }

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
        const lc = String(r.linkCode ?? "").trim()
        const an = String(r.annexLetter ?? "").trim()
        if (!lc || !an) {
          const lab = String(r.label ?? "").trim() || `ligne ${i + 1}`
          setError(
            `« ${lab} » : renseignez le code de liaison et la lettre lorsque « Code » est coché.`
          )
          setSaving(false)
          return false
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
    addChargeLine,
    insertEmptySpacerAbove,
    canRemoveRowAt,
    removeStructureRowAt,
    addDetailSubLine,
    save,
    discard,
    reload: load,
  }
}
