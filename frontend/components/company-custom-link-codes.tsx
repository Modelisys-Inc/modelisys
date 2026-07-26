"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  createCompanyLinkCode,
  deleteCompanyLinkCode,
  listCompanyLinkCodes,
  type CompanyLinkCode,
  type StandardLinkCode,
} from "@/lib/api"
import { usePermissions } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"
import { linkCodeDtCtDisplay, resolveLinkCodeDtCt } from "@/lib/standard-link-code-utils"

const FAMILY_OPTIONS: { value: string; label: string }[] = [
  { value: "ACT", label: "ACT — Actif à court terme" },
  { value: "ALT", label: "ALT — Actif à long terme" },
  { value: "PCT", label: "PCT — Passif à court terme" },
  { value: "PLT", label: "PLT — Passif à long terme" },
  { value: "CAP", label: "CAP — Capitaux propres" },
  { value: "REV", label: "REV — Revenus" },
  { value: "CMV", label: "CMV — Coûts des produits vendus" },
  { value: "EXP", label: "EXP — Frais d'exploitation" },
  { value: "ADM", label: "ADM — Frais d'administration" },
  { value: "VNT", label: "VNT — Frais de vente" },
  { value: "FIN", label: "FIN — Frais financiers" },
  { value: "AUT", label: "AUT — Autres dépenses (produits)" },
  { value: "IMP", label: "IMP — Impôts" },
]

const NO_PARENT = "__none__"

type CustomLinkCodeDraft = {
  family: string
  parentCode: string | null
}

type CompanyCustomLinkCodesProps = {
  companyId: string
  standardCodes?: StandardLinkCode[]
  draft?: CustomLinkCodeDraft | null
  onDraftConsumed?: () => void
}

export function CompanyCustomLinkCodes({
  companyId,
  standardCodes = [],
  draft = null,
  onDraftConsumed,
}: CompanyCustomLinkCodesProps) {
  const { canEdit } = usePermissions()
  const [codes, setCodes] = useState<CompanyLinkCode[]>([])
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState("EXP")
  const [parentCode, setParentCode] = useState<string>(NO_PARENT)
  const [label, setLabel] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const parentOptions = useMemo(
    () => standardCodes.filter((c) => !c.is_leaf && c.family === family),
    [standardCodes, family],
  )

  const reload = useCallback(() => {
    setLoading(true)
    listCompanyLinkCodes(companyId)
      .then(setCodes)
      .catch(() => setErrorMsg("Impossible de charger les codes personnalisés"))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!draft) return
    setFamily(draft.family)
    setParentCode(draft.parentCode ?? NO_PARENT)
    onDraftConsumed?.()
  }, [draft, onDraftConsumed])

  const handleCreate = useCallback(async () => {
    if (!label.trim()) {
      setErrorMsg("Indiquez un libellé pour le code personnalisé.")
      return
    }
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const created = await createCompanyLinkCode(companyId, {
        family,
        label_account: label.trim(),
        parent_code: parentCode === NO_PARENT ? null : parentCode,
      })
      setCodes((prev) => [...prev, created])
      setLabel("")
    } catch {
      setErrorMsg("Échec de la création. Ce libellé/code existe peut-être déjà.")
    } finally {
      setSubmitting(false)
    }
  }, [companyId, family, label, parentCode])

  const handleDelete = useCallback(
    async (code: CompanyLinkCode) => {
      if (!window.confirm(`Supprimer le code personnalisé ${code.code} ?`)) return
      try {
        await deleteCompanyLinkCode(companyId, code.id)
        setCodes((prev) => prev.filter((c) => c.id !== code.id))
      } catch {
        setErrorMsg("Impossible de supprimer ce code.")
      }
    },
    [companyId],
  )

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E0742D]/10">
            <Sparkles className="h-5 w-5 text-[#E0742D]" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Codes personnalisés</h3>
            <p className="text-sm text-slate-600">
              Créez un code propre à cette société (ex. sous REV-A). Il reste privé, devient assignable
              dans le mapping et apparaît dans les états financiers de la société.
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:w-56">
                <label className="mb-1 block text-xs font-medium text-slate-600">Famille</label>
                <Select
                  value={family}
                  onValueChange={(v) => {
                    setFamily(v)
                    setParentCode(NO_PARENT)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white" aria-label="Famille du code personnalisé">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(24rem,70vh)]">
                    {FAMILY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:w-64">
                <label className="mb-1 block text-xs font-medium text-slate-600">Poste parent (optionnel)</label>
                <Select value={parentCode} onValueChange={setParentCode}>
                  <SelectTrigger className="h-10 bg-white" aria-label="Poste parent du code personnalisé">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(24rem,70vh)]">
                    <SelectItem value={NO_PARENT}>Aucun</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.label_sub_account || c.label_account || c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Libellé</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate()
                  }}
                  placeholder="ex. Ventes export"
                  className="h-10 bg-white"
                  aria-label="Libellé du code personnalisé"
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={submitting}
                className="h-10 shrink-0 gap-2 bg-[#E0742D] text-white hover:bg-[#c96526]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer un code
              </Button>
            </div>
          </div>
        )}

        {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}

        <div className="mt-5">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : codes.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Aucun code personnalisé pour cette société.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Code</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Libellé</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Parent</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">DT/CT</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Famille</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody data-testid="custom-codes-tbody">
                  {codes.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
                      <td className={cn("px-4 py-2 font-mono text-sm text-slate-800")}>{c.code}</td>
                      <td className="px-4 py-2 text-sm text-slate-700">{c.label}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.parent_code ?? "—"}</td>
                      <td className="px-4 py-2 text-center" title={linkCodeDtCtDisplay(c)}>
                        <CustomLinkCodeDtCtBadge code={c} />
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{c.family}</td>
                      <td className="px-4 py-2 text-center">
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                            onClick={() => void handleDelete(c)}
                            title="Supprimer ce code personnalisé"
                            aria-label={`Supprimer le code ${c.code}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  )
}
