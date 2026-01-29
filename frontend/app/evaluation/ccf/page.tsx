"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CCFPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="CCF" description="Calculez le flux de trésorerie disponible pour l'entreprise (Free Cash Flow to Firm)" />
      <main className="w-full py-12">
        <div className="mb-8 px-6">
          <Link
            href="/evaluation"
            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Retour à l'évaluation</span>
          </Link>
        </div>
        <div className="px-6">
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <p className="text-muted-foreground">Contenu CCF (Free Cash Flow to Firm) à venir...</p>
          </div>
        </div>
      </main>
    </div>
  )
}

