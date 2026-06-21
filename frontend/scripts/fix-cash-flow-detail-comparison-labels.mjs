import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const detailPath = path.join(root, "components/cash-flow-detail.tsx")
const summaryPath = path.join(root, "components/cash-flow-summary.tsx")

let detail = fs.readFileSync(detailPath, "utf8")
const summary = fs.readFileSync(summaryPath, "utf8")
const summaryLines = summary.split(/\r?\n/)
const comparisonLabelBlock = summaryLines.slice(105, 136).join("\n")

detail = detail.replace(
  /  \/\/ Helper function to get comparison label[\s\S]*?  \/\/ Find total cash flow value for percentage calculations/,
  `${comparisonLabelBlock}

  // Find total cash flow value for percentage calculations`
)

detail = detail.replace(/<span className="text-slate-400">\?<\/span>/g, '<span className="text-slate-400">\u2022</span>')

fs.writeFileSync(detailPath, detail, "utf8")
if (!detail.includes("Pass\u00e9") && !detail.includes("Passé")) throw new Error("comparison labels not fixed")
console.log("comparison labels fixed")
