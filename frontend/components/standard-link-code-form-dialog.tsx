"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createStandardLinkCode,
  deleteStandardLinkCode,
  updateStandardLinkCode,
  type StandardLinkCode,
} from "@/lib/api"
import {
  CASH_FLOW_FAMILY_LABELS,
  cashFlowAttachableLinkCodeOptions,
  isCashFlowFamily,
  isComputedNetIncomeLinkCode,
  NET_INCOME_SUM_FAMILIES,
} from "@/lib/standard-link-code-utils"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

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
  { value: "TEX", label: "TEX — Trésorerie — Exploitation" },
  { value: "TIN", label: "TIN — Trésorerie — Investissement" },
  { value: "TFI", label: "TFI — Trésorerie — Financement" },
]

const NO_PARENT = "__none__"

type FormState = {
  code: string
  family: string
  parent_code: string
  label: string
  is_leaf: boolean
  attached_link_codes: string[]
}

const EMPTY_FORM: FormState = {
  code: "",
  family: "REV",
  parent_code: NO_PARENT,
  label: "",
  is_leaf: true,
  attached_link_codes: [],
}

function codeToForm(code: StandardLinkCode): FormState {
  return {
    code: code.code,
    family: code.family,
    parent_code: code.parent_code ?? NO_PARENT,
    label: code.label_sub_account || code.label_account || "",
    is_leaf: code.is_leaf,
    attached_link_codes: code.attached_link_codes ?? [],
  }
}

function displayLabel(code: StandardLinkCode): string {
  return code.label_sub_account || code.label_account || code.code
}

type StandardLinkCodeFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialCode?: StandardLinkCode | null
  familyCodes: StandardLinkCode[]
  defaultParentCode?: string | null
  onSaved: () => void
}

export function StandardLinkCodeFormDialog({
  open,
  onOpenChange,
  mode,
  initialCode,
  familyCodes,
  defaultParentCode = null,
  onSaved,
}: StandardLinkCodeFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === "edit" && initialCode) {
      setForm(codeToForm(initialCode))
    } else {
      const parent = familyCodes.find((c) => c.code === defaultParentCode)
      setForm({
        ...EMPTY_FORM,
        family: parent?.family ?? EMPTY_FORM.family,
        parent_code: defaultParentCode ?? NO_PARENT,
      })
    }
  }, [open, mode, initialCode, defaultParentCode, familyCodes])

  const isCashFlow = isCashFlowFamily(form.family)

  const parentOptions = useMemo(() => {
    if (isCashFlow) return []
    const family = mode === "edit" && initialCode ? initialCode.family : form.family
    return familyCodes
      .filter((c) => c.family === family)
      .filter((c) => !c.is_leaf)
      .filter((c) => mode !== "edit" || c.code !== initialCode?.code)
      .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
  }, [familyCodes, form.family, mode, initialCode, isCashFlow])

  const childCodes = useMemo(() => {
    if (!initialCode) return []
    return familyCodes.filter((c) => c.parent_code === initialCode.code)
  }, [familyCodes, initialCode])

  const attachableOptions = useMemo(
    () => cashFlowAttachableLinkCodeOptions(familyCodes),
    [familyCodes],
  )

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleAttachedCode = (code: string, checked: boolean) => {
    setForm((prev) => {
      const current = new Set(prev.attached_link_codes)
      if (checked) current.add(code)
      else current.delete(code)
      return { ...prev, attached_link_codes: [...current] }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isCashFlow && form.attached_link_codes.length === 0) {
      setError(
        "Sélectionnez au moins un code de liaison Bilan ou Compte de résultat pour ce code Trésorerie.",
      )
      return
    }

    setSaving(true)
    try {
      const parentCode = isCashFlow
        ? null
        : form.parent_code === NO_PARENT
          ? null
          : form.parent_code
      const label = form.label.trim() || null

      if (mode === "create") {
        if (!form.code.trim()) {
          setError("Le code est obligatoire.")
          return
        }
        await createStandardLinkCode({
          code: form.code.trim(),
          family: form.family,
          parent_code: parentCode,
          label_sub_account: label,
          is_leaf: isCashFlow ? false : form.is_leaf,
          attached_link_codes: isCashFlow ? form.attached_link_codes : [],
        })
      } else if (initialCode) {
        await updateStandardLinkCode(initialCode.code, {
          parent_code: parentCode,
          label_sub_account: label,
          label_account: null,
          is_leaf: isCashFlow ? false : form.is_leaf,
          attached_link_codes: isCashFlow ? form.attached_link_codes : [],
        })
      }
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!initialCode) return
    setError(null)
    setDeleting(true)
    try {
      await deleteStandardLinkCode(initialCode.code)
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer ce code")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-slate-200 sm:max-w-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 border-b border-slate-100 pb-4">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {mode === "create" ? "Nouveau code de liaison" : "Modifier le code"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {mode === "create"
              ? isCashFlow
                ? "Créez un code Trésorerie et associez-y des codes Bilan ou Compte de résultat."
                : "Le code sera ajouté sous son parent si vous en sélectionnez un."
              : `Mise à jour de ${initialCode?.code ?? "ce code"}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {mode === "create" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slc-family">Famille *</Label>
                <Select
                  value={form.family}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      family: v,
                      parent_code: NO_PARENT,
                      attached_link_codes: isCashFlowFamily(v) ? prev.attached_link_codes : [],
                    }))
                  }
                >
                  <SelectTrigger id="slc-family" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slc-code">Code *</Label>
                <Input
                  id="slc-code"
                  value={form.code}
                  onChange={(e) => setField("code", e.target.value)}
                  placeholder={isCashFlow ? "ex. TEX-VENTES" : "ex. REV-A.1"}
                  className="font-mono"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-medium text-slate-500">Code</span>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{form.code}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-medium text-slate-500">Famille</span>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{form.family}</p>
              </div>
            </div>
          )}

          {!isCashFlow && form.is_leaf ? (
            <div className="space-y-2">
              <Label htmlFor="slc-parent">Code parent</Label>
              <Select
                value={form.parent_code}
                onValueChange={(v) => setField("parent_code", v)}
              >
                <SelectTrigger id="slc-parent" className="w-full">
                  <SelectValue placeholder="Aucun (niveau racine)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Aucun (niveau racine)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {`${c.code} — ${displayLabel(c)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {!isCashFlow && mode === "edit" ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="slc-code-parent-toggle" className="text-sm">
                  Code parent
                </Label>
                <p className="text-xs text-slate-500">Non assignable au mapping GL</p>
              </div>
              <Switch
                id="slc-code-parent-toggle"
                checked={!form.is_leaf}
                onCheckedChange={(checked) => {
                  setForm((prev) => ({
                    ...prev,
                    is_leaf: !checked,
                    parent_code: checked ? NO_PARENT : prev.parent_code,
                  }))
                }}
              />
            </div>
          ) : null}

          {isCashFlow ? (
            <div className="space-y-2">
              <Label>Codes Bilan / Compte de résultat associés *</Label>
              <p className="text-xs text-slate-500">
                Famille {form.family} — {CASH_FLOW_FAMILY_LABELS[form.family as keyof typeof CASH_FLOW_FAMILY_LABELS]}
              </p>
              <div className="max-h-52 overflow-y-auto rounded-md border border-slate-200 p-2">
                {attachableOptions.codes.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-500">
                    Aucun code Bilan ou Compte de résultat disponible.
                  </p>
                ) : (
                  attachableOptions.codes.map((code) => {
                    const label = attachableOptions.labels.get(code) ?? code
                    const checked = form.attached_link_codes.includes(code)
                    return (
                      <label
                        key={code}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-slate-50",
                          checked && "bg-[#E0742D]/5",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleAttachedCode(code, value === true)}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-slate-700">
                          <span className="font-mono text-slate-800">{code}</span>
                          <span className="text-slate-500"> — {label}</span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}

          {initialCode && isComputedNetIncomeLinkCode(initialCode.code) ? (
            <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              Ce code est calculé automatiquement (somme des codes feuilles des familles{" "}
              {NET_INCOME_SUM_FAMILIES.join(", ")}). Aucun compte du grand livre ne doit lui être
              associé dans le mapping comptable.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="slc-label">Libellé *</Label>
            <Input
              id="slc-label"
              value={form.label}
              onChange={(e) => setField("label", e.target.value)}
              placeholder="Libellé affiché dans le tableau"
              required
            />
          </div>

          {mode === "edit" && childCodes.length > 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Ce code possède {childCodes.length} sous-code{childCodes.length > 1 ? "s" : ""}.
              Supprimez-les avant de pouvoir supprimer ce code.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 border-t border-slate-100 pt-4 sm:justify-between">
            {mode === "edit" && initialCode ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || deleting || childCodes.length > 0}
                    className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce code de liaison ?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-slate-600">
                        <p>
                          Vous êtes sur le point de supprimer le code{" "}
                          <span className="font-mono font-semibold text-slate-900">
                            {initialCode.code}
                          </span>
                          .
                        </p>
                        <p className="font-medium text-amber-700">
                          Cette action est irréversible. Le code sera retiré de la charte
                          standardisée pour toutes les sociétés.
                        </p>
                        {childCodes.length > 0 ? (
                          <p className="text-red-600">
                            Ce code possède {childCodes.length} sous-code
                            {childCodes.length > 1 ? "s" : ""}. Supprimez-les d&apos;abord.
                          </p>
                        ) : null}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {deleting ? "Suppression…" : "Supprimer définitivement"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving || deleting}
                className="bg-[#E0742D] text-white hover:bg-[#c96324]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : mode === "create" ? (
                  "Créer le code"
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
