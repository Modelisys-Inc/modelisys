/**
 * Routes accessibles sans session (cookie `has_session` / utilisateur chargé).
 * Source unique pour le middleware et le AuthProvider afin d’éviter les divergences.
 */
export const PUBLIC_PATHS = [
  "/login",
  "/privacy",
  "/clause-de-non-responsabilite",
  "/blog",
  "/contact",
  "/a-propos",
  "/cabinets-comptables",
  "/partenaires-financiers",
  "/partenaires-institutionnels",
  "/partenaires-capital",
  "/forgot-password",
  "/reset-password",
] as const

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true
  return (PUBLIC_PATHS as readonly string[]).some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
