import { redirect } from "next/navigation"

/** Ancienne URL : conservée pour les liens existants. */
export default function PartenairesInstitutionnelsRedirectPage() {
  redirect("/partenaires-financiers")
}
