import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const detailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
const lines = fs.readFileSync(detailPath, "utf8").split("\n")
lines[698] =
  '              Aucune donn\u00e9e disponible. Ouvrez <span className="font-medium text-[#2A2F3A]">Param\u00e8tres</span> pour configurer la structure du d\u00e9tail, ou importez une balance de v\u00e9rification.'
fs.writeFileSync(detailPath, lines.join("\n"), "utf8")
const t = fs.readFileSync(detailPath, "utf8")
if (t.includes("\uFFFD")) throw new Error("still broken")
console.log("line 699 fixed")
