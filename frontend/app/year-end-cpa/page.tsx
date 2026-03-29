"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { EntitySelector } from "@/components/entity-selector"
import { Filter } from "lucide-react"
import { TrialBalanceByGroup } from "@/components/trial-balance-by-group"
import { YearEndNotesSection } from "@/components/year-end-notes-section"
import { useCompanies } from "@/hooks/use-companies"

type SectionType = "documents" | "notes"

const yearEndNav = [
  { label: "Documents", section: "documents" as SectionType },
  { label: "Notes", section: "notes" as SectionType },
]

const sectionContent = {
  documents: {
    title: "Documents",
    description: "Déposez vos documents comptables par compte GL pour faciliter la clôture annuelle avec votre cabinet.",
    fullDescription: "Centralisez tous vos justificatifs et pièces comptables pour un processus efficace et structuré. Organisez-les par compte GL et facilitez la collaboration avec votre cabinet en partageant tous les éléments nécessaires."
  },
  notes: {
    title: "Notes",
    description: "Consultez et gérez toutes vos notes d'analyse créées pour expliquer les variations dans vos états financiers.",
    fullDescription: "Documentez les écarts significatifs tout au long de l'exercice pour faciliter votre clôture comptable annuelle et optimiser les processus d'évaluation d'entreprise et de transactions stratégiques."
  }
}

export default function YearEndCPAPage() {
  const { companies, loading } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [divisionId, setDivisionId] = useState<string | null>(null)
  const [subDivisionId, setSubDivisionId] = useState<string | null>(null)
  const [section, setSection] = useState<SectionType>("documents")

  // Auto-select first company
  useEffect(() => {
    if (!companyId && companies.length > 0) {
      setCompanyId(companies[0].id)
    }
  }, [companies, companyId])

  const currentContent = sectionContent[section]

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />
      
      {/* Dark Header Section */}
      <div className="w-full bg-slate-900 pt-15 pb-40">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-normal text-white mb-2 tracking-tight">{currentContent.title}</h2>
              <p className="text-base text-slate-300 mb-6">
                {currentContent.description}
              </p>
              <p className="text-base text-slate-300 mb-6 leading-relaxed max-w-4xl">
                {currentContent.fullDescription}
              </p>
              {/* Navigation Menu - Style like income-statement page */}
              <div className="flex items-end gap-8 mb-2">
                {yearEndNav.map((item) => {
                  const isActive = section === item.section
                  return (
                    <button
                      key={item.section}
                      onClick={() => setSection(item.section)}
                      className="relative pb-4 border-b border-slate-600/30"
                    >
                      <span
                        className={`text-sm font-normal transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 z-10"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Icon */}
              <div className="flex items-center gap-2 text-slate-300">
                <Filter className="w-4 h-4" />
              </div>

              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={companyId}
                  selectedDivisionId={divisionId}
                  selectedSubDivisionId={subDivisionId}
                  onCompanyChange={setCompanyId}
                  onDivisionChange={setDivisionId}
                  onSubDivisionChange={setSubDivisionId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <div className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          {section === "documents" ? (
            <TrialBalanceByGroup
              title="Documents"
              description="Déposez vos documents comptables par compte GL pour faciliter la clôture annuelle avec votre cabinet."
              companyId={companyId}
            />
          ) : (
            <YearEndNotesSection companyId={companyId} />
          )}
        </div>
      </div>
    </div>
  )
}

