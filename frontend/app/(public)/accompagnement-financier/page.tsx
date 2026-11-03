import type { Metadata } from "next"
import { AccompagnementClose } from "@/components/accompagnement-close"
import { AccompagnementRail } from "@/components/accompagnement-rail"
import { Footer } from "@/components/footer"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { HeroMarquee } from "@/components/hero-marquee"
import { HeroSection } from "@/components/hero-section"
import { LandingApprocheSection } from "@/components/landing-approche-section"
import { LandingBusinessReturnSection } from "@/components/landing-business-return-section"
import { LandingObjectifSection } from "@/components/landing-objectif-section"
import { LandingRapportSection } from "@/components/landing-rapport-section"

export const metadata: Metadata = {
  title: "Accompagnement financier fractionnaire | Modelisys",
  description:
    "Accompagnement financier fractionnaire pour les PME : lecture de la performance, pont de valeur, approche Modelisys et diagnostic financier.",
}

export default function AccompagnementFinancierPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <GlassmorphismNav />
      <main>
        <HeroSection />
        <HeroMarquee />
        <AccompagnementRail>
          <LandingBusinessReturnSection tone="light" />
          <LandingObjectifSection />
          <LandingApprocheSection />
          <LandingRapportSection plain />
          <AccompagnementClose />
        </AccompagnementRail>
      </main>
      <Footer />
    </div>
  )
}
