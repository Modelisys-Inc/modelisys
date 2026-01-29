import { DashboardHeader } from "@/components/dashboard-header"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ResourcesPage() {
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
              <span className="text-sm font-medium">Retour à la configuration comptable</span>
            </Link>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4 text-balance">Ressources</h1>
            <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
              Accédez à la documentation, aux guides et aux ressources utiles pour utiliser la plateforme
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <p className="text-muted-foreground">Contenu des ressources à venir...</p>
          </div>
        </div>
      </main>
    </div>
  )
}

