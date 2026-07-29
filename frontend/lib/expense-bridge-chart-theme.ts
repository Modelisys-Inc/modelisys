/** Palette du pont de rentabilité (Dépenses) — contrastes marqués entre postes. */
export const EXPENSE_BRIDGE_CHART_COLORS = {
  /** Ligne — total CA */
  revenue: "#2563EB",
  /** Barre — charges directes */
  variableCosts: "#DC2626",
  /** Barre — structure */
  fixedCosts: "#6366F1",
  /** Barre — résultat opérationnel */
  operatingProfit: "#059669",
  /** Ligne pointillée — après CV (accent diagnostic, distinct du vert BE) */
  contributiveMargin: "#E0742D",
} as const
