import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const detailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let detail = fs.readFileSync(detailPath, "utf8")

// Remove UTF-8 BOM if present
if (detail.charCodeAt(0) === 0xfeff) {
  detail = detail.slice(1)
}

// Remove orphaned duplicate tail of getComparisonLabel (leftover from a bad merge)
detail = detail.replace(
  /\n    if \(comparisonType === "pastMonth"\) \{\n      if \(view === "ytd"\) return "YTD pass\?"[\s\S]*?\n    return "Pass\?"\n  \}\n\n  \/\/ Find total cash flow/,
  "\n\n  // Find total cash flow",
)

const replacements = [
  ['title = "D\u00e9tail"', /title = "D[^"]*tail"/],
  [
    'Ajustez les libell\u00e9s. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du d\u00e9tail. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> d\u00e9finit le code ou la formule. Enregistrez pour appliquer partout.',
    /Ajustez les libell[^<]*Enregistrez pour appliquer partout\./,
  ],
  [
    'Aucune donn\u00e9e disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">Param\u00e8tres</span> pour configurer la structure du d\u00e9tail, ou importez une balance de v\u00e9rification.',
    /Aucune donn[^<]*balance de v[^.]*\./,
  ],
  [
    `<p className={cn("text-xs", dashboardCardBodyMutedClass)}>
                Note: Les donn\u00e9es affich\u00e9es sont \u00e0 titre informatif. Consulter les \u00e9tats financiers audit\u00e9s pour les
                montants officiels.
              </p>`,
    /<p className=\{cn\("text-xs", dashboardCardBodyMutedClass\)\}>\s*Note: Les donn[^<]*<\/p>/,
  ],
]

for (const [replacement, pattern] of replacements) {
  const next = detail.replace(pattern, replacement)
  if (next === detail) {
    console.warn("No match for pattern:", pattern.toString())
  }
  detail = next
}

fs.writeFileSync(detailPath, detail, "utf8")

if (detail.includes("Pass?") || detail.includes("libell?s") || detail.includes("ParamÃ")) {
  throw new Error("Corrupted strings remain")
}
if (!detail.includes("montants officiels")) {
  throw new Error("Footer note incomplete")
}

console.log("cash-flow-detail cleaned")
