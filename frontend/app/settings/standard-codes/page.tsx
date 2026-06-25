"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, ShieldAlert, RotateCcw, Ban } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/hooks/use-user"
import {
  createStandardLinkCode,
  listStandardLinkCodesFlat,
  setStandardLinkCodeActive,
  type StandardLinkCode,
} from "@/lib/api"
import { cn } from "@/lib/utils"

export default function StandardCodesAdminPage() {
  const { user: userInfo, loading: userLoading } = useUser()
  const isSuperadmin = !!userInfo?.user?.is_superadmin

  const [codes, setCodes] = useState<StandardLinkCode[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState("")
  const [family, setFamily] = useState("")
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    setLoading(true)
    listStandardLinkCodesFlat(false)
      .then(setCodes)
      .catch(() => setError("Impossible de charger les codes"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isSuperadmin) reload()
    else setLoading(false)
  }, [isSuperadmin, reload])

  const handleCreate = useCallback(async () => {
    if (!code.trim() || !family.trim()) {
      setError("Code et famille sont requis.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await createStandardLinkCode({
        code: code.trim().toUpperCase(),
        family: family.trim().toUpperCase(),
        label_account: label.trim() || null,
      })
      setCodes((prev) => [...prev, created])
      setCode("")
      setLabel("")
    } catch {
      setError("Échec de la création (le code existe peut-être déjà).")
    } finally {
      setBusy(false)
    }
  }, [code, family, label])

  const toggleActive = useCallback(async (c: StandardLinkCode) => {
    const next = !(c.is_active ?? true)
    const updated = await setStandardLinkCodeActive(c.code, next)
    setCodes((prev) => prev.map((x) => (x.code === c.code ? updated : x)))
  }, [])

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="mb-2 text-2xl font-semibold text-slate-900">Accès réservé</h1>
          <p className="text-slate-500">
            La gestion de la charte de comptes globale est réservée aux super-administrateurs.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-1 text-3xl font-bold text-slate-900">Charte de comptes globale</h1>
        <p className="mb-8 text-slate-500">
          Gérez les codes de liaison standardisés partagés par toutes les sociétés. Les
          suppressions sont des dépréciations (jamais d&apos;effacement) pour préserver l&apos;historique.
        </p>

        {/* Create */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Nouveau code</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-600">Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EXP-X1" aria-label="Code" className="font-mono" />
            </div>
            <div className="sm:w-32">
              <label className="mb-1 block text-xs font-medium text-slate-600">Famille</label>
              <Input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="EXP" aria-label="Famille" />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Libellé</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description du compte" aria-label="Libellé" />
            </div>
            <Button onClick={() => void handleCreate()} disabled={busy} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full" data-testid="global-codes-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Code</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Libellé</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Famille</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Statut</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const active = c.is_active ?? true
                return (
                  <tr key={c.id} className={cn("border-b border-slate-50", !active && "bg-slate-50/60")}>
                    <td className="px-4 py-2 font-mono text-sm text-slate-800">{c.code}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{c.label}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.family}</td>
                    <td className="px-4 py-2">
                      <span className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600",
                      )}>
                        {active ? "Actif" : "Déprécié"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 gap-1.5 text-xs", active ? "text-slate-500 hover:text-red-600" : "text-slate-500 hover:text-emerald-700")}
                        onClick={() => void toggleActive(c)}
                        aria-label={`${active ? "Déprécier" : "Réactiver"} ${c.code}`}
                      >
                        {active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        {active ? "Déprécier" : "Réactiver"}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
