import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n")

const oldBlock = `    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    return displayRows.flatMap((sr) => {
      const row = findStatementApiRowForStructureRow(apiRows, sr)
      const trendValues = row?.id && trendByRowId ? trendByRowId.get(row.id) : undefined
      const base = structureRowToDetailRow(sr, row, trendValues)
      return [base, ...mapAccountDetailRows(row?.detailRows)]
    })`

const newBlock = `    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    const used = new Set<number>()
    return displayRows.flatMap((sr) => {
      if (isStructureRowEmptyLabel(sr)) {
        return [structureRowToDetailRow(sr, undefined)]
      }
      const row = findStatementApiRowForStructureRow(sr, apiRows, used)
      const trendValues = row?.id && trendByRowId ? trendByRowId.get(row.id) : undefined
      const base = structureRowToDetailRow(sr, row, trendValues)
      return [base, ...mapAccountDetailRows(row?.detailRows)]
    })`

if (!s.includes(oldBlock)) {
  if (s.includes("const used = new Set<number>()")) {
    console.log("mapRows already patched")
    process.exit(0)
  }
  throw new Error("mapRows block not found")
}
s = s.replace(oldBlock, newBlock)
fs.writeFileSync(p, s, "utf8")
console.log("mapRows patch ok")
