import type { Metadata } from "next"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { PricingProcessSection } from "@/components/pricing-process-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Tarification | Modelisys",
  description:
    "Configuration, abonnement et accompagnement stratégique — découvrez la tarification Modelisys et estimez vos coûts selon votre structure.",
}

export default function TarificationPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <GlassmorphismNav />
          <PricingProcessSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
