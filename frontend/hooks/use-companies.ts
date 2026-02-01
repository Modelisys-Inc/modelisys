"use client"

import { useState, useEffect } from "react"
import { listCompanies, type Company as ApiCompany } from "@/lib/api"
import type { Company } from "@/components/entity-selector"

function mapApiCompany(c: ApiCompany): Company {
  return {
    id: c.id,
    name: c.name,
    divisions: (c.divisions || []).map((d) => ({
      id: d.id,
      name: d.name,
      subDivisions: (d.sub_divisions || []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    })),
  }
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCompanies()
      .then((data) => setCompanies(data.map(mapApiCompany)))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [])

  return { companies, loading }
}
