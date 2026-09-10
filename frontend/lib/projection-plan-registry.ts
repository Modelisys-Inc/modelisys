import {
  normalizeCompletedProjectionPlanSteps,
  type ProjectionPlanPhase,
  type ProjectionPlanPhaseId,
} from "@/lib/projection-plan-phases"

const STORAGE_KEY = "modelisys-projection-plan-progress"

type ProjectionPlanProgressStore = Record<string, ProjectionPlanPhaseId[]>

function readStore(): ProjectionPlanProgressStore {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    return parsed as ProjectionPlanProgressStore
  } catch {
    return {}
  }
}

function writeStore(store: ProjectionPlanProgressStore) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getProjectionPlanCompletedSteps(
  projectionId: string,
): ProjectionPlanPhaseId[] {
  const store = readStore()
  return normalizeCompletedProjectionPlanSteps(store[projectionId])
}

export function markProjectionPlanStepComplete(
  projectionId: string,
  step: ProjectionPlanPhaseId,
): ProjectionPlanPhaseId[] {
  const store = readStore()
  const existing = normalizeCompletedProjectionPlanSteps(store[projectionId])
  if (existing.includes(step)) return existing
  const next = [...existing, step]
  store[projectionId] = next
  writeStore(store)
  return next
}

export function projectionDashboardPath(
  projectionId: string,
  companyId?: string | null,
  tab?: string,
): string {
  const params = new URLSearchParams()
  if (companyId) params.set("companyId", companyId)
  if (tab && tab !== "parcours") params.set("tab", tab)
  const qs = params.toString()
  return qs ? `/projections/${projectionId}?${qs}` : `/projections/${projectionId}`
}

export function projectionPlanBackHref(searchParams: {
  get: (key: string) => string | null
}): string {
  const projectionId = searchParams.get("projectionId")
  const companyId = searchParams.get("companyId")
  if (!projectionId) {
    return companyId ? `/projections?companyId=${companyId}` : "/projections"
  }
  return projectionDashboardPath(projectionId, companyId)
}

export function projectionToolPath(
  projectionId: string,
  companyId: string | null | undefined,
  phase: ProjectionPlanPhase,
): string {
  const params = new URLSearchParams()
  params.set("projectionId", projectionId)
  if (companyId) params.set("companyId", companyId)
  params.set("view", "assumptions")
  params.set("hypothesis", phase.hypothesis)
  return `/projections/pro-forma?${params.toString()}`
}

export function projectionStatementPath(
  projectionId: string,
  companyId: string | null | undefined,
  view: "income-statement" | "balance-sheet" | "cash-flow",
): string {
  const params = new URLSearchParams()
  params.set("projectionId", projectionId)
  if (companyId) params.set("companyId", companyId)
  params.set("view", view)
  return `/projections/pro-forma?${params.toString()}`
}
