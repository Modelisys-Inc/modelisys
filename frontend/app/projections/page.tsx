import { DashboardHeader } from "@/components/dashboard-header"
import { ProjectionsCards } from "@/components/projections-cards"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ProjectionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Retour au tableau de bord</span>
            </Link>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4 text-balance">Projections</h1>
            <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
              Créez et gérez vos projections financières pour planifier l'avenir de votre entreprise
            </p>
          </div>
          <ProjectionsCards />
        </div>
      </main>
    </div>
  )
}

