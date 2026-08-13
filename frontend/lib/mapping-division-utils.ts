import type { AccountMappingData } from "@/lib/api"

/** Correspond au filtre backend `_mapping_csv_matches_entity` (nom ou UUID, CSV). */
export function mappingMatchesDivision(
  mapping: AccountMappingData,
  divisionId: string,
  divisionName: string,
): boolean {
  const field = mapping.divisions?.trim()
  if (!field) return false
  const tokens = field
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
  return tokens.some((token) => token === divisionId || token === divisionName)
}

export function filterMappingsForDivision(
  mappings: AccountMappingData[],
  divisionId: string,
  divisionName: string,
): AccountMappingData[] {
  return mappings.filter((m) => mappingMatchesDivision(m, divisionId, divisionName))
}
