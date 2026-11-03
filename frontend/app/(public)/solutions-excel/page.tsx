import type { Metadata } from "next"
import { SolutionsExcelView } from "@/components/solutions-excel-view"

export const metadata: Metadata = {
  title: "Solutions Excel | Modelisys",
  description:
    "Outils Excel sur mesure pour les PME : automatisation, tableaux de bord, reporting consolidé, soumissions et modèles financiers. Chiffre d’affaires de 1 M$ à 100 M$. Sur devis.",
}

export default function SolutionsExcelPage() {
  return <SolutionsExcelView />
}
