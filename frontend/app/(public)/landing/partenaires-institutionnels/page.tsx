import type { Metadata } from "next"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { InstitutionalPartnersHeroSection } from "@/components/institutional-partners-hero-section"
import { InstitutionalPartnersPillarsSection } from "@/components/institutional-partners-pillars-section"
import { InstitutionalPartnersBenefitsSection } from "@/components/institutional-partners-benefits-section"
import { InstitutionalPartnersProgramSection } from "@/components/institutional-partners-program-section"
import { InstitutionalPartnersProcessSection } from "@/components/institutional-partners-process-section"
import { InstitutionalPartnersContactTransitionSection } from "@/components/institutional-partners-contact-transition-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Partenaires institutionnels | Modelisys",
  description:
    "Modelisys pour les institutions financières et les grands organismes : analyse, crédit, investissement et collaboration avec les PME sur une plateforme commune.",
}

export default function PartenairesInstitutionnelsLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <main className="min-h-screen relative">
        <div className="relative z-10">
          <GlassmorphismNav />
          <InstitutionalPartnersHeroSection />
          <InstitutionalPartnersPillarsSection />
          <InstitutionalPartnersBenefitsSection />
          <InstitutionalPartnersProgramSection />
          <InstitutionalPartnersProcessSection />
          <InstitutionalPartnersContactTransitionSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
