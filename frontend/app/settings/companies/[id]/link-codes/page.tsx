"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2, Link2, ChevronDown, ChevronRight, Plus, RefreshCw } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { CompanyCustomLinkCodes } from "@/components/company-custom-link-codes"
import { StandardLinkCodeFormDialog } from "@/components/standard-link-code-form-dialog"
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
import { useStandardLinkCodes } from "@/hooks/use-standard-link-codes"
import { usePermissions } from "@/hooks/use-permissions"
import { useAuth } from "@/contexts/auth-context"
import { syncStandardLinkCodesToCompanies } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  dashboardCardFrameStaticClass,
  dashboardCardRingClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardTitleClass,
  dashboardCardBodyMutedClass,
} from "@/lib/dashboard-card-style"
import type { StandardLinkCode } from "@/lib/api"
import { sortStandardLinkCodesHierarchically, attachedLinkCodesDisplay, cashFlowAttachableLinkCodeOptions, isCashFlowFamily, isComputedNetIncomeLinkCode, isMappableStandardLinkCode, filterMappableLeafLinkCodes, resolveLinkCodeDtCt } from "@/lib/standard-link-code-utils"

const FAMILY_LABELS: Record<string, string> = {
  ACT: "Actif à court terme",
  ALT: "Actif à long terme",
  PCT: "Passif à court terme",
  PLT: "Passif à long terme",
  CAP: "Capitaux propres",
  REV: "Revenus",
  CMV: "Coûts des produits vendus",
  EXP: "Frais d'exploitation",
  ADM: "Frais d'administration",
  VNT: "Frais de vente",
  FIN: "Frais financiers",
  AUT: "Autres dépenses (produits)",
  IMP: "Impôts",
  TEX: "Trésorerie — Exploitation",
  TIN: "Trésorerie — Investissement",
  TFI: "Trésorerie — Financement",
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  ACT: "Bilan",
  ALT: "Bilan",
  PCT: "Bilan",
  PLT: "Bilan",
  CAP: "Bilan",
  REV: "Compte de résultat",
  CMV: "Compte de résultat",
  EXP: "Compte de résultat",
  ADM: "Compte de résultat",
  VNT: "Compte de résultat",
  FIN: "Compte de résultat",
  AUT: "Compte de résultat",
  IMP: "Compte de résultat",
  TEX: "Trésorerie",
  TIN: "Trésorerie",
  TFI: "Trésorerie",
}

function LinkCodeDtCtBadge({ code }: { code: StandardLinkCode }) {
  const dtCt = resolveLinkCodeDtCt(code)
  if (!dtCt) {
    return <span className="text-sm text-slate-400">—</span>
  }
  return (
    <span
      className={cn(
        "inline-flex min-w-[2.25rem] justify-center rounded px-2 py-0.5 font-mono text-xs font-semibold tracking-wide",
        dtCt === "DT"
          ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80"
          : "bg-violet-50 text-violet-800 ring-1 ring-violet-200/80",
      )}
      title={dtCt === "DT" ? "Nature débitrice (solde normal au débit)" : "Nature créditrice (solde normal au crédit)"}
    >
      {dtCt}
    </span>
  )
}

function CodeRow({
  code,
  onEdit,
  onAddCustomChild,
  showEdit = true,
  showAttachedColumn = false,
  attachableLabels,
}: {
  code: StandardLinkCode
  onEdit: (code: StandardLinkCode) => void
  onAddCustomChild?: (code: StandardLinkCode) => void
  showEdit?: boolean
  showAttachedColumn?: boolean
  attachableLabels?: Map<string, string>
}) {
  const hasParent = code.parent_code !== null
  const isComputedNetIncome = isComputedNetIncomeLinkCode(code.code)
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className={cn("px-6 py-3 font-mono text-sm text-slate-800", hasParent && "pl-10")}>
        {code.code}
      </td>
      <td className="px-6 py-3 text-sm text-slate-700">
        {code.label_sub_account || code.label_account || "—"}
        {isComputedNetIncome ? (
          <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
            Calculé
          </span>
        ) : null}
      </td>
      <td className="px-6 py-3 text-sm text-slate-500">
        {code.parent_code ?? "—"}
      </td>
      <td className="px-6 py-3 text-center">
        <LinkCodeDtCtBadge code={code} />
      </td>
      {showAttachedColumn ? (
        <td className="px-6 py-3 text-sm text-slate-600">
          {attachedLinkCodesDisplay(code.attached_link_codes, attachableLabels ?? new Map())}
        </td>
      ) : null}
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          {onAddCustomChild && !code.is_leaf ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-[#E0742D]/40 px-3 text-xs font-medium text-[#E0742D] hover:bg-[#E0742D]/5"
              onClick={() => onAddCustomChild(code)}
            >
              Ajouter un code
            </Button>
          ) : null}
          {showEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 px-3 text-xs font-medium text-slate-600 hover:border-[#E0742D]/40 hover:bg-[#E0742D]/5 hover:text-[#E0742D]"
              onClick={() => onEdit(code)}
            >
              Modifier
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function FamilySection({
  family,
  accountType,
  codes,
  onEdit,
  onAddCustomChild,
  showEdit = true,
  attachableLabels,
  expanded,
  onToggle,
}: {
  family: string
  accountType: string | null
  codes: StandardLinkCode[]
  onEdit: (code: StandardLinkCode) => void
  onAddCustomChild?: (code: StandardLinkCode) => void
  showEdit?: boolean
  attachableLabels: Map<string, string>
  expanded: boolean
  onToggle: () => void
}) {
  const isCashFlow = isCashFlowFamily(family)
  const leafCount = codes.filter((c) => isMappableStandardLinkCode(c)).length

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
          <div>
            <span className="font-mono text-sm font-semibold text-slate-800">{family}</span>
            <span className="ml-3 text-sm text-slate-600">
              {FAMILY_LABELS[family] || accountType || family}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{codes.length} codes</span>
          {isCashFlow ? (
            <span>agrégats</span>
          ) : (
            <span>{leafCount} assignables</span>
          )}
          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {SECTION_TYPE_LABELS[family] || "—"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-t border-slate-100 bg-slate-50/60">
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Code</th>
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Libellé</th>
                <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Parent</th>
                <th
                  className="px-6 py-2 text-center text-xs font-semibold text-slate-500"
                  title="Nature normale du solde selon les pratiques comptables (débit ou crédit)"
                >
                  DT/CT
                </th>
                {isCashFlow ? (
                  <th className="px-6 py-2 text-left text-xs font-semibold text-slate-500">Codes associés</th>
                ) : null}
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 w-12" />
              </tr>
            </thead>
            <tbody>
              {sortStandardLinkCodesHierarchically(codes).map((c) => (
                <CodeRow
                  key={c.id}
                  code={c}
                  onEdit={onEdit}
                  onAddCustomChild={onAddCustomChild}
                  showEdit={showEdit}
                  showAttachedColumn={isCashFlow}
                  attachableLabels={attachableLabels}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function CompanyLinkCodesPage() {
  const params = useParams()
  const companyId = params.id as string
  const { refreshUser } = useAuth()
  const { canEdit, isSuperadmin } = usePermissions()
  const canManageGlobalChart = isSuperadmin
  const { groups, loading, error, refetch } = useStandardLinkCodes(false)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editingCode, setEditingCode] = useState<StandardLinkCode | null>(null)
  const [createParentCode, setCreateParentCode] = useState<string | null>(null)
  const [customDraft, setCustomDraft] = useState<{ family: string; parentCode: string | null } | null>(
    null,
  )
  const customCodesRef = useRef<HTMLDivElement>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const consumeCustomDraft = useCallback(() => setCustomDraft(null), [])

  const openCreateDialog = () => {
    setDialogMode("create")
    setEditingCode(null)
    setCreateParentCode(null)
    setDialogOpen(true)
  }

  const openEditDialog = (code: StandardLinkCode) => {
    setDialogMode("edit")
    setEditingCode(code)
    setDialogOpen(true)
  }

  const openCustomCreateUnder = (code: StandardLinkCode) => {
    setCustomDraft({ family: code.family, parentCode: code.code })
    customCodesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleSyncToCompanies = async () => {
    setSyncError(null)
    setSyncMessage(null)
    setSyncing(true)
    try {
      const result = await syncStandardLinkCodesToCompanies()
      setSyncMessage(
        `${result.companies_updated} société${result.companies_updated > 1 ? "s" : ""} mise${result.companies_updated > 1 ? "s" : ""} à jour avec la charte actuelle.`,
      )
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Impossible d'appliquer la charte aux sociétés")
    } finally {
      setSyncing(false)
    }
  }

  const allCodes = groups.flatMap((g) => g.codes)
  const attachableLabels = cashFlowAttachableLinkCodeOptions(allCodes).labels
  const displayGroups = groups

  const filteredGroups = search.trim()
    ? displayGroups
        .map((g) => ({
          ...g,
          codes: g.codes.filter(
            (c) =>
              c.code.toLowerCase().includes(search.toLowerCase()) ||
              (c.label_account || "").toLowerCase().includes(search.toLowerCase()) ||
              (c.label_sub_account || "").toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((g) => g.codes.length > 0)
    : displayGroups

  const totalCodes = allCodes.length
  const totalLeaf = filterMappableLeafLinkCodes(allCodes).length

  const visibleFamilies = filteredGroups.map((g) => g.family)
  const allSectionsExpanded =
    visibleFamilies.length > 0 && visibleFamilies.every((family) => expandedFamilies.has(family))

  useEffect(() => {
    if (!search.trim()) return
    setExpandedFamilies(new Set(visibleFamilies))
  }, [search, visibleFamilies.join(",")])

  const expandAllSections = () => setExpandedFamilies(new Set(visibleFamilies))
  const collapseAllSections = () => setExpandedFamilies(new Set())

  const toggleFamilySection = (family: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-40">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 -top-24 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <div className="mb-8 flex items-start gap-3">
            <div className="w-2" />
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="mb-2 text-4xl font-semibold tracking-tight text-[#E6D6C3]">
                  Codes de liaison
                </h2>
              </div>
              <p className="mb-4 text-base text-[#C9B8A5]/90">
                Charte de comptes standardisée — {totalCodes} codes au total, {totalLeaf} assignables (feuilles)
              </p>
              <p className="mb-6 max-w-4xl text-base leading-relaxed text-[#C9B8A5]/90">
                Consultez et gérez la charte de codes standardisés utilisée pour le mapping comptable
                et la construction des états financiers.
              </p>
              <div className="mb-2 flex flex-wrap items-end gap-6 sm:gap-8">
                <Link href={`/settings/companies/${companyId}`} className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Information de base
                  </span>
                </Link>
                <Link href={`/settings/companies/${companyId}/mapping`} className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Mapping comptable
                  </span>
                </Link>
                <div className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 hover:text-[#E6D6C3]">Code de liaison</span>
                  <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-[#E0742D]" />
                </div>
                <Link href={`/settings/companies/${companyId}/trial-balance`} className="relative border-b border-slate-600/30 pb-4">
                  <span className="text-sm font-normal text-slate-200 transition-colors hover:text-[#E6D6C3]">
                    Balance de vérification
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] space-y-6 px-6">
          <div className={cn("w-full overflow-hidden", dashboardCardFrameStaticClass)}>
            <div className={dashboardCardRingClass} aria-hidden />
            <div className="relative w-full min-w-0">
              <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className={dashboardCardHeaderIconBoxClass}>
                        <Link2 className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className={cn("text-xl leading-tight mb-1", dashboardCardTitleClass)}>
                          Charte de comptes standardisée
                        </h2>
                        <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                          Charte partagée par toutes les sociétés · base par défaut pour le mapping et les états financiers
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3">
                      <input
                        type="search"
                        placeholder="Rechercher un code ou libellé…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E0742D]/40"
                      />
                      {canManageGlobalChart && canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openCreateDialog()}
                        className="whitespace-nowrap border-[#E0742D]/50 bg-white text-[#E0742D] hover:border-[#E0742D] hover:bg-[#E0742D]/5"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau code de liaison
                      </Button>
                    ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={allSectionsExpanded ? collapseAllSections : expandAllSections}
                      disabled={filteredGroups.length === 0}
                      className="whitespace-nowrap border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      {allSectionsExpanded ? (
                        <>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Tout fermer
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Tout ouvrir
                        </>
                      )}
                    </Button>
                    {canManageGlobalChart ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={syncing}
                          className="whitespace-nowrap border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          {syncing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Appliquer à toutes les sociétés
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Appliquer la charte à toutes les sociétés ?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-slate-600">
                              <p>
                                Les structures de compte de résultat, de bilan et de trésorerie de{" "}
                                <strong>toutes les sociétés</strong> seront remplacées par la charte
                                de codes actuelle.
                              </p>
                              <p className="font-medium text-amber-700">
                                Cette action écrase les structures existantes. Les mappings comptables
                                déjà configurés ne sont pas supprimés, mais ils doivent correspondre
                                à des codes encore présents dans la charte.
                              </p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleSyncToCompanies()}
                            className="bg-[#E0742D] text-white hover:bg-[#c96324]"
                          >
                            Appliquer la charte
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    ) : null}
                  </div>
                </div>
              </div>

              {syncMessage ? (
                <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm text-emerald-800">
                  {syncMessage}
                </div>
              ) : null}
              {syncError ? (
                <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                  {syncError}
                </div>
              ) : null}
              {!canManageGlobalChart && canEdit ? (
                <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 text-sm text-slate-600">
                  La charte globale est en lecture seule. Pour ajouter un code propre à cette société, utilisez la
                  section <strong>Codes personnalisés</strong> ci-dessous ou le bouton{" "}
                  <strong>Ajouter un code</strong> sur un poste parent.
                </div>
              ) : null}

              {loading ? (
                <div className="flex min-h-[200px] items-center justify-center bg-white/80">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : error ? (
                <div className="flex min-h-[200px] items-center justify-center bg-white/80">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="flex min-h-[200px] items-center justify-center bg-white/80">
                  <p className="text-sm text-slate-500">
                    {search ? "Aucun code ne correspond à votre recherche." : "Aucun code de liaison trouvé."}
                  </p>
                </div>
              ) : (
                <div className="bg-white/80">
                  {filteredGroups.map((g) => (
                    <FamilySection
                      key={g.family}
                      family={g.family}
                      accountType={g.account_type}
                      codes={g.codes}
                      onEdit={openEditDialog}
                      onAddCustomChild={!canManageGlobalChart && canEdit ? openCustomCreateUnder : undefined}
                      showEdit={canManageGlobalChart}
                      attachableLabels={attachableLabels}
                      expanded={expandedFamilies.has(g.family)}
                      onToggle={() => toggleFamilySection(g.family)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {canEdit && !canManageGlobalChart ? (
            <div ref={customCodesRef}>
              <CompanyCustomLinkCodes
                companyId={companyId}
                standardCodes={allCodes}
                draft={customDraft}
                onDraftConsumed={consumeCustomDraft}
              />
            </div>
          ) : null}
        </div>
      </div>

      {canManageGlobalChart ? (
      <StandardLinkCodeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialCode={editingCode}
        familyCodes={allCodes}
        defaultParentCode={createParentCode}
        onSaved={refetch}
      />
      ) : null}
    </div>
  )
}
