"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  StatementStructureEditHandle,
} from "@/hooks/use-statement-summary-structure-dialogs"
import type { useStatementSummaryStructureDialogs } from "@/hooks/use-statement-summary-structure-dialogs"
import {
  dashboardCardAccentBarClass,
  dashboardCardBodyMutedClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"
import { cn } from "@/lib/utils"
import { AlignLeft, ArrowLeft, IndentIncrease, Sparkles } from "lucide-react"

type DialogsState = ReturnType<typeof useStatementSummaryStructureDialogs>

interface StatementSummaryStructureDialogsProps {
  structEdit: StatementStructureEditHandle
  dialogs: DialogsState
  idPrefix?: string
}

export function StatementSummaryStructureDialogs({
  structEdit,
  dialogs,
  idPrefix = "sss",
}: StatementSummaryStructureDialogsProps) {
  const {
    addSpaceDialogOpen,
    setAddSpaceDialogOpen,
    addSpacePlacement,
    setAddSpacePlacement,
    addSpaceTargetIdx,
    setAddSpaceTargetIdx,
    addPostDialogOpen,
    setAddPostDialogOpen,
    addPostStep,
    setAddPostStep,
    addPostAnchorIdx,
    setAddPostAnchorIdx,
    addPostRefLabel,
    setAddPostRefLabel,
    addPostRank,
    setAddPostRank,
    addPostBold,
    setAddPostBold,
    addPostPresentationOnly,
    addPostPlacement,
    setAddPostPlacement,
    editingPostGlobalIdx,
    spacerTargetPosts,
    resetAddPostDialog,
    resetAddSpaceDialog,
  } = dialogs

  return (
    <>
      <Dialog
        open={addSpaceDialogOpen}
        onOpenChange={(open) => {
          setAddSpaceDialogOpen(open)
          if (!open) resetAddSpaceDialog()
        }}
      >
        <DialogContent
          showCloseButton
          className="top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[calc(100dvh-1.5rem)] w-[min(100%,calc(100vw-1rem))] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-900/10 sm:max-w-2xl"
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className={cn("mt-0.5 h-11 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
            <DialogHeader className="min-w-0 flex-1 gap-0 space-y-2 text-left sm:text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className={cn("text-lg", dashboardCardTitleClass)}>Ajouter un espace</DialogTitle>
                <Badge
                  variant="secondary"
                  className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                >
                  <Sparkles className="h-3 w-3 text-[#E0742D]" />
                  Sommaire
                </Badge>
              </div>
              <DialogDescription className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                Indiquez si la ligne vide est insérée{" "}
                <span className="font-medium text-[#2A2F3A]">au-dessus</span> ou{" "}
                <span className="font-medium text-[#2A2F3A]">en dessous</span> d’un poste du sommaire, puis choisissez ce
                poste.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-7">
              <section className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Position</p>
                <RadioGroup
                  value={addSpacePlacement}
                  onValueChange={(v) => setAddSpacePlacement(v as "above" | "below")}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <Label
                    htmlFor={`${idPrefix}-space-placement-above`}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                      addSpacePlacement === "above"
                        ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                    )}
                  >
                    <RadioGroupItem
                      value="above"
                      id={`${idPrefix}-space-placement-above`}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[15px] font-semibold text-[#2A2F3A]">Au-dessus</span>
                      <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                        Ligne vide placée avant le poste choisi.
                      </span>
                    </span>
                  </Label>
                  <Label
                    htmlFor={`${idPrefix}-space-placement-below`}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                      addSpacePlacement === "below"
                        ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                    )}
                  >
                    <RadioGroupItem
                      value="below"
                      id={`${idPrefix}-space-placement-below`}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[15px] font-semibold text-[#2A2F3A]">En dessous</span>
                      <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                        Ligne vide placée après le poste choisi.
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
              </section>
              <section className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Poste de référence</p>
                <Select
                  value={addSpaceTargetIdx !== null ? String(addSpaceTargetIdx) : undefined}
                  onValueChange={(v) => {
                    const idx = Number.parseInt(v, 10)
                    if (Number.isNaN(idx)) return
                    setAddSpaceTargetIdx(idx)
                  }}
                >
                  <SelectTrigger
                    size="default"
                    className="h-11 w-full max-w-none rounded-xl border-slate-200 bg-white px-4 text-left text-[#2A2F3A] shadow-sm"
                  >
                    <SelectValue placeholder="Choisir un poste du sommaire" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {spacerTargetPosts.map(({ globalIdx, label }) => (
                      <SelectItem key={globalIdx} value={String(globalIdx)} className="rounded-lg">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-3 border-t border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-300 bg-white text-[#2A2F3A] hover:bg-slate-50"
              onClick={() => setAddSpaceDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
              disabled={addSpaceTargetIdx === null}
              onClick={() => {
                if (addSpaceTargetIdx === null) return
                if (addSpacePlacement === "above") {
                  structEdit.insertEmptySpacerAbove(addSpaceTargetIdx)
                } else {
                  structEdit.insertEmptySpacerBelow(addSpaceTargetIdx)
                }
                setAddSpaceDialogOpen(false)
                resetAddSpaceDialog()
              }}
            >
              Insérer l&apos;espace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addPostDialogOpen}
        onOpenChange={(open) => {
          setAddPostDialogOpen(open)
          if (!open) resetAddPostDialog()
        }}
      >
        <DialogContent
          showCloseButton
          className="top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[calc(100dvh-1.5rem)] w-[min(100%,calc(100vw-1rem))] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-900/10 sm:max-w-2xl"
        >
          <div className="flex shrink-0 items-start gap-3 border-b border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className={cn("mt-0.5 h-11 w-1.5 shrink-0", dashboardCardAccentBarClass)} />
            <DialogHeader className="min-w-0 flex-1 gap-0 space-y-2 text-left sm:text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className={cn("text-lg", dashboardCardTitleClass)}>
                  {editingPostGlobalIdx !== null
                    ? "Modifier le poste"
                    : addPostStep === "anchor"
                      ? "Ajouter un poste"
                      : "Présentation du poste"}
                </DialogTitle>
                {editingPostGlobalIdx !== null ? (
                  <Badge
                    variant="secondary"
                    className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                  >
                    <Sparkles className="h-3 w-3 text-[#E0742D]" />
                    Modification
                  </Badge>
                ) : (
                  !addPostPresentationOnly && (
                    <Badge
                      variant="secondary"
                      className="border border-slate-200 bg-slate-100/90 font-medium text-[#2A2F3A] shadow-none"
                    >
                      <Sparkles className="h-3 w-3 text-[#E0742D]" />
                      {addPostStep === "anchor" ? "Étape 1 · Emplacement" : "Étape 2 · Style"}
                    </Badge>
                  )
                )}
              </div>
              <DialogDescription className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                {addPostStep === "anchor" ? (
                  <>
                    Choisissez d’abord si le poste est inséré{" "}
                    <span className="font-medium text-[#2A2F3A]">au-dessus</span> ou{" "}
                    <span className="font-medium text-[#2A2F3A]">en dessous</span>, puis le poste de référence dans la
                    liste.
                  </>
                ) : editingPostGlobalIdx !== null ? (
                  <>
                    Ajustez le niveau au sommaire et la typographie pour «{" "}
                    <span className="font-medium text-[#2A2F3A]">
                      {String(structEdit.structure[editingPostGlobalIdx]?.label ?? "").trim() || "—"}
                    </span>
                    ».
                  </>
                ) : addPostPresentationOnly ? (
                  <>Définissez le niveau et la typographie du poste au sommaire.</>
                ) : (
                  <>
                    Le poste sera inséré{" "}
                    {addPostPlacement === "above" ? "au-dessus" : "en dessous"} de «{" "}
                    <span className="font-medium text-[#2A2F3A]">{addPostRefLabel}</span> ». Définissez son niveau au
                    sommaire.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          {addPostStep === "anchor" ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-7">
                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Position</p>
                    <RadioGroup
                      value={addPostPlacement}
                      onValueChange={(v) => setAddPostPlacement(v as "above" | "below")}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <Label
                        htmlFor={`${idPrefix}-post-placement-above`}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                          addPostPlacement === "above"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="above"
                          id={`${idPrefix}-post-placement-above`}
                          className="mt-0.5 shrink-0"
                        />
                        <span className="min-w-0 leading-snug">
                          <span className="block text-[15px] font-semibold text-[#2A2F3A]">Au-dessus</span>
                          <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                            Le nouveau poste est placé avant le poste choisi.
                          </span>
                        </span>
                      </Label>
                      <Label
                        htmlFor={`${idPrefix}-post-placement-below`}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3.5 transition sm:px-5 sm:py-4",
                          addPostPlacement === "below"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="below"
                          id={`${idPrefix}-post-placement-below`}
                          className="mt-0.5 shrink-0"
                        />
                        <span className="min-w-0 leading-snug">
                          <span className="block text-[15px] font-semibold text-[#2A2F3A]">En dessous</span>
                          <span className={cn("mt-0.5 block text-[13px]", dashboardCardBodyMutedClass)}>
                            Le nouveau poste est placé après le poste choisi.
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </section>
                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Poste de référence</p>
                    <Select
                      value={addPostAnchorIdx !== null ? String(addPostAnchorIdx) : undefined}
                      onValueChange={(v) => {
                        const idx = Number.parseInt(v, 10)
                        if (Number.isNaN(idx)) return
                        const p = spacerTargetPosts.find((x) => x.globalIdx === idx)
                        setAddPostAnchorIdx(idx)
                        if (p) setAddPostRefLabel(p.label)
                      }}
                    >
                      <SelectTrigger
                        size="default"
                        className="h-11 w-full max-w-none rounded-xl border-slate-200 bg-white px-4 text-left text-[#2A2F3A] shadow-sm"
                      >
                        <SelectValue placeholder="Choisir un poste du sommaire" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {spacerTargetPosts.map(({ globalIdx, label }) => (
                          <SelectItem key={globalIdx} value={String(globalIdx)} className="rounded-lg">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </section>
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-3 border-t border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:justify-end sm:px-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-300 bg-white text-[#2A2F3A] hover:bg-slate-50"
                  onClick={() => setAddPostDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
                  disabled={addPostAnchorIdx === null}
                  onClick={() => {
                    if (addPostAnchorIdx === null) return
                    setAddPostStep("kind")
                  }}
                >
                  Continuer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-col gap-7 sm:gap-8">
                  {!addPostPresentationOnly && (
                    <section className="space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Poste de référence
                      </p>
                      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200/80">
                            {addPostPlacement === "above" ? "Inséré au-dessus de" : "Inséré en dessous de"}
                          </span>
                          <span className="min-w-0 flex-1 text-base font-semibold leading-snug text-[#2A2F3A]">
                            {addPostRefLabel}
                          </span>
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="space-y-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Niveau au sommaire
                    </p>
                    <RadioGroup
                      value={addPostRank}
                      onValueChange={(v) => setAddPostRank(v as "primary" | "secondary")}
                      className="flex flex-col gap-4"
                    >
                      <Label
                        htmlFor={`${idPrefix}-post-kind-primary`}
                        className={cn(
                          "flex cursor-pointer gap-4 rounded-2xl border px-4 py-4 transition sm:px-5 sm:py-[1.125rem]",
                          addPostRank === "primary"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="primary"
                          id={`${idPrefix}-post-kind-primary`}
                          className="mt-1.5 shrink-0 sm:mt-2"
                        />
                        <span className="flex min-w-0 flex-1 items-start gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
                            <AlignLeft className="h-[1.125rem] w-[1.125rem] text-slate-600" />
                          </span>
                          <span className="min-w-0 space-y-1.5 pt-0.5 leading-snug">
                            <span className="block text-[15px] font-semibold text-[#2A2F3A]">Poste principal</span>
                            <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                              Aligné à gauche, sans décalage (titres de section, totaux, etc.)
                            </span>
                          </span>
                        </span>
                      </Label>
                      <Label
                        htmlFor={`${idPrefix}-post-kind-secondary`}
                        className={cn(
                          "flex cursor-pointer gap-4 rounded-2xl border px-4 py-4 transition sm:px-5 sm:py-[1.125rem]",
                          addPostRank === "secondary"
                            ? "border-[#E0742D]/45 bg-orange-50/50 shadow-sm ring-2 ring-[#E0742D]/20"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/90"
                        )}
                      >
                        <RadioGroupItem
                          value="secondary"
                          id={`${idPrefix}-post-kind-secondary`}
                          className="mt-1.5 shrink-0 sm:mt-2"
                        />
                        <span className="flex min-w-0 flex-1 items-start gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
                            <IndentIncrease className="h-[1.125rem] w-[1.125rem] text-slate-600" />
                          </span>
                          <span className="min-w-0 space-y-1.5 pt-0.5 leading-snug">
                            <span className="block text-[15px] font-semibold text-[#2A2F3A]">Poste secondaire</span>
                            <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                              Décalé vers la droite (sous-postes, détails)
                            </span>
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </section>

                  <section className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Typographie</p>
                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm sm:p-5">
                      <label className="flex cursor-pointer items-start gap-4">
                        <Checkbox
                          checked={addPostBold}
                          onCheckedChange={(v) => setAddPostBold(v === true)}
                          className="mt-0.5 shrink-0 border-slate-300 data-[state=checked]:border-[#2A2F3A] data-[state=checked]:bg-[#2A2F3A]"
                        />
                        <span className="min-w-0 space-y-1.5 text-[#2A2F3A]">
                          <span className="block text-[15px] font-semibold">Mettre en gras</span>
                          <span className={cn("block text-[13px] leading-relaxed", dashboardCardBodyMutedClass)}>
                            Libellé en gras au sommaire une fois la structure enregistrée.
                          </span>
                        </span>
                      </label>
                    </div>
                  </section>
                </div>
              </div>

              <DialogFooter
                className={cn(
                  "shrink-0 gap-3 border-t border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:px-6",
                  !addPostPresentationOnly && editingPostGlobalIdx === null ? "sm:justify-between" : "sm:justify-end"
                )}
              >
                {!addPostPresentationOnly && editingPostGlobalIdx === null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-xl text-[#5C5F66] hover:bg-slate-100"
                    onClick={() => setAddPostStep("anchor")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </Button>
                )}
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-300 bg-white text-[#2A2F3A] hover:bg-slate-50"
                    onClick={() => setAddPostDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-[#2A2F3A] px-4 font-semibold text-[#E6D6C3] shadow-sm transition hover:bg-[#353b47] disabled:opacity-60"
                    disabled={editingPostGlobalIdx === null && addPostAnchorIdx === null}
                    onClick={() => {
                      if (editingPostGlobalIdx !== null) {
                        structEdit.updateRow(editingPostGlobalIdx, {
                          indent: addPostRank === "secondary",
                          isBold: addPostBold,
                        })
                        setAddPostDialogOpen(false)
                        resetAddPostDialog()
                        return
                      }
                      if (addPostAnchorIdx === null) return
                      const opts = {
                        indent: addPostRank === "secondary",
                        isBold: addPostBold,
                      }
                      if (addPostPresentationOnly) {
                        structEdit.insertPostAbove(0, opts)
                      } else if (addPostPlacement === "above") {
                        structEdit.insertPostAbove(addPostAnchorIdx, opts)
                      } else {
                        structEdit.insertPostBelow(addPostAnchorIdx, opts)
                      }
                      setAddPostDialogOpen(false)
                      resetAddPostDialog()
                    }}
                  >
                    {editingPostGlobalIdx !== null ? "Enregistrer" : "Ajouter le poste"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
