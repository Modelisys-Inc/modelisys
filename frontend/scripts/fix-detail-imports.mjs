import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let s = fs.readFileSync(p, "utf8")
const oldBlock = `import {
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"`
const newBlock = `import {
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  indentForSummaryRow,
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isTruthySeparatorAbove,
  listStructureRowsForPresentationDisplay,
} from "@/lib/income-statement-structure-utils"`
if (!s.includes("detailLineLabelForDisplay,")) {
  if (!s.includes(oldBlock)) throw new Error("import block not found")
  s = s.replace(oldBlock, newBlock)
  fs.writeFileSync(p, s, "utf8")
}
console.log("imports ok")
