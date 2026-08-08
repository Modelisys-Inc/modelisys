"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getPilotageSectionComments,
  savePilotageSectionComment,
} from "@/lib/pilotage-section-comments"

export function usePilotageSectionComments(pilotageId: string) {
  const [comments, setComments] = useState(() => getPilotageSectionComments(pilotageId))

  useEffect(() => {
    setComments(getPilotageSectionComments(pilotageId))
  }, [pilotageId])

  const getComment = useCallback((blockId: string) => comments.comments[blockId] ?? "", [comments])

  const setComment = useCallback(
    (blockId: string, text: string) => {
      const saved = savePilotageSectionComment(pilotageId, blockId, text)
      setComments(saved)
    },
    [pilotageId],
  )

  return { getComment, setComment }
}
