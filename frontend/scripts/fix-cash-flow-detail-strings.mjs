import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const detailPath = path.join(root, "components/cash-flow-detail.tsx")
const summaryPath = path.join(root, "components/cash-flow-summary.tsx")

let detail = fs.readFileSync(detailPath, "utf8")
const summary = fs.readFileSync(summaryPath, "utf8")

const replacements = [
  ["Chargement des donn\u00e9es...", /Chargement des donn[^.]*\.\.\./],
  [
    'Aucune donn\u00e9e disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">Param\u00e8tres</span> pour configurer la structure du d\u00e9tail, ou importez une balance de v\u00e9rification.',
    /Aucune donn[^<]*<span className="font-medium text-\[#2A2F3A\]">Param[^<]*<\/span> pour configurer la structure du d[^,]*, ou importez une balance de v[^.]*\./,
  ],
  [
    "Note: Les donn\u00e9es affich\u00e9es sont \u00e0 titre informatif. Consulter les \u00e9tats financiers audit\u00e9s pour les",
    /Note: Les donn[^.]*\./,
  ],
  [
    'Ajustez les libell\u00e9s. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du d\u00e9tail. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> d\u00e9finit le code ou la formule. Enregistrez pour appliquer partout.',
    /Ajustez les libell[^.]*Enregistrez pour appliquer partout\./,
  ],
  ['"Soci\u00e9t\u00e9"', /"Soci[^"]*"/g],
  ['"Soci\u00e9t\u00e9 s\u00e9lectionn\u00e9e"', /"Soci[^"]* s[^"]*"/],
  ['"Toutes les soci\u00e9t\u00e9s"', /"Toutes les soci[^"]*"/],
  ["Param\u00e8tres", />Param[^<]*<\//],
]

for (const [replacement, pattern] of replacements) {
  detail = detail.replace(pattern, replacement)
}

// Copy month labels line from summary
const monthLine = summary.match(/const months = \[.*\]/)?.[0]
if (monthLine) {
  detail = detail.replace(/const months = \[.*\]/, monthLine)
}

fs.writeFileSync(detailPath, detail, "utf8")
if (!detail.includes("donn\u00e9es") && !detail.includes("données")) throw new Error("footer fix failed")
console.log("strings fixed")
