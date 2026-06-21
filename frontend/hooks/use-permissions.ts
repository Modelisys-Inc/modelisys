"use client"

import { useAuth } from "@/contexts/auth-context"

/**
 * Permission helpers derived from the current user's role.
 *
 * Viewers are read-only across the app; the backend already enforces this (403
 * on writes), but the UI uses `canEdit` to hide edit controls so viewers don't
 * see buttons that would fail. Members and admins (and superadmins) can edit —
 * per-company write authorization is still enforced server-side.
 */
export function usePermissions() {
  const { user, organizations, isLoading } = useAuth()
  const role = organizations[0]?.role ?? null
  const isSuperadmin = !!user?.is_superadmin
  const isViewer = role === "viewer"
  const isAdmin = role === "admin"

  return {
    role,
    isSuperadmin,
    isAdmin,
    isViewer,
    /** Can the user edit data (not a viewer)? */
    canEdit: isSuperadmin || (role !== null && role !== "viewer"),
    loading: isLoading,
  }
}
