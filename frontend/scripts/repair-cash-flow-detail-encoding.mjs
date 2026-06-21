import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const detailPath = path.join(root, "components/cash-flow-detail.tsx")
const summaryPath = path.join(root, "components/cash-flow-summary.tsx")

let detail = fs.readFileSync(detailPath, "utf8")
const summary = fs.readFileSync(summaryPath, "utf8")

const getComparisonLabel = `  const getComparisonLabel = (): string => {
    if (view !== "comparison" && view !== "ytd" && view !== "ddm") return "Pass\u00e9"
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD dernier"
      if (view === "ddm") return "DDM dernier"
      if (period === "monthly") return "Mois dernier"
      if (period === "quarterly") return "Trimestre dernier"
      return "Ann\u00e9e derni\u00e8re"
    }
    if (comparisonType === "pastMonth") {
      if (view === "ytd") return "YTD pass\u00e9"
      if (view === "ddm") return "DDM pass\u00e9"
      if (period === "monthly") return "Mois pass\u00e9"
      if (period === "quarterly") return "Trimestre pass\u00e9"
      return "Ann\u00e9e pass\u00e9e"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        if (view === "ytd") return \`Budget \${selectedBudgetName} (YTD)\`
        if (view === "ddm") return \`Budget \${selectedBudgetName} (DDM)\`
        return \`Budget \${selectedBudgetName}\`
      }
      if (view === "ytd") return "YTD budget\u00e9"
      if (view === "ddm") return "DDM budget\u00e9"
      if (period === "monthly") return "Mois budget\u00e9"
      if (period === "quarterly") return "Trimestre budget\u00e9"
      return "Ann\u00e9e budget\u00e9e"
    }
    return "Pass\u00e9"
  }`

detail = detail.replace(
  /  const getComparisonLabel = \(\): string => \{[\s\S]*?  \}\n\n  \/\/ Find total cash flow/,
  `${getComparisonLabel}\n\n  // Find total cash flow`,
)

const monthLine = summary.match(/    const months = \[.*\]/)?.[0]
if (monthLine) detail = detail.replace(/    const months = \[.*\]/, monthLine)

const footerBlock = `            <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7">
              <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
                Note: Les donn\u00e9es affich\u00e9es sont \u00e0 titre informatif. Consulter les \u00e9tats financiers audit\u00e9s pour les
                montants officiels.
              </p>
            </div>`

detail = detail.replace(
  /            <div className="border-t border-slate-200 bg-slate-50\/90 px-6 py-4 sm:px-7">[\s\S]*?<\/div>\n          <\/>/,
  `${footerBlock}\n          </>`,
)

const literalFixes = [
  ['title = "D\u00e9tail"', /title = "[^"]*tail"/],
  [
    `<Sparkles className="h-3 w-3 text-[#E0742D]" />\n                  \u00c9dition structure`,
    /<Sparkles className="h-3 w-3 text-\[#E0742D\]" \/>\n                  [^<]+/,
  ],
  [
    'Ajustez les libell\u00e9s. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du d\u00e9tail. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> d\u00e9finit le code ou la formule. Enregistrez pour appliquer partout.',
    /Ajustez les libell[^<]*Enregistrez pour appliquer partout\./,
  ],
  ['<span className="text-slate-400">\u2022</span>', /<span className="text-slate-400">[^<]*<\/span>/g],
  ['|| "Soci\u00e9t\u00e9"', /\|\| "Soci[^"]*"/g],
  ['Toutes les soci\u00e9t\u00e9s', /Toutes les soci[^<]*/],
  ["Param\u00e8tres", /Param[^\n]*tres/],
  ["Chargement des donn\u00e9es...", /Chargement des donn[^.]*\.\.\./],
  [
    'Aucune donn\u00e9e disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">Param\u00e8tres</span> pour configurer la structure du d\u00e9tail, ou importez une balance de v\u00e9rification.',
    /Aucune donn[^<]*balance de v[^.]*\./,
  ],
]

for (const [replacement, pattern] of literalFixes) {
  detail = detail.replace(pattern, replacement)
}

if (detail.charCodeAt(0) === 0xfeff) detail = detail.slice(1)

fs.writeFileSync(detailPath, detail, "utf8")

if (detail.includes("\uFFFD")) throw new Error("Unicode replacement characters remain")
if (!detail.includes("Les données affichées sont à titre informatif")) {
  throw new Error("Footer note not repaired")
}

console.log("cash-flow-detail encoding repaired")
