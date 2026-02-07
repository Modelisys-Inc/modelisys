/**
 * Deterministic pseudo-random number generator.
 * Use instead of Math.random() in render-time code to prevent
 * Next.js server/client hydration mismatches.
 */
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Generate a unique ID for client-side use (adjustments, notes, etc.).
 * Uses crypto.randomUUID() instead of Math.random().
 */
export const generateId = (prefix?: string): string => {
  const uuid = crypto.randomUUID()
  return prefix ? `${prefix}-${uuid}` : uuid
}
