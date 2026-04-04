"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface Company {
  id: string
  name: string
  divisions: Division[]
}

export interface Division {
  id: string
  name: string
  subDivisions: SubDivision[]
}

export interface SubDivision {
  id: string
  name: string
}

interface EntitySelectorProps {
  companies: Company[]
  selectedCompanyId: string | null
  selectedDivisionId: string | null
  selectedSubDivisionId: string | null
  onCompanyChange: (companyId: string | null) => void
  onDivisionChange: (divisionId: string | null) => void
  onSubDivisionChange: (subDivisionId: string | null) => void
  disableCompanySelection?: boolean
  /** Même style que les sélecteurs Horizon / comparaison sur les pages états financiers (fond #2A2F3A, bordure claire). */
  darkControlBar?: boolean
}

export function EntitySelector({
  companies,
  selectedCompanyId,
  selectedDivisionId,
  selectedSubDivisionId,
  onCompanyChange,
  onDivisionChange,
  onSubDivisionChange,
  disableCompanySelection = false,
  darkControlBar = false,
}: EntitySelectorProps) {
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)
  const availableDivisions = selectedCompany?.divisions || []
  const selectedDivision = availableDivisions.find((d) => d.id === selectedDivisionId)
  const availableSubDivisions = selectedDivision?.subDivisions || []

  const handleCompanyChange = (value: string) => {
    onCompanyChange(value === "all" ? null : value)
    // Reset division and sub-division when company changes
    onDivisionChange(null)
    onSubDivisionChange(null)
  }

  const handleDivisionChange = (value: string) => {
    onDivisionChange(value === "all" ? null : value)
    // Reset sub-division when division changes
    onSubDivisionChange(null)
  }

  const handleSubDivisionChange = (value: string) => {
    onSubDivisionChange(value === "all" ? null : value)
  }

  const triggerClass = (extra?: string) =>
    cn(
      "h-8 w-[180px] text-xs",
      darkControlBar
        ? "border border-white/10 bg-[#2A2F3A]/55 text-[#C9B8A5] hover:bg-white/5 focus:ring-2 focus:ring-[#E0742D]/35"
        : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50",
      extra,
    )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!disableCompanySelection && (
        <Select value={selectedCompanyId || "all"} onValueChange={handleCompanyChange}>
          <SelectTrigger className={triggerClass()}>
            <SelectValue placeholder="Société" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sociétés</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={selectedDivisionId || "all"}
        onValueChange={handleDivisionChange}
        disabled={!selectedCompanyId}
      >
        <SelectTrigger className={triggerClass("disabled:opacity-30")} disabled={!selectedCompanyId}>
          <SelectValue placeholder={selectedCompanyId ? "Division" : "Sélectionner une société"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les divisions</SelectItem>
          {availableDivisions.map((division) => (
            <SelectItem key={division.id} value={division.id}>
              {division.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedSubDivisionId || "all"}
        onValueChange={handleSubDivisionChange}
        disabled={!selectedDivisionId}
      >
        <SelectTrigger className={triggerClass("disabled:opacity-30")} disabled={!selectedDivisionId}>
          <SelectValue placeholder={selectedDivisionId ? "Sous-division" : "Sélectionner une division"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les sous-divisions</SelectItem>
          {availableSubDivisions.map((subDivision) => (
            <SelectItem key={subDivision.id} value={subDivision.id}>
              {subDivision.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

