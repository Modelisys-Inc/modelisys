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

      {/* Section sombre — même split gauche/droite et palette que balance de vérification / états financiers */}
      <div className="relative w-full pt-15 pb-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" aria-hidden />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">
                {currentContent.title}
              </h2>
              <p className="text-base text-[#C9B8A5]/90 mb-6">{currentContent.description}</p>
              <p className="text-base text-[#C9B8A5]/90 mb-6 leading-relaxed max-w-4xl">
                {currentContent.fullDescription}
              </p>
              <div className="flex flex-wrap items-end gap-6 sm:gap-8 mb-2">
                {yearEndNav.map((item) => {
                  const isActive = section === item.section
                  return (
                    <button
                      key={item.section}
                      type="button"
                      onClick={() => setSection(item.section)}
                      className={`relative inline-block rounded-md px-3 py-1.5 -mx-1 pb-4 border-b border-slate-600/30 text-sm font-normal transition-colors ${
                        isActive
                          ? "text-[#E6D6C3]"
                          : "text-slate-200 hover:bg-white/5 hover:text-[#E6D6C3]"
                      }`}
                    >
                      {item.label}
                      {isActive && (
                        <span
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E0742D] z-10"
                          aria-hidden
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mb-6 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-[#C9B8A5]/90">
                <Filter className="w-4 h-4 shrink-0" aria-hidden />
              </div>

              <div className="h-6 w-px bg-white/10" aria-hidden />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[#C9B8A5]/90 whitespace-nowrap">Entité:</span>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={companyId}
                  selectedDivisionId={divisionId}
                  selectedSubDivisionId={subDivisionId}
                  onCompanyChange={setCompanyId}
                  onDivisionChange={setDivisionId}
                  onSubDivisionChange={setSubDivisionId}
                  disableCompanySelection
                  darkControlBar
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

