"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getStatementStructure, upsertStatementStructure } from "@/lib/api"
import {
  cloneStructure,
  findChargeLineRange,
  isDefineMappingChecked,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  newChargeRow,
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

  const load = useCallback(async () => {
    if (!companyId || !active) return
    setLoading(true)
    setError(null)
    try {
      const data = await getStatementStructure(companyId, "income-statement")
      setStructure(cloneStructure(data.structure ?? []))
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

  const removeChargeLine = useCallback((index: number) => {
    setStructure((prev) => {
      const r = findChargeLineRange(prev)
      if (!r) return prev
      if (index < r.start || index >= r.end) return prev
      if (r.end - r.start <= 1) return prev
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
      const toSave = structure.map((r) => {
        if (isStructureRowHidden(r)) {
          return {
            ...r,
            defineMapping: false,
            linkCode: undefined,
            annexLetter: undefined,
          }
        }
        return r
      })
      for (let i = 0; i < toSave.length; i++) {
        const r = toSave[i]
        if (isStructureRowEmptyLabel(r)) continue
        if (isStructureRowHidden(r)) continue
        if (!isDefineMappingChecked(r)) continue
        const lc = String(r.linkCode ?? "").trim()
        const an = String(r.annexLetter ?? "").trim()
        if (!lc || !an) {
          const lab = String(r.label ?? "").trim() || `ligne ${i + 1}`
          setError(
            `« ${lab} » : renseignez le code de liaison et l’annexe lorsque « Définir » est coché.`
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
    updateRow,
    addChargeLine,
    removeChargeLine,
    save,
    discard,
    reload: load,
  }
}
