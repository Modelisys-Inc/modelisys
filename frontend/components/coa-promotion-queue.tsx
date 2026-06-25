"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowUpCircle, Link2, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  listPromotionCandidates,
  promotePromotionCandidate,
  rejectPromotionCandidate,
  type PromotionCandidate,
} from "@/lib/api"

export function CoaPromotionQueue() {
  const [candidates, setCandidates] = useState<PromotionCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [codeEdits, setCodeEdits] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    listPromotionCandidates()
      .then((c) => {
        setCandidates(c)
        setCodeEdits(Object.fromEntries(c.map((x) => [x.id, x.code])))
      })
      .catch(() => setError("Impossible de charger la file de promotion"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const removeRow = (id: string) => setCandidates((prev) => prev.filter((c) => c.id !== id))

  const promoteNew = useCallback(
    async (cand: PromotionCandidate) => {
      setBusyId(cand.id)
      setError(null)
      try {
        await promotePromotionCandidate(cand.id, { code: (codeEdits[cand.id] || cand.code).trim() })
        removeRow(cand.id)
      } catch {
        setError(`Échec de la promotion de ${cand.code} (le code global existe peut-être déjà).`)
      } finally {
        setBusyId(null)
      }
    },
    [codeEdits],
  )

  const linkExisting = useCallback(async (cand: PromotionCandidate, targetCode: string) => {
    setBusyId(cand.id)
    setError(null)
    try {
      await promotePromotionCandidate(cand.id, { link_to_existing_code: targetCode })
      removeRow(cand.id)
    } catch {
      setError(`Échec de la liaison de ${cand.code} à ${targetCode}.`)
    } finally {
      setBusyId(null)
    }
  }, [])

  const reject = useCallback(async (cand: PromotionCandidate) => {
    if (!window.confirm(`Rejeter ${cand.code} ? Il restera propre à la société.`)) return
    setBusyId(cand.id)
    try {
      await rejectPromotionCandidate(cand.id)
      removeRow(cand.id)
    } catch {
      setError(`Impossible de rejeter ${cand.code}.`)
    } finally {
      setBusyId(null)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-white/80">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="bg-white/80">
      {error && (
        <p className="border-b border-red-100 bg-red-50/80 px-6 py-3 text-sm text-red-600">{error}</p>
      )}

      {candidates.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-sm text-slate-500">
            Aucun code personnalisé en attente de révision. La file est vide. 🎉
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto" data-testid="promotion-queue">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Société</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Libellé</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Signature</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">Suggestion</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const busy = busyId === c.id
                return (
                  <tr key={c.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-700">{c.company_name}</td>
                    <td className="px-6 py-4">
                      <Input
                        value={codeEdits[c.id] ?? c.code}
                        onChange={(e) => setCodeEdits((p) => ({ ...p, [c.id]: e.target.value }))}
                        className="h-8 w-36 font-mono text-sm"
                        aria-label={`Code global pour ${c.code}`}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{c.label}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <span className="font-mono">{c.family}</span>
                      {c.ft_category ? <span> · {c.ft_category}</span> : null}
                      {c.account_type ? <span> · {c.account_type}</span> : null}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {c.suggested_match ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                          ≈ {c.suggested_match.code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {c.suggested_match && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void linkExisting(c, c.suggested_match!.code)}
                            className="h-8 gap-1.5 text-xs"
                            title={`Lier au code existant ${c.suggested_match.code}`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Lier à {c.suggested_match.code}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void promoteNew(c)}
                          className="h-8 gap-1.5 bg-[#E0742D] text-xs text-white hover:bg-[#c96526]"
                          title="Promouvoir comme nouveau code global"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          )}
                          Promouvoir
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void reject(c)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                          title="Rejeter (garder propre à la société)"
                          aria-label={`Rejeter ${c.code}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
