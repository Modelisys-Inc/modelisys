import type { Metadata } from "next"
import { GlassmorphismNav } from "@/components/glassmorphism-nav"
import { ServicesPageSection } from "@/components/services-page-section"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Services | Modelisys",
  description:
    "Mandats ponctuels, accompagnement financier, licence du moteur Excel Modelisys et développement sur mesure — pour comprendre, planifier et agir sur la valeur de votre entreprise.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services | Modelisys",
    description:
      "Mandats ponctuels, accompagnement financier, licence Excel et développement sur mesure adaptés à votre réalité.",
    url: "/services",
  },
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50">
      <div className="relative z-10">
        <GlassmorphismNav />
        <ServicesPageSection />
        <Footer />
      </div>
    </div>
  )
}
