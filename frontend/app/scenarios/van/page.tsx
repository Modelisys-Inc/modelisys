"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function VANPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="VAN (Valeur Actuelle Nette)" description="Analysez la valeur actuelle nette de vos scénarios d'investissement" />
      <main className="w-full py-12">
        <div className="mb-8 px-6">
          <Link
            href="/scenarios"
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour aux scénarios</span>
          </Link>
        </div>
        <div className="px-6">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <p className="text-muted-foreground">Contenu VAN à venir...</p>
          </div>
        </div>
      </main>
    </div>
  )
}

