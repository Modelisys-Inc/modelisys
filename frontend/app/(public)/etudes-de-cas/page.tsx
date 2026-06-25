import type { Metadata } from "next"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { CaseStudiesSection } from "@/components/case-studies-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Études de cas | Modelisys",
  description:
    "Découvrez comment l'approche Modelisys s'applique à des contextes réels — du diagnostic au pilotage, en passant par la planification de la trajectoire de valeur.",
}

export default function EtudesDeCasPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <GlassmorphismNav />
          <CaseStudiesSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
