"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PurchasesBySupplierPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Achats par fournisseur" description="Analysez vos dépenses par fournisseur et optimisez votre chaîne d'approvisionnement" />
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
            <p className="text-muted-foreground">Contenu de l'analyse des achats par fournisseur à venir...</p>
          </div>
        </div>
      </main>
    </div>
  )
}

