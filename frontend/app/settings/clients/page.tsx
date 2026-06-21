"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, ShieldAlert, Building2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useUser } from "@/hooks/use-user"
import {
  createClient,
  listClients,
  listFeatureFlagRegistry,
  setClientFeatureFlags,
  type AdminOrg,
  type FeatureFlagDef,
} from "@/lib/api"

export default function ClientsAdminPage() {
  const { user: userInfo, loading: userLoading } = useUser()
  const isSuperadmin = !!userInfo?.user?.is_superadmin

  const [clients, setClients] = useState<AdminOrg[]>([])
  const [registry, setRegistry] = useState<FeatureFlagDef[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    Promise.all([listClients(), listFeatureFlagRegistry()])
      .then(([cs, reg]) => {
        setClients(cs)
        setRegistry(reg)
      })
      .catch(() => setError("Impossible de charger les clients"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isSuperadmin) reload()
    else setLoading(false)
  }, [isSuperadmin, reload])

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !email.trim()) {
      setError("Nom du client et courriel de l'admin requis.")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const created = await createClient({ name: name.trim(), admin_email: email.trim() })
      setClients((prev) => [created, ...prev])
      setName("")
      setEmail("")
    } catch {
      setError("Échec de la création du client.")
    } finally {
      setCreating(false)
    }
  }, [name, email])

  const toggleFlag = useCallback(async (org: AdminOrg, key: string, value: boolean) => {
    const next = { ...org.feature_flags, [key]: value }
    // optimistic
    setClients((prev) => prev.map((c) => (c.id === org.id ? { ...c, feature_flags: next } : c)))
    try {
      const updated = await setClientFeatureFlags(org.id, next)
      setClients((prev) => prev.map((c) => (c.id === org.id ? updated : c)))
    } catch {
      setError("Échec de la mise à jour du flag.")
      reload()
    }
  }, [reload])

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
          <p className="text-slate-500">La gestion des clients est réservée aux super-administrateurs.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-1 text-3xl font-bold text-slate-900">Gestion des clients</h1>
        <p className="mb-8 text-slate-500">
          Créez des clients (organisations) et activez/désactivez leurs fonctionnalités.
        </p>

        {/* Create client */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Building2 className="h-4 w-4" /> Nouveau client
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Nom du client</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Holdings" aria-label="Nom du client" />
            </div>
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Courriel de l&apos;administrateur</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@acme.com" aria-label="Courriel de l'administrateur" />
            </div>
            <Button onClick={() => void handleCreate()} disabled={creating} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            L&apos;administrateur définira son mot de passe via « mot de passe oublié ».
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* Clients list */}
        <div className="space-y-4" data-testid="clients-list">
          {clients.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun client pour l&apos;instant.</p>
          ) : (
            clients.map((org) => (
              <div key={org.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{org.name}</h3>
                    <p className="text-xs text-slate-400">
                      {org.slug} · {org.member_count} membre(s) · {org.company_count} société(s)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {registry.map((f) => (
                    <label key={f.key} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <span className="text-sm text-slate-700">{f.label}</span>
                      <Switch
                        checked={org.feature_flags[f.key] ?? f.default}
                        onCheckedChange={(v) => void toggleFlag(org, f.key, v)}
                        aria-label={`${f.label} pour ${org.name}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
