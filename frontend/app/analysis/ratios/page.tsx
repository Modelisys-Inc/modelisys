"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { TreasuryAnalysis } from "@/components/treasury-analysis"

export default function RatiosPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Ratios" description="Calculez et analysez les ratios financiers clés pour évaluer la performance" />
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
          <TreasuryAnalysis />
        </div>
      </main>
    </div>
  )
}

