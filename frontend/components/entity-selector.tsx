"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {!disableCompanySelection && (
        <Select value={selectedCompanyId || "all"} onValueChange={handleCompanyChange}>
          <SelectTrigger className="w-[180px] h-8 bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50">
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
        <SelectTrigger className="w-[180px] h-8 bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50 disabled:opacity-30" disabled={!selectedCompanyId}>
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
        <SelectTrigger className="w-[180px] h-8 bg-slate-800/50 border-slate-700 text-slate-300 text-xs hover:bg-slate-700/50 disabled:opacity-30" disabled={!selectedDivisionId}>
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

