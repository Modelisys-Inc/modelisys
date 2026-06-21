import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const p = path.join(path.dirname(fileURLToPath(import.meta.url)), "../components/cash-flow-detail.tsx")
let s = fs.readFileSync(p, "utf8")
s = s.replace(/title = "D[^"]*tail",/, 'title = "D\u00e9tail",')
s = s.replace(/tr\?sorerie/g, "tr\u00e9sorerie")
fs.writeFileSync(p, s, "utf8")
if (!s.includes("D\u00e9tail")) throw new Error("title fix failed")
console.log("utf8 ok")
