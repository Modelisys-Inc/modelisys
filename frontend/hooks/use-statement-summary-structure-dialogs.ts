"use client"

import { useCallback, useMemo, useState } from "react"
import type { useStatementStructureEdit } from "@/hooks/use-income-statement-structure-edit"
import {
  isStructureRowDetailOnly,
  isStructureRowEmptyLabel,
} from "@/lib/income-statement-structure-utils"

export type StatementStructureEditHandle = ReturnType<typeof useStatementStructureEdit>

export type SpacerTargetPost = { globalIdx: number; label: string }

export function useStatementSummaryStructureDialogs(structEdit: StatementStructureEditHandle) {
  const [addSpaceDialogOpen, setAddSpaceDialogOpen] = useState(false)
  const [addSpacePlacement, setAddSpacePlacement] = useState<"above" | "below">("above")
  const [addSpaceTargetIdx, setAddSpaceTargetIdx] = useState<number | null>(null)

  const [addPostDialogOpen, setAddPostDialogOpen] = useState(false)
  const [addPostStep, setAddPostStep] = useState<"anchor" | "kind">("anchor")
  const [addPostAnchorIdx, setAddPostAnchorIdx] = useState<number | null>(null)
  const [addPostRefLabel, setAddPostRefLabel] = useState("")
  const [addPostRank, setAddPostRank] = useState<"primary" | "secondary">("secondary")
  const [addPostBold, setAddPostBold] = useState(false)
  const [addPostPresentationOnly, setAddPostPresentationOnly] = useState(false)
  const [addPostPlacement, setAddPostPlacement] = useState<"above" | "below">("above")
  const [editingPostGlobalIdx, setEditingPostGlobalIdx] = useState<number | null>(null)

  const spacerTargetPosts = useMemo((): SpacerTargetPost[] => {
    const s = structEdit.structure
    if (!s.length) return []
    const out: SpacerTargetPost[] = []
    for (let i = 0; i < s.length; i++) {
      const r = s[i]!
      if (isStructureRowDetailOnly(r)) continue
      if (isStructureRowEmptyLabel(r)) continue
      const label = String(r.label ?? "").trim()
      out.push({ globalIdx: i, label: label || `Poste ${i + 1}` })
    }
    return out
  }, [structEdit.structure])

  const resetAddPostDialog = useCallback(() => {
    setAddPostStep("anchor")
    setAddPostAnchorIdx(null)
    setAddPostRefLabel("")
    setAddPostRank("secondary")
    setAddPostBold(false)
    setAddPostPresentationOnly(false)
    setAddPostPlacement("above")
    setEditingPostGlobalIdx(null)
  }, [])

  const resetAddSpaceDialog = useCallback(() => {
    setAddSpacePlacement("above")
    setAddSpaceTargetIdx(null)
  }, [])

  const openAddSpaceDialog = useCallback(() => {
    if (spacerTargetPosts.length === 0) {
      structEdit.insertEmptySpacerAbove(0)
      return
    }
    const first = spacerTargetPosts[0]!
    setAddSpaceTargetIdx(first.globalIdx)
    setAddSpacePlacement("above")
    setAddSpaceDialogOpen(true)
  }, [spacerTargetPosts, structEdit])

  const openAddPostDialog = useCallback(() => {
    resetAddPostDialog()
    if (spacerTargetPosts.length === 0) {
      setAddPostAnchorIdx(0)
      setAddPostRefLabel("Début du sommaire")
      setAddPostStep("kind")
      setAddPostPresentationOnly(true)
    } else {
      const first = spacerTargetPosts[0]!
      setAddPostAnchorIdx(first.globalIdx)
      setAddPostRefLabel(first.label)
      setAddPostStep("anchor")
      setAddPostPresentationOnly(false)
    }
    setAddPostDialogOpen(true)
  }, [resetAddPostDialog, spacerTargetPosts])

  const beginEditPostPresentation = useCallback(
    (globalIdx: number) => {
      const r = structEdit.structure[globalIdx]
      if (!r || isStructureRowEmptyLabel(r)) return
      setEditingPostGlobalIdx(globalIdx)
      setAddPostRank(typeof r.indent === "boolean" && r.indent ? "secondary" : "primary")
      setAddPostBold(r.isBold === true)
      setAddPostStep("kind")
      setAddPostPresentationOnly(false)
      setAddPostDialogOpen(true)
    },
    [structEdit.structure]
  )

  return {
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
    openAddSpaceDialog,
    openAddPostDialog,
    beginEditPostPresentation,
  }
}
