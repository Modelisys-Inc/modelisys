"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RevenueByCustomerPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Revenus par clients" description="Visualisez la contribution de chaque client à vos revenus et identifiez vos clients clés" />
      <main className="w-full py-12">
        <div className="mb-8 px-6">
          <Link
            href="/analysis"
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour à l'analyse</span>
          </Link>
        </div>
        <div className="px-6">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <p className="text-muted-foreground">Contenu de l'analyse des revenus par clients à venir...</p>
          </div>
        </div>
      </main>
    </div>
  )
}

