import type { Metadata } from "next"
import { Footer } from "@/components/footer"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { RapportAnnuelView } from "@/components/rapport-annuel-view"

export const metadata: Metadata = {
  title: "Diagnostic financier et planification | Modelisys",
  description:
    "Exemple de diagnostic financier et planification pour Entreprise Inc. : sommaire exécutif, performance, situation financière, trajectoire, valorisation et plan d’action.",
}

export default function RapportDeGestionPage() {
  return (
    <>
      <GlassmorphismNav />
      <RapportAnnuelView />
      <Footer />
    </>
  )
}
