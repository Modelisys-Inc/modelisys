"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardLinkCodePicker } from "@/components/standard-link-code-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { Division, StandardLinkCode } from "@/lib/api"
import {
  filterRevenueLeafLinkCodes,
  mappingDetailFromLinkCode,
  mappingGroupeFromLinkCode,
  mappingPosteFromLinkCode,
  sanitizeMappingCostTypeFields,
  sanitizeMappingLiabilityTermFields,
  sanitizeMappingAltAssetFields,
  showsMappingCostTypeOptions,
  showsMappingLiabilityTermOptions,
  showsMappingAltAssetTypeOptions,
  showsMappingVariableRevenueLinkOption,
  standardLinkCodeDisplayLabel,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"

export type AccountMappingDraft = {
  mappingId: string
  accountNumber: string
  description: string
  linkCode?: string
  divisions?: string
  subDivisions?: string
  variableCosts?: boolean
  fixedCosts?: boolean
  variableCostRevenueLinkCode?: string
  altAssetCost?: boolean
  altAccumulatedAmortization?: boolean
  liabilityRemainingYears?: number
  liabilityInterestRate?: number
  interco?: string
}

type CompanyOption = { id: string; name: string }

function divisionSelectValue(stored: string | undefined, divisions: Division[]): string {
  const t = stored?.trim()
  if (!t) return "none"
  if (divisions.some((d) => d.name === t)) return t
  return "__legacy__"
}

function subDivisionSelectValue(
  stored: string | undefined,
  subOptions: Division["sub_divisions"],
): string {
  const t = stored?.trim()
  if (!t) return "none"
  if (subOptions.some((s) => s.name === t)) return t
  return "__legacy__"
}

type AccountMappingSettingsPanelProps = {
  account: AccountMappingDraft
  linkCodeByCode: StandardLinkCodeLookup
  companyDivisions: Division[]
  intercoCompanies: CompanyOption[]
  linkCodes: StandardLinkCode[]
  linkCodesLoading?: boolean
  canEdit: boolean
  saving?: boolean
  onClose: () => void
  onSave: (draft: AccountMappingDraft) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export function AccountMappingSettingsPanel({
  account,
  linkCodeByCode,
  companyDivisions,
  intercoCompanies,
  linkCodes,
  linkCodesLoading = false,
  canEdit,
  saving = false,
  onClose,
  onSave,
  onDelete,
}: AccountMappingSettingsPanelProps) {
  const [draft, setDraft] = useState<AccountMappingDraft>(account)

  useEffect(() => {
    setDraft(account)
  }, [account])

  const selectedDivision = companyDivisions.find((d) => d.name === draft.divisions?.trim())
  const subOptions = selectedDivision?.sub_divisions ?? []
  const hasLegacySub =
    !!draft.subDivisions?.trim() && !subOptions.some((s) => s.name === draft.subDivisions?.trim())

  const derived = useMemo(
    () => ({
      groupe: mappingGroupeFromLinkCode(draft.linkCode, linkCodeByCode),
      poste: mappingPosteFromLinkCode(draft.linkCode, linkCodeByCode),
      detail: mappingDetailFromLinkCode(draft.linkCode, linkCodeByCode),
    }),
    [draft.linkCode, linkCodeByCode],
  )

  const showCostTypeOptions = showsMappingCostTypeOptions(draft.linkCode, linkCodeByCode)
  const showAltAssetTypeOptions = showsMappingAltAssetTypeOptions(draft.linkCode)
  const showVariableRevenueLink = showsMappingVariableRevenueLinkOption(draft.linkCode, linkCodeByCode)
  const showLiabilityTermOptions = showsMappingLiabilityTermOptions(draft.linkCode)

  const revenueLeafCodes = useMemo(
    () => filterRevenueLeafLinkCodes(Array.from(linkCodeByCode.values())),
    [linkCodeByCode],
  )

  const handleSave = () => {
    const sanitized = sanitizeMappingAltAssetFields(
      sanitizeMappingLiabilityTermFields(
        sanitizeMappingCostTypeFields(draft, linkCodeByCode),
      ),
    )
    void onSave(sanitized)
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Paramètres du compte
          </p>
          <h3 className="mt-3 font-mono text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
            {account.accountNumber}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{account.description || "—"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
              disabled={saving}
              onClick={() => handleSave()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 border-blue-200/90 text-xs font-medium text-blue-900 hover:bg-blue-50/90"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code de liaison</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mapping-description">Description</Label>
              <Input
                id="mapping-description"
                value={draft.description}
                disabled={!canEdit}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mapping-link-code">Code de liaison</Label>
              <StandardLinkCodePicker
                id="mapping-link-code"
                codes={linkCodes}
                value={draft.linkCode}
                loading={linkCodesLoading}
                disabled={!canEdit}
                onChange={(code) =>
                  setDraft((d) => {
                    const next = { ...d, linkCode: code }
                    return sanitizeMappingAltAssetFields(
                      sanitizeMappingLiabilityTermFields(
                        sanitizeMappingCostTypeFields(next, linkCodeByCode),
                      ),
                    )
                  })
                }
              />
            </div>
            <dl className="grid grid-cols-1 gap-3 rounded-md border border-slate-100 bg-slate-50/80 p-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Groupe</dt>
                <dd className="mt-0.5 text-slate-800">{derived.groupe}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Poste</dt>
                <dd className="mt-0.5 text-slate-800">{derived.poste}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Détail</dt>
                <dd className="mt-0.5 text-slate-800">{derived.detail}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Répartition et options
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Division</Label>
              <Select
                value={divisionSelectValue(draft.divisions, companyDivisions)}
                disabled={!canEdit}
                onValueChange={(v) => {
                  if (v === "__legacy__") return
                  setDraft((d) => ({
                    ...d,
                    divisions: v === "none" ? undefined : v,
                    subDivisions: v === "none" ? undefined : d.subDivisions,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {companyDivisions.map((div) => (
                    <SelectItem key={div.id} value={div.name}>
                      {div.name}
                    </SelectItem>
                  ))}
                  {draft.divisions?.trim() &&
                    !companyDivisions.some((d) => d.name === draft.divisions?.trim()) && (
                      <SelectItem value="__legacy__">{draft.divisions} (hors liste)</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>S-division</Label>
              <Select
                value={subDivisionSelectValue(draft.subDivisions, subOptions)}
                disabled={!canEdit || !draft.divisions?.trim()}
                onValueChange={(v) => {
                  if (v === "__legacy__") return
                  setDraft((d) => ({ ...d, subDivisions: v === "none" ? undefined : v }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {subOptions.map((sub) => (
                    <SelectItem key={sub.id} value={sub.name}>
                      {sub.name}
                    </SelectItem>
                  ))}
                  {hasLegacySub && (
                    <SelectItem value="__legacy__">{draft.subDivisions} (hors liste)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interco</Label>
              <Select
                value={draft.interco || "none"}
                disabled={!canEdit || intercoCompanies.length === 0}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, interco: v === "none" ? undefined : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={intercoCompanies.length === 0 ? "Aucune société" : "Aucune"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {intercoCompanies.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showCostTypeOptions ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={draft.variableCosts || false}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        setDraft((d) =>
                          sanitizeMappingCostTypeFields(
                            {
                              ...d,
                              variableCosts: checked === true,
                              fixedCosts: checked === true ? false : d.fixedCosts,
                            },
                            linkCodeByCode,
                          ),
                        )
                      }
                    />
                    Coûts variables (CV)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={draft.fixedCosts || false}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        setDraft((d) =>
                          sanitizeMappingCostTypeFields(
                            {
                              ...d,
                              fixedCosts: checked === true,
                              variableCosts: checked === true ? false : d.variableCosts,
                            },
                            linkCodeByCode,
                          ),
                        )
                      }
                    />
                    Coûts fixes (CF)
                  </label>
                </div>
                {draft.variableCosts && showVariableRevenueLink ? (
                  <div className="space-y-1.5">
                    <Label>Compte de revenu associé</Label>
                    <Select
                      value={draft.variableCostRevenueLinkCode || "none"}
                      disabled={!canEdit || revenueLeafCodes.length === 0}
                      onValueChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          variableCostRevenueLinkCode: v === "none" ? undefined : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            revenueLeafCodes.length === 0
                              ? "Aucun compte de revenu disponible"
                              : "Sélectionner un compte de revenu"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {revenueLeafCodes.map((code) => (
                          <SelectItem key={code.code} value={code.code}>
                            {code.code} — {standardLinkCodeDisplayLabel(code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
            {showAltAssetTypeOptions ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-600">Immobilisation (ALT-B / C / D)</p>
                <div className="flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={draft.altAssetCost || false}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        setDraft((d) =>
                          sanitizeMappingAltAssetFields({
                            ...d,
                            altAssetCost: checked === true,
                            altAccumulatedAmortization:
                              checked === true ? false : d.altAccumulatedAmortization,
                          }),
                        )
                      }
                    />
                    Coût
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <Checkbox
                      checked={draft.altAccumulatedAmortization || false}
                      disabled={!canEdit}
                      onCheckedChange={(checked) =>
                        setDraft((d) =>
                          sanitizeMappingAltAssetFields({
                            ...d,
                            altAccumulatedAmortization: checked === true,
                            altAssetCost: checked === true ? false : d.altAssetCost,
                          }),
                        )
                      }
                    />
                    Amortissement cumulé
                  </label>
                </div>
              </div>
            ) : null}
            {showLiabilityTermOptions ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-600">Passif à long terme</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mapping-liability-remaining-years">
                      Durée restante du passif (années)
                    </Label>
                    <Input
                      id="mapping-liability-remaining-years"
                      type="number"
                      min={0}
                      step={0.1}
                      inputMode="decimal"
                      placeholder="ex. 5"
                      disabled={!canEdit}
                      value={draft.liabilityRemainingYears ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim()
                        setDraft((d) => ({
                          ...d,
                          liabilityRemainingYears:
                            raw === "" ? undefined : Number.parseFloat(raw),
                        }))
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mapping-liability-interest-rate">Taux d&apos;intérêt (%)</Label>
                    <Input
                      id="mapping-liability-interest-rate"
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      placeholder="ex. 5.25"
                      disabled={!canEdit}
                      value={draft.liabilityInterestRate ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim()
                        setDraft((d) => ({
                          ...d,
                          liabilityInterestRate:
                            raw === "" ? undefined : Number.parseFloat(raw),
                        }))
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {canEdit && onDelete ? (
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-50"
            disabled={saving}
            onClick={() => void onDelete()}
          >
            Supprimer ce compte du mapping
          </Button>
        </div>
      ) : null}
    </div>
  )
}
