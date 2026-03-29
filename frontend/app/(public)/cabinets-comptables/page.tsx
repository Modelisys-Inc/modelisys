import type { Metadata } from "next"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { CabinetsComptablesHeroSection } from "@/components/cabinets-comptables-hero-section"
import { CabinetsPartnerBenefitsSection } from "@/components/cabinets-partner-benefits-section"
import { CabinetsPartnerProgramSection } from "@/components/cabinets-partner-program-section"
import { CabinetsPartnerContactTransitionSection } from "@/components/cabinets-partner-contact-transition-section"
import { CabinetsPartnerProcessSection } from "@/components/cabinets-partner-process-section"
import { CabinetsPillarsSection } from "@/components/cabinets-pillars-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Partenaires comptables | Modelisys",
  description:
    "Modelisys pour les partenaires comptables : portail sécurisé, collaboration et analyses financières partagées avec vos clients.",
}

export default function CabinetsComptablesLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <GlassmorphismNav />
          <CabinetsComptablesHeroSection />
          <CabinetsPillarsSection />
          <CabinetsPartnerBenefitsSection />
          <CabinetsPartnerProgramSection />
          <CabinetsPartnerProcessSection />
          <CabinetsPartnerContactTransitionSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
