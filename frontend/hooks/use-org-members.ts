"use client"

import { useState, useEffect, useCallback } from "react"
import {
  listOrgMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  type OrgMember,
} from "@/lib/api"

interface UseOrgMembersReturn {
  members: OrgMember[]
  loading: boolean
  error: string | null
  reload: () => void
  invite: (email: string, role: string) => Promise<OrgMember>
  changeRole: (userId: string, role: string) => Promise<OrgMember>
  remove: (userId: string) => Promise<void>
}

export function useOrgMembers(orgId: string | null): UseOrgMembersReturn {
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    if (!orgId) {
      setMembers([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    listOrgMembers(orgId)
      .then((data) => {
        if (!cancelled) setMembers(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to fetch members")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [orgId, reloadCounter])

  const reload = useCallback(() => setReloadCounter((c) => c + 1), [])

  const invite = useCallback(
    async (email: string, role: string) => {
      if (!orgId) throw new Error("No organization selected")
      const member = await inviteMember(orgId, { email, role })
      setMembers((prev) => [...prev, member])
      return member
    },
    [orgId]
  )

  const changeRole = useCallback(
    async (userId: string, role: string) => {
      if (!orgId) throw new Error("No organization selected")
      const updated = await updateMemberRole(orgId, userId, role)
      setMembers((prev) => prev.map((m) => (m.id === userId ? updated : m)))
      return updated
    },
    [orgId]
  )

  const remove = useCallback(
    async (userId: string) => {
      if (!orgId) throw new Error("No organization selected")
      await removeMember(orgId, userId)
      setMembers((prev) => prev.filter((m) => m.id !== userId))
    },
    [orgId]
  )

  return { members, loading, error, reload, invite, changeRole, remove }
}
